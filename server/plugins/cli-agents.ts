import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { isCliAgentBackend, type CliAgentBackend } from '../../shared/cli-agent';
import { inspectCliAgent, discoverCliModels } from '../cli-agent/installation';
import { runServerCliTurn } from '../cli-agent/turn-runner';
import { redactTextForAgentRuntime } from '../../src/agent/runtime-artifact';

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 4 * 1024 * 1024) throw new Error('CLI text request is too large.');
    chunks.push(chunk);
  }
  const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid CLI request.');
  return parsed as Record<string, unknown>;
}
function json(res: ServerResponse, value: unknown): void {
  res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(value));
}
async function route(backend: CliAgentBackend, action: string, req: IncomingMessage, res: ServerResponse) {
  if (action === 'status' && req.method === 'GET') return json(res, await inspectCliAgent(backend));
  if (action === 'models' && req.method === 'GET') return json(res, await discoverCliModels(backend));
  if (action !== 'text' || req.method !== 'POST') { res.writeHead(404).end(); return; }
  const body = await readJson(req);
  if (typeof body.prompt !== 'string' || (body.system !== undefined && typeof body.system !== 'string')
    || typeof body.projectId !== 'string' || (body.model !== undefined && typeof body.model !== 'string')) {
    throw new Error('Invalid CLI text request fields.');
  }
  const controller = new AbortController();
  res.on('close', () => { controller.abort(); });
  res.setHeader('Content-Type', 'application/x-ndjson'); res.setHeader('Cache-Control', 'no-store');
  await runServerCliTurn(backend, {
    requestId: randomUUID(), projectId: body.projectId, system: (body.system as string) || '',
    prompt: body.prompt, model: body.model as string | undefined, askOnly: true, tools: [],
  }, (event) => { if (!res.destroyed) res.write(JSON.stringify(event) + '\n'); }, controller.signal);
  res.end();
}
export function cliAgentsPlugin(): Plugin {
  return { name: 'openchatcut-cli-agents', configureServer(server) {
    server.middlewares.use('/api/cli-agents', (req, res) => {
      const [backend, action] = new URL(req.url || '/', 'http://localhost').pathname.split('/').filter(Boolean);
      if (!isCliAgentBackend(backend)) { res.writeHead(404).end(); return; }
      void route(backend, action, req, res).catch((error) => {
        if (res.destroyed || res.writableEnded) return;
        const message = redactTextForAgentRuntime(error instanceof Error ? error.message : String(error));
        if (res.headersSent) res.end(JSON.stringify({ type: 'error', message }) + '\n');
        else { res.statusCode = 503; json(res, { error: message }); }
      });
    });
  } };
}
