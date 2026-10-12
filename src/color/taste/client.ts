import { TasteProfile, type TasteProfileData } from './tasteProfile';
import type { LabStats } from './colorTransfer';

async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/taste-grade/${path}`, body === undefined ? undefined : {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(result.error ?? `taste grade failed (${response.status})`);
  return result;
}

export async function loadTasteProfile(): Promise<TasteProfile> {
  const result = await request<{ profile: TasteProfileData }>('profile');
  return new TasteProfile(result.profile);
}

export async function recordTastePick(assetId: string, name: string, mood?: string): Promise<TasteProfile> {
  const result = await request<{ profile: TasteProfileData }>('profile', { assetId, name, mood });
  return new TasteProfile(result.profile);
}

export function createTasteLut(referenceStats: LabStats, strength: number, lutName: string): Promise<{
  assetId: string; cubeUrl: string;
}> {
  return request('lut', { referenceStats, strength, lutName });
}
