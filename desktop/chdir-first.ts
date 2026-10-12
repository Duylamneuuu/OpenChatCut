// The packaged version nails cwd to the .env.local path of userData:keystore and the default upload directory is anchored in
// process.cwd() (module top-level evaluation), use chdir once to let the two naturally fall into the user-writable area, server side
// Zero modifications. Must be evaluated before the import chain of embedded-server - keep this module in main.ts
// The first import (ESM is executed depth first in declaration order). dev (unpackaged) inherits the startup cwd (worktree root).
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { app } from 'electron';
import { desktopUserDataDirectory, portableDataDirectory } from './portable-data.ts';

if (app.isPackaged && !process.env.OPENCHATCUT_DATA_DIR?.trim()) {
  const configPath = join(dirname(app.getPath('exe')), 'openchatcut-portable.json');
  if (existsSync(configPath)) {
    process.env.OPENCHATCUT_DATA_DIR = portableDataDirectory(JSON.parse(readFileSync(configPath, 'utf8')));
  }
}
const configuredDataDir = process.env.OPENCHATCUT_DATA_DIR?.trim();
if (configuredDataDir) {
  if (!isAbsolute(configuredDataDir)) throw new Error('OPENCHATCUT_DATA_DIR must be an absolute path');
  const userData = desktopUserDataDirectory(configuredDataDir);
  mkdirSync(userData, { recursive: true });
  // Direct shortcut launches do not inherit the setup shell's F: temp paths.
  // Apply the portable data root before the server or agent spawns helpers.
  const tempDir = join(configuredDataDir, 'temp');
  mkdirSync(tempDir, { recursive: true });
  for (const name of ['TEMP', 'TMP', 'TMPDIR']) process.env[name] = tempDir;
  app.setPath('temp', tempDir);
  app.setPath('userData', userData);
  app.setPath('sessionData', userData);
}

if (app.isPackaged) {
  const dir = app.getPath('userData');
  mkdirSync(dir, { recursive: true });
  process.chdir(dir);
}
