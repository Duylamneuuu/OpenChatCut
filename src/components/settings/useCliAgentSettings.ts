import { useCallback, useEffect, useRef, useState } from 'react';
import type { CodexAgentModel } from '../../../shared/codex-agent';
import type { CliAgentBackend, CliAgentStatus } from '../../../shared/cli-agent';
import { fetchCliAgentModels, fetchCliAgentStatus } from '../../agent/cli-agent/client';
import { applyCliAgentStatus } from '../../agent/model-selection';

export function useCliAgentSettings(backend: CliAgentBackend, savedModel: string) {
  const [status, setStatus] = useState<CliAgentStatus | null>(null);
  const [models, setModels] = useState<readonly CodexAgentModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true); setError(null);
    try {
      const next = await fetchCliAgentStatus(backend);
      const discovered = next.installed && next.supported ? await fetchCliAgentModels(backend) : { models: [] };
      if (current !== generation.current) return;
      setStatus(next); setModels(discovered.models); setError(discovered.error ?? next.error ?? null);
    } catch (failure) {
      if (current === generation.current) setError(failure instanceof Error ? failure.message : String(failure));
    } finally { if (current === generation.current) setLoading(false); }
  }, [backend]);
  useEffect(() => { void refresh(); return () => { generation.current += 1; }; }, [refresh]);
  useEffect(() => {
    if (status) applyCliAgentStatus(backend, status, savedModel, models);
  }, [backend, models, savedModel, status]);
  return { status, models, loading, error, refresh };
}
export type CliAgentSettingsController = ReturnType<typeof useCliAgentSettings>;
