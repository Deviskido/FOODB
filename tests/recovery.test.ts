import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fixture, lot } from './helpers';
import { backup } from '../scripts/backup';
import { restore } from '../scripts/restore';
import { createApp } from '../src/server/app';
test('backup integrity, restore session revocation and recovery hold', async () => {
  const f = await fixture(),
    root = mkdtempSync(join(tmpdir(), 'foodb-recovery-'));
  let restored: ReturnType<typeof createApp> | undefined;
  try {
    await lot(f);
    const cookie = f.cookie();
    backup(f.dataDir, join(root, 'snapshot'));
    restore(join(root, 'snapshot'), join(root, 'restored'), join(f.dataDir, 'control', 'deletions.json'));
    restored = createApp({
      dataDir: join(root, 'restored'),
      mode: 'simulation'
    });
    const request = async (path: string, body?: any, currentCookie = cookie) => {
      const r = await restored!.fetch(new Request('http://127.0.0.1:3000/api/v1/' + path, {
        method: body === undefined ? 'GET' : 'POST',
        headers: {
          cookie: currentCookie,
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID()
        },
        body: body === undefined ? undefined : JSON.stringify(body)
      }));
      return {
        r,
        json: await r.json()
      };
    };
    assert.equal((await request('lots')).r.status, 401);
    const login = await request('auth/login', {
      email: 'owner@example.test',
      password: 'testing-password-only'
    });
    assert.equal(login.r.status, 200);
    const fresh = login.r.headers.get('set-cookie')!.split(';')[0];
    assert.equal((await request('lots', undefined, fresh)).json.data.length, 1);
    assert.equal((await request('lots', {
      name: 'blocked',
      quantityMg: 1
    }, fresh)).r.status, 423);
    assert.equal((await request('recovery/release', {
      reason: 'Verified inventory and evidence'
    }, fresh)).r.status, 200);
    assert.equal((await request('lots', {
      name: 'allowed',
      quantityMg: 1
    }, fresh)).r.status, 201);
    writeFileSync(join(root, 'snapshot', 'app.sqlite'), 'corrupted');
    assert.throws(() => restore(join(root, 'snapshot'), join(root, 'bad'), join(f.dataDir, 'control', 'deletions.json')), /checksum/);
  } finally {
    restored?.close();
    f.close();
    rmSync(root, {
      recursive: true,
      force: true
    });
  }
});
