import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runtimeProfile } from '../runtime-profile.ts';
import { uploadDir } from '../media-dir.ts';
import { atomicWriteFile } from './project-store-durable.ts';
import { TasteProfile, type TasteProfileData } from '../../src/color/taste/tasteProfile.ts';
import { bakeCubeText, makeTransferParams, parseLabStats } from '../../src/color/taste/colorTransfer.ts';

const MAX_JSON_BYTES = 16 * 1024;
const writes = new Map<string, Promise<TasteProfile>>();

export async function readTasteProfile(directory = runtimeProfile().rootDir): Promise<TasteProfile> {
  try {
    const data = JSON.parse(await readFile(join(directory, 'taste-profile.json'), 'utf8')) as TasteProfileData;
    return new TasteProfile(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT' || error instanceof SyntaxError) {
      return new TasteProfile();
    }
    throw error;
  }
}

export function recordTastePick(
  assetId: string, name: string, mood?: string, directory = runtimeProfile().rootDir,
): Promise<TasteProfile> {
  if (!assetId || assetId.length > 200 || !name || name.length > 200 || (mood?.length ?? 0) > 500) {
    return Promise.reject(new Error('invalid taste pick'));
  }
  const previous = writes.get(directory);
  const current = (async () => {
    await previous?.catch(() => undefined);
    const profile = await readTasteProfile(directory);
    profile.record(assetId, name, mood);
    await mkdir(directory, { recursive: true });
    await atomicWriteFile(join(directory, 'taste-profile.json'), JSON.stringify(profile.toJSON()));
    return profile;
  })();
  writes.set(directory, current);
  void current.finally(() => {
    if (writes.get(directory) === current) writes.delete(directory);
  }).catch(() => undefined);
  return current;
}

export async function createTasteLut(
  body: Record<string, unknown>, directory = uploadDir(),
): Promise<{ assetId: string; cubeUrl: string }> {
  const referenceStats = parseLabStats(body.referenceStats);
  if (!referenceStats) throw new Error('invalid referenceStats');
  const strength = body.strength === undefined ? 0.85 : Number(body.strength);
  if (!Number.isFinite(strength) || strength < 0 || strength > 1) throw new Error('invalid strength');
  const name = String(body.lutName ?? 'Taste grade').slice(0, 60).replace(/[\r\n"\\]/g, ' ');
  const id = `taste-${randomUUID()}`;
  const params = makeTransferParams({ mean: [50, 0, 0], std: [22, 14, 14] }, referenceStats, strength);
  await mkdir(directory, { recursive: true });
  await atomicWriteFile(join(directory, `${id}.cube`), bakeCubeText(params, 33, name));
  return { assetId: `taste:${id}`, cubeUrl: `/media/uploads/${id}.cube` };
}

function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_JSON_BYTES) { reject(new Error('body too large')); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid body');
        resolve(parsed as Record<string, unknown>);
      } catch (error) { reject(error); }
    });
    req.on('error', reject);
  });
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export function tasteGradePlugin(): Plugin {
  return {
    name: 'openchatcut-taste-grade',
    configureServer(server) {
      server.middlewares.use('/api/taste-grade', async (req, res) => {
        try {
          const path = (req.url ?? '').split('?')[0];
          if (path === '/profile' && req.method === 'GET') {
            send(res, 200, { ok: true, profile: (await readTasteProfile()).toJSON() });
          } else if (path === '/profile' && req.method === 'POST') {
            const body = await readJson(req);
            if (typeof body.assetId !== 'string' || typeof body.name !== 'string'
              || (body.mood !== undefined && typeof body.mood !== 'string')) throw new Error('invalid taste pick');
            const profile = await recordTastePick(body.assetId, body.name, body.mood as string | undefined);
            send(res, 200, { ok: true, profile: profile.toJSON() });
          } else if (path === '/lut' && req.method === 'POST') {
            send(res, 200, { ok: true, ...await createTasteLut(await readJson(req)) });
          } else {
            send(res, 405, { error: 'method or route not supported' });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          send(res, /invalid|body too large/i.test(message) ? 400 : 500, { error: message });
        }
      });
    },
  };
}
