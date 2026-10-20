import { nowMs } from '../metrics.js';
import type { DecisionProvider, DecisionState } from '../types.js';
import { ruleDecide } from './rule.js';

export function createRuleProvider(): DecisionProvider {
  return {
    id: 'rule',
    usdPer1k: 0,
    async decide(state: DecisionState) {
      const started = nowMs();
      const decision = ruleDecide(state);
      return {
        ...decision,
        modelMs: Math.max(0, nowMs() - started),
        networkMs: 0,
        upstreamUnsplit: false,
      };
    },
  };
}
