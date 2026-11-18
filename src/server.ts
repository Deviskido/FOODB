import homepage from './web/index.html';
import { createApp } from './server/app';
import { resolve, join } from 'node:path';
import { writeFileSync, unlinkSync } from 'node:fs';
import { requireThat, type Mode } from './shared/contracts';
const mode = (process.env.APP_MODE ?? 'operational') as Mode;
requireThat(['operational', 'simulation'].includes(mode), 'APP_MODE must be operational or simulation.');
const app = createApp({
  dataDir: resolve(process.env.APP_DATA_DIR ?? (mode === 'simulation' ? 'demo-data' : 'data')),
  mode
});
const lockPath = join(resolve(process.env.APP_DATA_DIR ?? (mode === 'simulation' ? 'demo-data' : 'data')), 'server.lock');
try {
  writeFileSync(lockPath, String(process.pid), {
    flag: 'wx',
    mode: 0o600
  });
} catch {
  app.close();
  throw new Error('Workspace is locked. Stop its server; remove server.lock only after verifying no server is running.');
}
try {
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: Number(process.env.PORT ?? (mode === 'simulation' ? 3001 : 3000)),
    maxRequestBodySize: 11 * 1024 * 1024,
    development: process.env.NODE_ENV === 'development',
    routes: {
      '/': homepage
    },
    fetch: app.fetch
  });
  console.log(`FOODB ${mode}: ${server.url}`);
  const stop = () => {
    server.stop(true);
    app.close();
    unlinkSync(lockPath);
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
} catch (error) {
  app.close();
  unlinkSync(lockPath);
  console.error('Could not start FOODB. Check whether the port is already in use.', error);
  process.exit(1);
}
