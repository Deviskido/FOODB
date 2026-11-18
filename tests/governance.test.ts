import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { fixture, lot } from './helpers';
test('deletion disables account and preserves operational evidence', async () => {
  const f = await fixture();
  try {
    await lot(f);
    const user = await f.call('users', {
      name: 'Remove me',
      email: 'delete@example.test',
      password: 'delete-password-only',
      roles: ['viewer']
    });
    const preview = await f.call('deletions/preview', {
      userId: user.id
    });
    assert.equal(preview.userId, user.id);
    await f.call('deletions/apply', {
      userId: user.id,
      reason: 'User request'
    });
    assert.equal((await f.raw('auth/login', {
      email: 'delete@example.test',
      password: 'delete-password-only'
    })).status, 401);
    assert.equal((await f.call('lots')).length, 1);
    assert.equal((await f.call('users')).find((u: any) => u.id === user.id).name, 'Deleted user');
    const exported = JSON.stringify(await f.call('exports'));
    assert.ok(!exported.includes('delete-password-only'));
    assert.ok(!exported.includes('testing-password-only'));
  } finally {
    f.close();
  }
});
