import type { PublicCutPilotConfig } from './config.js';
import { createRemoteProvider, type RemoteProviderId } from './providers/remote.js';
import { createRuleProvider } from './providers/rule-provider.js';
import type { DecisionProvider } from './types.js';

export interface ProviderSelection {
  primary: DecisionProvider;
  escalation: DecisionProvider | null;
  error: string | null;
}

/**
 * Rule mode stays in process. Local and hosted decisions go through the
 * server so API keys are not exposed to the page. Escalation is a second
 * provider the session calls only when confidence is under the threshold,
 * except local/hosted where the server already does that.
 */
export function providersFor(
  id: 'rule' | 'local' | 'hosted',
  config: PublicCutPilotConfig | null,
): ProviderSelection {
  if (id === 'rule') {
    const escalation = config?.providers.escalation.available
      ? createRemoteProvider({
        id: 'escalation',
        usdPer1k: config.providers.escalation.usdPer1k,
        escalate: false,
      })
      : null;
    return { primary: createRuleProvider(), escalation, error: null };
  }
  const status = config?.providers[id];
  if (!status?.available) {
    const missing = id === 'local' ? 'CUTPILOT_LOCAL_BASE_URL' : 'CUTPILOT_HOSTED_BASE_URL';
    return {
      primary: createRuleProvider(),
      escalation: null,
      error: `${id} is not configured. Set ${missing}. Rule mode is selected until then.`,
    };
  }
  const remoteId: RemoteProviderId = id;
  return {
    primary: createRemoteProvider({
      id: remoteId,
      usdPer1k: status.usdPer1k,
      escalate: true,
    }),
    escalation: null,
    error: null,
  };
}
