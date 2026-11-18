import { resolve, join } from 'node:path';
import { createApp } from '../src/server/app';
const dataDir = resolve(process.env.APP_DATA_DIR ?? 'demo-data');
const app = createApp({
  dataDir,
  mode: 'simulation'
});
let cookie = '';
async function call(path: string, body?: any) {
  const r = await app.fetch(new Request('http://127.0.0.1:3001/api/v1/' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': crypto.randomUUID(),
      cookie
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  }));
  if (r.headers.has('set-cookie')) cookie = r.headers.get('set-cookie')!.split(';')[0];
  const result = await r.json();
  if (!r.ok) throw new Error(result.error.message);
  return result.data;
}
try {
  const state = await call('setup');
  if (state.required) {
    const password = process.env.DEMO_PASSWORD;
    if (!password || password.length < 12) throw new Error('For first-run demo seeding, set DEMO_PASSWORD to a password of at least 12 characters. No default password is shipped.');
    await call('setup', {
      name: 'Demo operator',
      organization: 'Simulation kitchen',
      email: 'demo@foodb.local',
      password
    });
    await call('auth/login', {
      email: 'demo@foodb.local',
      password
    });
    const location = await call('locations', {
      name: 'Receiving bay'
    });
    await call('locations', {
      name: 'Kitchen staging'
    });
    const supplier = await call('suppliers', {
      name: 'Synthetic tomato supplier'
    });
    const lot = await call('lots', {
      name: 'SIM-TOM-001',
      commodity: 'tomato',
      quantityMg: 12000000,
      locationId: location.id,
      supplierId: supplier.id,
      provenance: 'Synthetic fixture'
    });
    await call('observations', {
      lotId: lot.id,
      attribute: 'ssc_brix',
      value: 5.5,
      unit: '°Bx',
      basis: 'fresh weight',
      method: 'simulation',
      scope: 'lot',
      observedAt: new Date().toISOString(),
      uncertainty: {
        kind: 'interval',
        lower: 5.3,
        upper: 5.7
      }
    });
    console.log('Simulation data created. Sign in as demo@foodb.local with your DEMO_PASSWORD.');
  } else console.log('Existing simulation workspace preserved.');
} finally {
  app.close();
}
const child = Bun.spawn(['bun', 'src/server.ts'], {
  env: {
    ...process.env,
    APP_MODE: 'simulation',
    APP_DATA_DIR: dataDir,
    PORT: '3001'
  },
  stdout: 'inherit',
  stderr: 'inherit'
});
process.on('SIGINT', () => child.kill());
await child.exited;
