import './node-loader.mjs';
import { createServer } from 'node:http';
import { mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';
const {
  createNodeMvp
} = await import('../src/server/node-app.mjs');
if (Number(process.versions.node.split('.')[0]) < 26) throw new Error('Node 26 이상을 사용하세요.');
const mode = process.argv.includes('--simulation') ? 'simulation' : process.env.APP_MODE ?? 'operational';
if (!['operational', 'simulation'].includes(mode)) throw new Error('APP_MODE must be operational or simulation.');
const dataDir = resolve(process.env.APP_DATA_DIR ?? (mode === 'simulation' ? 'mvp-demo-data' : 'mvp-data'));
mkdirSync(dataDir, {
  recursive: true,
  mode: 0o700
});
const lock = join(dataDir, 'server.lock');
try {
  writeFileSync(lock, String(process.pid), {
    flag: 'wx',
    mode: 0o600
  });
} catch {
  throw new Error('이미 실행 중이거나 server.lock이 남아 있습니다. 프로세스를 확인한 후 다시 실행하세요.');
}
let app;
try {
  app = createNodeMvp({
    dataDir,
    mode
  });
} catch (error) {
  unlinkSync(lock);
  throw error;
}
const server = createServer(async (req, res) => {
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 11 * 1024 * 1024) {
        res.writeHead(413);
        res.end('Request too large');
        return;
      }
      chunks.push(chunk);
    }
    const request = new Request('http://' + (req.headers.host ?? '127.0.0.1') + req.url, {
      method: req.method,
      headers: req.headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks)
    });
    const response = await app.fetch(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    if (!res.headersSent) res.writeHead(500);
    res.end('Request failed');
  }
});
let closed = false;
const close = () => {
  if (closed) return;
  closed = true;
  app.close();
  unlinkSync(lock);
};
server.on('error', error => {
  console.error('서버 실행 실패:', error.code, '— 포트 또는 실행 환경 권한을 확인하세요.');
  close();
  process.exitCode = 1;
});
server.listen(Number(process.env.PORT ?? (mode === 'simulation' ? 3001 : 3000)), '127.0.0.1', () => console.log(`FOODB MVP (${mode}): http://127.0.0.1:${server.address().port} — 데이터: ${dataDir}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => {
  close();
  process.exit(0);
}));
