import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { parseCliModels } from './installation';
import { createCliEventTranslator } from './turn-runner';
import { startCliToolBridge, settleCliToolResult, cliMcpResult } from './tool-bridge';
import type { CodexTurnStreamEvent } from '../../shared/codex-agent';
import { runCliProcess } from './process';

assert.deepEqual(parseCliModels('opencode', 'progress\nopencode/free-model\nopenai/gpt-6.1-sol\n').models.map((m) => m.id),
  ['opencode/free-model', 'openai/gpt-6.1-sol']);
assert.equal(parseCliModels('antigravity', 'Fetching available models...\ngemini-3.8-flash-medium\tGemini Flash\n').models.length, 1);
const events: CodexTurnStreamEvent[] = [];
const translator = createCliEventTranslator('antigravity', (event) => events.push(event));
translator.line(JSON.stringify({ event: 'step_update', step_update: { step_type: 'agent_response', text_delta: 'hello' } }));
translator.line(JSON.stringify({ event: 'result', result: { status: 'SUCCESS', response: 'hello' } }));
assert.equal(events.filter((event) => event.type === 'text-delta').length, 1, 'terminal result must not duplicate streamed text');
assert.equal(translator.completed, true);
const opencode = createCliEventTranslator('opencode', (event) => events.push(event));
opencode.line(JSON.stringify({ type: 'step_finish', part: { reason: 'tool-calls' } }));
assert.equal(opencode.completed, false, 'intermediate tool steps must not finish the turn');
opencode.line(JSON.stringify({ type: 'step_finish', part: { reason: 'stop' } }));
assert.equal(opencode.completed, true);

const controller = new AbortController();
const imageResult = cliMcpResult({ requestId: 'test', callId: 'test', success: true,
  result: { note: 'Preview', __images: [{ base64: 'aGVsbG8=' }] } });
assert.equal(imageResult.content[0].type, 'image', 'preview frames must be MCP image content');
assert.ok(!JSON.stringify(imageResult.content.at(-1)).includes('__images'), 'base64 must not also be repeated as text');
let calls = 0;
const requestId = crypto.randomUUID();
const bridge = await startCliToolBridge({ requestId, projectId: 'test', prompt: '', system: '', askOnly: true, tools: [
  { name: 'read_project', inputSchema: { type: 'object', properties: { mode: { type: 'string' } } } },
] }, (event) => {
  if (event.type === 'tool-start') {
    calls += 1;
    settleCliToolResult({ requestId, callId: event.callId, success: true, result: { frames: 373 } });
  }
}, controller.signal);
const client = new Client({ name: 'cli-verify', version: '1' });
try {
  const unauthorized = await fetch(bridge.url, { method: 'POST' });
  assert.equal(unauthorized.status, 401);
  await client.connect(new StreamableHTTPClientTransport(new URL(bridge.url), {
    requestInit: { headers: { Authorization: `Bearer ${bridge.token}` } },
  }));
  const listed = await client.listTools();
  assert.equal(listed.tools[0].name, 'read_project');
  const result = await client.callTool({ name: 'read_project', arguments: { mode: 'timeline' } });
  assert.equal(result.isError, false);
  assert.equal(calls, 1, 'one MCP call executes one editor tool');
  const missing = await client.callTool({ name: 'bash', arguments: {} });
  assert.equal(missing.isError, true);
  assert.equal(calls, 1, 'unknown tools cannot enter the browser execution bridge');
} finally { await client.close(); await bridge.close(); }
const cancelled = new AbortController();
let childPid = 0;
await assert.rejects(runCliProcess({ path: process.execPath,
  args: ['-e', 'console.log(process.pid);setInterval(()=>{},1000)'], env: process.env, cwd: process.cwd(),
  signal: cancelled.signal, onLine: (line) => { childPid = Number(line); cancelled.abort(); },
}));
assert.ok(childPid > 0);
assert.throws(() => process.kill(childPid, 0), 'aborting a CLI turn must terminate its process');
console.log('CLI agents verification passed: models, stream completion, isolated MCP callback and authentication.');
