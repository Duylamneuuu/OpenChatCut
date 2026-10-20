// Server decide route: keys stay on the server, and rule mode needs none.
import assert from 'node:assert/strict';
import { createServer, type AddressInfo } from 'node:http';
import { dispatchCutpilot, handleCutpilotRequest } from './cutpilot.ts';

const filler = {
  segmentId: 's003',
  index: 3,
  text: 'um',
  durationMs: 500,
  silenceMs: 0,
  gapBeforeMs: 800,
  directive: '',
  prev: [],
};

const rule = await dispatchCutpilot('POST', '/api/cutpilot/decide', {
  provider: 'rule',
  state: filler,
}, { isolate: true, env: {} });
assert.equal(rule.status, 200);
assert.equal((rule.payload as { action: string }).action, 'cut');
assert.equal((rule.payload as { costUsd: number }).costUsd, 0);

const published = await dispatchCutpilot('GET', '/api/cutpilot/config', undefined, {
  isolate: true,
  env: {
    CUTPILOT_HOSTED_BASE_URL: 'https://openrouter.ai/api/v1',
    CUTPILOT_HOSTED_API_KEY: 'secret-key',
    CUTPILOT_HOSTED_MODEL: 'google/gemini-2.5-flash',
  },
});
assert.equal(published.status, 200);
assert.equal(JSON.stringify(published.payload).includes('secret-key'), false);
assert.equal((published.payload as { providers: { hosted: { available: boolean } } }).providers.hosted.available, true);

const missing = await dispatchCutpilot('POST', '/api/cutpilot/decide', {
  provider: 'local',
  state: filler,
}, { isolate: true, env: {} });
assert.equal(missing.status, 400);
assert.match(JSON.stringify(missing.payload), /CUTPILOT_LOCAL_BASE_URL/);

let seenUrl = '';
let seenAuth = '';
const hosted = await dispatchCutpilot('POST', '/api/cutpilot/decide', {
  provider: 'hosted',
  state: { ...filler, text: 'The budget is fine', directive: '' },
}, {
  isolate: true,
  env: {
    CUTPILOT_HOSTED_BASE_URL: 'https://example.test',
    CUTPILOT_HOSTED_API_KEY: 'secret-key',
    CUTPILOT_HOSTED_MODEL: 'gemini-flash',
    CUTPILOT_HOSTED_USD_PER_1K: '0.15',
  },
  fetchImpl: async (url, init) => {
    seenUrl = String(url);
    seenAuth = (init?.headers as Record<string, string>).authorization ?? '';
    return new Response(JSON.stringify({
      choices: [{ message: { content: '{"action":"keep","confidence":0.4,"reason":"speech"}' } }],
    }), { status: 200 });
  },
});
assert.equal(hosted.status, 200);
assert.equal(seenUrl, 'https://example.test/v1/chat/completions');
assert.equal(seenAuth, 'Bearer secret-key');
assert.equal(JSON.stringify(hosted.payload).includes('secret-key'), false);
const hostedBody = hosted.payload as { action: string; escalated: boolean; costUsd: number | null };
assert.equal(hostedBody.action, 'keep');
assert.equal(hostedBody.escalated, false);
assert.equal(hostedBody.costUsd, 0.00015);

let escalationCalls = 0;
const escalated = await dispatchCutpilot('POST', '/api/cutpilot/decide', {
  provider: 'hosted',
  escalate: true,
  state: { ...filler, text: 'um the budget is fine' },
}, {
  isolate: true,
  env: {
    CUTPILOT_HOSTED_BASE_URL: 'https://example.test',
    CUTPILOT_HOSTED_MODEL: 'fast',
    CUTPILOT_HOSTED_USD_PER_1K: '1',
    CUTPILOT_ESCALATION_BASE_URL: 'https://strong.test',
    CUTPILOT_ESCALATION_MODEL: 'strong',
    CUTPILOT_ESCALATION_USD_PER_1K: '2',
    CUTPILOT_CONFIDENCE_THRESHOLD: '0.6',
  },
  fetchImpl: async (url) => {
    const target = String(url);
    if (target.startsWith('https://strong.test')) {
      escalationCalls += 1;
      return new Response(JSON.stringify({
        choices: [{ message: { content: '{"action":"cut","confidence":0.88,"reason":"reviewed"}' } }],
      }), { status: 200 });
    }
    return new Response(JSON.stringify({
      choices: [{ message: { content: '{"action":"keep","confidence":0.41,"reason":"unsure"}' } }],
    }), { status: 200 });
  },
});
assert.equal(escalationCalls, 1);
assert.equal((escalated.payload as { escalated: boolean }).escalated, true);
assert.equal((escalated.payload as { action: string }).action, 'cut');
assert.equal((escalated.payload as { costUsd: number }).costUsd, 0.003);

const server = createServer((req, res) => {
  void handleCutpilotRequest(req, res, { isolate: true, env: {} });
});
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
try {
  const port = (server.address() as AddressInfo).port;
  const response = await fetch(`http://127.0.0.1:${port}/api/cutpilot/decide`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ provider: 'rule', state: filler }),
  });
  const body = await response.json() as { action: string };
  assert.equal(response.status, 200);
  assert.equal(body.action, 'cut');
} finally {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

console.log('cutpilot server verify: ok');
