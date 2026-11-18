import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { createApp } from '../src/server/app';
export async function fixture() {
  const dataDir = mkdtempSync(join(tmpdir(), 'foodb-test-'));
  let now = new Date('2026-11-18T10:00:00Z');
  let app = createApp({
    dataDir,
    mode: 'simulation',
    clock: () => now
  });
  let cookie = '';
  async function raw(path: string, body?: any, options: {
    key?: string;
    cookie?: string;
    origin?: string;
    authorization?: string;
  } = {}) {
    const r = await app.fetch(new Request('http://127.0.0.1:3000/api/v1/' + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': options.key ?? crypto.randomUUID(),
        cookie: options.cookie ?? cookie,
        ...(options.origin ? {
          Origin: options.origin
        } : {}),
        ...(options.authorization ? {
          Authorization: options.authorization
        } : {})
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    }));
    if (r.headers.has('set-cookie')) cookie = r.headers.get('set-cookie')!.split(';')[0];
    return {
      status: r.status,
      ...(await r.json())
    };
  }
  async function call(path: string, body?: any, options?: any) {
    const r = await raw(path, body, options);
    assert.ok(r.status < 300, `${path}: ${r.status} ${JSON.stringify(r.error)}`);
    return r.data;
  }
  await call('setup', {
    name: 'Test owner',
    organization: 'Test kitchen',
    email: 'owner@example.test',
    password: 'testing-password-only'
  });
  await call('auth/login', {
    email: 'owner@example.test',
    password: 'testing-password-only'
  });
  return {
    dataDir,
    raw,
    call,
    cookie: () => cookie,
    advance: (ms: number) => {
      now = new Date(now.getTime() + ms);
    },
    reopen: () => {
      app.close();
      app = createApp({
        dataDir,
        mode: 'simulation',
        clock: () => now
      });
    },
    close: () => {
      app.close();
      rmSync(dataDir, {
        recursive: true,
        force: true
      });
    }
  };
}
export async function lot(f: Awaited<ReturnType<typeof fixture>>, quantityMg = 10000000) {
  const location = await f.call('locations', {
    name: 'Receiving'
  });
  return f.call('lots', {
    name: 'Tomato lot',
    quantityMg,
    locationId: location.id,
    commodity: 'tomato'
  });
}
export async function qualify(f: Awaited<ReturnType<typeof fixture>>, lotId: string) {
  let spec = await f.call('specifications', {
    name: 'Simulation receiving',
    intendedUse: 'Tomato sauce',
    rules: [{
      attribute: 'ssc_brix',
      unit: '°Bx',
      basis: 'fresh weight',
      min: 4,
      max: 7,
      maxAgeHours: 24
    }]
  });
  spec = await f.call(`specifications/${spec.id}/approve`, {
    expectedRevision: spec.revision,
    reason: 'Simulation only'
  });
  await f.call('observations', {
    lotId,
    attribute: 'ssc_brix',
    value: 5,
    unit: '°Bx',
    basis: 'fresh weight',
    method: 'simulation reference',
    scope: 'lot',
    observedAt: '2026-11-18T10:00:00Z',
    uncertainty: {
      kind: 'interval',
      lower: 4.9,
      upper: 5.1
    }
  });
  return f.call('decisions', {
    lotId,
    specificationVersionId: spec.id
  });
}
