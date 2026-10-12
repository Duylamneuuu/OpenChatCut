// Parallel-vs-exclusive classification and the generation timeout budget.
// A tool classified parallel runs concurrently with the exclusive chain while
// sharing one draft, so a MUTATING tool must never be parallel — its recorded
// actions would be drained by whichever request settles first.
// npx tsx src/agent/execution-modes.verify.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PARALLEL_TOOL_NAMES, toolExecutionMode } from './tools/execution-modes';
import { generationTimeoutMs, generateAgentText } from './client';
import { applyAgentModelStatus, applyCodexAgentStatus, selectAgentModel } from './model-selection';

// ── detect_beats:按参数分类 ──────────────────────────────────────────────
{
  assert.equal(toolExecutionMode('detect_beats'), 'parallel',
    'analysis-only detect_beats stays parallel');
  assert.equal(toolExecutionMode('detect_beats', {}), 'parallel', 'no markers arg = read only');
  assert.equal(toolExecutionMode('detect_beats', { markers: 'beats' }), 'exclusive',
    'writing beat markers must serialize against the exclusive chain');
  assert.equal(toolExecutionMode('detect_beats', { markers: 'downbeats' }), 'exclusive',
    'downbeat markers are a mutation too');
  assert.equal(toolExecutionMode('edit_item', {}), 'exclusive', 'ordinary edits stay exclusive');
  assert.equal(toolExecutionMode('read_timeline', {}), 'parallel', 'pure reads stay parallel');
}

// ── 回归闸门:会写状态的工具不得出现在无条件并行集里 ────────────────────────
{
  assert.equal(PARALLEL_TOOL_NAMES.has('detect_beats'), false,
    'detect_beats mutates when markers are requested — it must be classified per-invocation, '
    + 'not listed as unconditionally parallel');
  // 名字里带写语义的工具一律不得进并行集(命名约定级的粗筛,便宜且能挡住多数误加)。
  const writeLike = [...PARALLEL_TOOL_NAMES].filter((name) => (
    /^(edit_|set_|add_|delete_|remove_|apply_|create_|submit_|clear_|move_|split_|update_|import_)/.test(name)
  ));
  assert.deepEqual(writeLike, [],
    `write-shaped tool names must not be parallel: ${writeLike.join(', ')}`);
  // detect_beats 的实现确实会经 ctx.commands 写入 —— 这正是它被移出集合的原因。
  const beatSource = readFileSync('src/agent/tools/beat-tools.ts', 'utf8');
  assert.ok(/ctx\.commands/.test(beatSource),
    'beat-tools still mutates via ctx.commands; if that ever changes, revisit the '
    + 'CONDITIONALLY_PARALLEL entry instead of silently leaving it');
}

// ── 生成超时随输出预算伸缩 ───────────────────────────────────────────────
{
  assert.equal(generationTimeoutMs(1000), 60_000, 'small asks keep the 60s floor');
  assert.equal(generationTimeoutMs(0), 60_000, 'zero budget falls back to the floor');
  assert.equal(generationTimeoutMs(Number.NaN), 60_000, 'non-finite budget falls back to the floor');
  assert.ok(generationTimeoutMs(64_000) > 60_000,
    'a 64k-token MG generation gets more than the old fixed 60s');
  // 64k tokens at the assumed streaming rate exceeds the ceiling → clamped.
  assert.equal(generationTimeoutMs(64_000), 600_000, '64k tokens is clamped by the 10 minute ceiling');
  assert.equal(generationTimeoutMs(10_000_000), 600_000, 'the ceiling is enforced');
  assert.equal(generationTimeoutMs(8_000), 200_000, 'mid-size budgets scale linearly');
}

// Text subtasks (highlight selection and caption translation) must use the
// selected Codex account instead of silently falling back to an API key.
{
  applyAgentModelStatus({}, {});
  applyCodexAgentStatus({ installed: true, version: '1.0.0', loginPending: false,
    account: { type: 'chatgpt', email: null, planType: 'plus' } }, 'codex-test', '', [{
      id: 'codex-test', label: 'Test', isDefault: true, defaultReasoningEffort: 'low',
      supportedReasoningEfforts: [{ reasoningEffort: 'low', description: '' }],
    }]);
  selectAgentModel('codex:codex-test');
  const originalFetch = globalThis.fetch;
  let fail = false;
  globalThis.fetch = (async (input, init) => {
    assert.equal(String(input), '/api/codex/turn', 'no /llm API-key request');
    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, 'codex-test');
    assert.equal(body.askOnly, true);
    assert.deepEqual(body.tools, []);
    assert.match(body.prompt, /highlight/);
    const events = fail
      ? [{ type: 'error', message: 'Codex unavailable' }]
      : [{ type: 'text-delta', delta: '[{"title":"Test"}]' }, { type: 'done' }];
    return new Response(events.map((event) => JSON.stringify(event)).join('\n') + '\n', {
      headers: { 'content-type': 'application/x-ndjson' },
    });
  }) as typeof fetch;
  try {
    assert.equal(await generateAgentText({ prompt: 'select a highlight', maxOutputTokens: 1000 }), '[{"title":"Test"}]');
    assert.equal(await generateAgentText({ messages: [{ role: 'user', content: 'select a highlight' }], maxOutputTokens: 1000 }), '[{"title":"Test"}]');
    fail = true;
    await assert.rejects(generateAgentText({ prompt: 'select a highlight', maxOutputTokens: 1000 }), /Codex unavailable/);
  } finally { globalThis.fetch = originalFetch; }
}
// CLI text subtasks must stay on the selected CLI, including provider errors.
{
  const { applyCliAgentStatus } = await import('./model-selection');
  for (const backend of ['opencode', 'antigravity'] as const) {
    const model = backend === 'opencode' ? 'opencode/ling-3.1-flash-free' : 'gemini-3.8-flash-medium';
    applyCliAgentStatus(backend, { installed: true, supported: true, version: '1.3.3',
      authenticated: null, loginCommand: '' }, model, [{ id: model, label: model,
      isDefault: true, defaultReasoningEffort: null, supportedReasoningEfforts: [] }]);
    selectAgentModel(`${backend}:${model}`);
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input, init) => {
      assert.equal(String(input), `/api/cli-agents/${backend}/text`, 'CLI subtasks never fall back to an API key');
      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, model);
      return new Response('{"type":"text-delta","delta":"translated"}\n{"type":"done"}\n');
    }) as typeof fetch;
    try {
      assert.equal(await generateAgentText({ prompt: 'translate captions', maxOutputTokens: 100 }), 'translated');
    } finally { globalThis.fetch = originalFetch; }
  }
}
console.log('execution-modes.verify: ok');
