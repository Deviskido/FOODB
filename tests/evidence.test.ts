import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createApp } from '../src/server/app';
test('evidence signatures and tenant isolation are enforced before download', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'foodb-evidence-')),
    app = createApp({
      dataDir: dir,
      mode: 'simulation'
    });
  let cookie = '';
  async function call(path: string, body?: any) {
    const r = await app.fetch(new Request('http://127.0.0.1/api/v1/' + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        cookie,
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID()
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    }));
    if (r.headers.has('set-cookie')) cookie = r.headers.get('set-cookie')!.split(';')[0];
    return {
      status: r.status,
      ...(await r.json())
    };
  }
  try {
    await call('setup', {
      name: 'Owner',
      organization: 'Org',
      email: 'test@example.test',
      password: 'evidence-test-password'
    });
    await call('auth/login', {
      email: 'test@example.test',
      password: 'evidence-test-password'
    });
    const upload = async (mime: string, body: string) => app.fetch(new Request('http://127.0.0.1/api/v1/evidence', {
      method: 'POST',
      headers: {
        cookie,
        'Content-Type': mime,
        'X-File-Name': 'evidence.txt'
      },
      body
    }));
    assert.equal((await upload('image/png', 'not a PNG')).status, 400);
    const valid = await upload('text/plain', 'Reference procedure attachment'),
      record = (await valid.json()).data;
    assert.equal(valid.status, 201);
    const other = (await call('organizations', {
      name: 'Other'
    })).data;
    await call('auth/organization', {
      orgId: other.id
    });
    const denied = await app.fetch(new Request('http://127.0.0.1/api/v1/evidence/' + record.id, {
      headers: {
        cookie
      }
    }));
    assert.equal(denied.status, 404);
  } finally {
    app.close();
    rmSync(dir, {
      recursive: true,
      force: true
    });
  }
});
