import './node-loader.mjs';
const [operation, ...args] = process.argv.slice(2);
if (operation === 'backup' && args.length === 2) {
  const {
    backup
  } = await import('./backup.ts');
  console.log(JSON.stringify(backup(...args), null, 2));
} else if (operation === 'restore' && args.length === 3) {
  const {
    restore
  } = await import('./restore.ts');
  console.log(JSON.stringify(restore(...args), null, 2));
} else {
  console.error('사용법: npm run backup:mvp -- <중지된 데이터 폴더> <새 백업 폴더>\n또는: npm run restore:mvp -- <백업 폴더> <새 데이터 폴더> <최신 삭제 지시 파일>');
  process.exitCode = 1;
}
