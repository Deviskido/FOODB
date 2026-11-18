import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir, platform, arch } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/server/app';
import { requireThat } from '../src/shared/contracts';
const dataDir = mkdtempSync(join(tmpdir(), 'foodb-load-')),
  app = createApp({
    dataDir,
    mode: 'simulation'
  });
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  fetch: app.fetch
});
async function call(path: string, body: any = undefined, cookie = '') {
  const r = await fetch(server.url + 'api/v1/' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      cookie,
      'Content-Type': 'application/json',
      'Idempotency-Key': crypto.randomUUID()
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const result = await r.json();
  requireThat(r.ok, JSON.stringify(result));
  return {
    data: result.data,
    cookie: r.headers.get('set-cookie')?.split(';')[0]
  };
}
try {
  await call('setup', {
    name: 'Synthetic load owner',
    organization: 'Synthetic workload',
    email: 'load@example.test',
    password: 'synthetic-load-password'
  });
  const cookies: string[] = [];
  for (let i = 0; i < 5; i++) cookies.push((await call('auth/login', {
    email: 'load@example.test',
    password: 'synthetic-load-password'
  })).cookie!);
  const ids: string[] = [];
  for (let i = 0; i < 1000; i++) {
    const lot = (await call('lots', {
      name: 'Synthetic ' + i,
      quantityMg: 1000000
    }, cookies[0])).data;
    ids.push(lot.id);
    for (let j = 0; j < 10; j++) await call('observations', {
      lotId: lot.id,
      attribute: 'ssc_brix',
      value: 5,
      unit: '°Bx',
      basis: 'fresh weight',
      method: 'simulation',
      scope: 'lot',
      observedAt: new Date().toISOString(),
      uncertainty: {
        kind: 'interval',
        lower: 4.9,
        upper: 5.1
      }
    }, cookies[0]);
  }
  const reads: number[] = [],
    writes: number[] = [];
  let errors = 0;
  await Promise.all(cookies.map(async cookie => {
    for (let i = 0; i < 120; i++) {
      const start = performance.now();
      try {
        if (i % 6 === 0) {
          await call('costs', {
            name: 'Synthetic workload cost',
            amountMinor: 100,
            currency: 'USD'
          }, cookie);
          writes.push(performance.now() - start);
        } else {
          await call(i % 2 ? 'lots?limit=25' : 'lots/' + ids[i], undefined, cookie);
          reads.push(performance.now() - start);
        }
      } catch {
        errors++;
      }
    }
  }));
  const p95 = (v: number[]) => v.sort((a, b) => a - b)[Math.ceil(v.length * .95) - 1];
  const metrics = (await call('metrics', undefined, cookies[0])).data;
  requireThat(metrics.lots === 1000 && metrics.observations === 10000 && metrics.onHandMg === 1000000000, 'Dataset or stock invariant failed.');
  const result = {
    runtime: Bun.version,
    host: platform() + ' ' + arch(),
    dataset: {
      lots: 1000,
      observations: 10000,
      sessions: 5
    },
    requests: {
      reads: reads.length,
      writes: writes.length,
      errors
    },
    readP95Ms: p95(reads),
    writeP95Ms: p95(writes)
  };
  console.log(JSON.stringify(result, null, 2));
  requireThat(errors === 0 && result.readP95Ms <= 1000 && result.writeP95Ms <= 1000, 'Load acceptance threshold failed.');
} finally {
  server.stop(true);
  app.close();
  rmSync(dataDir, {
    recursive: true,
    force: true
  });
}
