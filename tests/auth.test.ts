import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { fixture, lot } from './helpers';
test('setup is one-time; login, session expiry and cross-origin checks are enforced', async () => {
  const f = await fixture();
  try {
    assert.equal((await f.raw('setup', {
      name: 'X',
      organization: 'X',
      email: 'x@x.test',
      password: 'valid-password-here'
    })).status, 409);
    assert.equal((await f.raw('lots', {
      name: 'Bad',
      quantityMg: 100
    }, {
      origin: 'https://attacker.example'
    })).status, 403);
    assert.equal((await f.raw('lots', undefined, {
      cookie: ''
    })).status, 401);
    f.advance(31 * 60000);
    assert.equal((await f.raw('auth/me')).status, 401);
  } finally {
    f.close();
  }
});
test('viewer cannot create lots or read recipes; other-tenant IDs return 404', async () => {
  const f = await fixture();
  try {
    const original = await lot(f);
    await f.call('users', {
      name: 'Viewer',
      email: 'viewer@example.test',
      password: 'viewer-password-only',
      roles: ['viewer']
    });
    await f.call('auth/login', {
      email: 'viewer@example.test',
      password: 'viewer-password-only'
    });
    assert.equal((await f.raw('lots', {
      name: 'Denied',
      quantityMg: 100
    })).status, 403);
    assert.equal((await f.raw('recipes')).status, 403);
    await f.call('auth/login', {
      email: 'owner@example.test',
      password: 'testing-password-only'
    });
    const org = await f.call('organizations', {
      name: 'Other tenant'
    });
    await f.call('auth/organization', {
      orgId: org.id
    });
    assert.equal((await f.raw('lots/' + original.id)).status, 404);
    assert.deepEqual(await f.call('lots'), []);
  } finally {
    f.close();
  }
});
