import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTasteLut, readTasteProfile, recordTastePick } from './taste-grade.ts';

const directory = await mkdtemp(join(tmpdir(), 'openchatcut-taste-'));
try {
  assert.deepEqual((await readTasteProfile(directory)).top(), []);
  await Promise.all([
    recordTastePick('builtin:look-warm', 'Warm', 'warm', directory),
    recordTastePick('builtin:look-warm', 'Warm', undefined, directory),
    recordTastePick('builtin:look-mono', 'Mono', undefined, directory),
  ]);
  const reloaded = await readTasteProfile(directory);
  assert.equal(reloaded.toJSON().picks.length, 3, 'concurrent picks survive a fresh file read');
  assert.equal(reloaded.top(1)[0]?.assetId, 'builtin:look-warm');
  assert.equal(reloaded.rank(['builtin:look-mono', 'builtin:look-warm'])[0], 'builtin:look-warm');
  const isolated = await readTasteProfile(join(directory, 'other-profile'));
  assert.deepEqual(isolated.top(), [], 'profiles do not share taste data');
  await assert.rejects(recordTastePick('', 'Warm', undefined, directory), /invalid taste pick/);
  const lut = await createTasteLut({
    referenceStats: { mean: [65, 10, 8], std: [20, 12, 10] }, strength: 0, lutName: 'Test LUT',
  }, directory);
  const cube = await readFile(join(directory, lut.cubeUrl.split('/').at(-1)!), 'utf8');
  assert.match(cube, /LUT_3D_SIZE 33/);
  assert.match(lut.assetId, /^taste:taste-/);
  await assert.rejects(createTasteLut({ referenceStats: null }, directory), /invalid referenceStats/);
  await writeFile(join(directory, 'taste-profile.json'), '{broken');
  assert.deepEqual((await readTasteProfile(directory)).top(), []);
  console.log('taste-grade persistence and LUT: ok');
} finally {
  await rm(directory, { recursive: true, force: true });
}
