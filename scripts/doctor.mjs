import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root = dirname(dirname(fileURLToPath(import.meta.url))),
  major = Number(process.versions.node.split('.')[0]);
let sqliteReady = false;
try {
  const {
    DatabaseSync
  } = await import('node:sqlite');
  const db = new DatabaseSync(':memory:');
  sqliteReady = db.prepare('SELECT 1 AS ready').get().ready === 1;
  db.close();
} catch {}
const bun = spawnSync('bun', ['--version'], {
    encoding: 'utf8'
  }),
  packages = ['react', 'react-dom', 'typescript', '@types/bun', '@types/react', '@types/react-dom'];
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const report = {
  mvp: {
    nodeVersion: process.version,
    nodeSupported: major >= 26,
    sqliteReady,
    frontendPresent: existsSync(join(root, 'src/mvp/index.html')),
    requiresPackageInstall: false
  },
  bunExtension: {
    bunInstalled: bun.status === 0,
    missingPackages: packages.filter(name => !existsSync(join(root, 'node_modules', name, 'package.json'))),
    lockfilePresent: existsSync(join(root, 'bun.lock')),
    runtimePinned: !!manifest.packageManager?.startsWith('bun@')
  }
};
console.log(JSON.stringify(report, null, 2));
if (!report.mvp.nodeSupported || !sqliteReady || !report.mvp.frontendPresent) {
  console.error('MVP 실행에는 Node 26 이상과 내장 SQLite가 필요합니다.');
  process.exitCode = 1;
} else console.log('Node MVP 런타임 준비 완료: npm run verify:mvp → npm run start:mvp (포트/브라우저 권한은 별도 확인)');
if (process.argv.includes('--bun') && (!report.bunExtension.bunInstalled || report.bunExtension.missingPackages.length || !report.bunExtension.lockfilePresent)) {
  console.error('Bun 확장판: npm install -g bun → bun scripts/setup.ts');
  process.exitCode = 1;
}
