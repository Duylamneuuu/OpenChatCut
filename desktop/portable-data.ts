import { isAbsolute, join } from 'node:path';

/** Optional portable configuration beside the executable, applied before server imports. */
export function portableDataDirectory(config: unknown): string {
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('invalid portable config');
  const value = config as { version?: unknown; dataDirectory?: unknown };
  if (value.version !== 1 || typeof value.dataDirectory !== 'string'
    || !isAbsolute(value.dataDirectory) || !value.dataDirectory.trim()) {
    throw new Error('portable dataDirectory must be an absolute path (version 1)');
  }
  return value.dataDirectory;
}

export function desktopUserDataDirectory(dataDirectory: string): string {
  return join(dataDirectory, 'electron-user-data');
}
