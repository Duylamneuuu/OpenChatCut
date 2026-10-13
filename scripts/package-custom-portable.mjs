import { spawn } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const source = resolve(process.argv[2] ?? join(root, 'release', 'win-unpacked'));
const output = resolve(process.argv[3] ?? join(root, 'release', `OpenChatCut-${version}-win-x64-portable.zip`));
const zipTool = join(root, 'node_modules', 'electron-winstaller', 'vendor', '7z.exe');
await access(zipTool);
await access(join(source, 'OpenChatCut.exe'));
await access(join(source, 'resources', 'app.asar'));
for (const privatePath of ['openchatcut-portable.json', 'data', 'electron-user-data', 'asr-models']) {
  if (await access(join(source, privatePath)).then(() => true, () => false)) {
    throw new Error(`Refusing to archive local runtime data: ${privatePath}`);
  }
}
if (await access(output).then(() => true, () => false)) throw new Error(`Archive already exists: ${output}`);
async function zip(cwd) {
  const child = spawn(zipTool, ['a', '-tzip', '-mx=6', '-y', output, '*'], { cwd, windowsHide: true, stdio: 'inherit' });
  const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('close', resolve); });
  if (code !== 0) throw new Error(`ZIP creation failed (${code})`);
}
await zip(source);
await zip(join(root, 'assets', 'portable'));
console.log('Portable archive created:', output);
