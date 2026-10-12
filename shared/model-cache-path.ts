import { join } from 'node:path';

export function modelCachePath(home: string, dataDirectory?: string): string {
  return join(dataDirectory ?? join(home, '.openchatcut'), 'asr-models');
}
