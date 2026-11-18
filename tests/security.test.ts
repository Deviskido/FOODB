import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { Database } from '../src/server/sqlite';
import { join } from 'node:path';
import { fixture } from './helpers';
test('a previously successful mutation cannot bypass a subsequently revoked role through replay', async () => {
  const f = await fixture();
  try {
    const me = await f.call('auth/me');
    const key = crypto.randomUUID(),
      body = {
        name: 'Saved private recipe',
        ingredients: [{
          name: 'Tomato',
          quantityMg: 1000000
        }],
        steps: [{
          instruction: 'Secret private instruction'
        }],
        yieldMg: 900000,
        allergens: [],
        validatedDomain: 'unvalidated'
      };
    await f.call('recipes', body, {
      key
    });
    await f.call('users', {
      name: 'Second owner',
      email: 'second@example.test',
      password: 'second-owner-password',
      roles: ['owner']
    });
    await f.call('auth/login', {
      email: 'second@example.test',
      password: 'second-owner-password'
    });
    await f.call('memberships', {
      userId: me.id,
      roles: ['viewer']
    });
    await f.call('auth/login', {
      email: 'owner@example.test',
      password: 'testing-password-only'
    });
    assert.equal((await f.raw('recipes', body, {
      key
    })).status, 403);
  } finally {
    f.close();
  }
});
test('device credentials are hashed at rest, including idempotency response storage', async () => {
  const f = await fixture();
  try {
    const key = crypto.randomUUID(),
      body = {
        name: 'Protected credential'
      },
      issued = await f.call('devices', body, {
        key
      });
    const db = new Database(join(f.dataDir, 'app.sqlite'));
    try {
      assert.ok(!JSON.stringify(db.query('SELECT * FROM devices').all()).includes(issued.token));
      assert.ok(!JSON.stringify(db.query('SELECT * FROM integration_events').all()).includes(issued.token));
    } finally {
      db.close();
    }
    const retry = await f.call('devices', body, {
      key
    });
    assert.equal(retry.token, undefined);
    assert.equal(retry.credentialShownOnce, true);
  } finally {
    f.close();
  }
});
