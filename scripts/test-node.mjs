import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const files = readdirSync(new URL('../tests/', import.meta.url)).filter(name => name.endsWith('.test.ts')).sort().map(name => 'tests/' + name);
const result = spawnSync(process.execPath, ['--import', './scripts/node-loader.mjs', '--test', ...files], {
  cwd: root,
  stdio: 'inherit'
});
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
