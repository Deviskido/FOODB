import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createNodeMvp } from '../src/server/node-app.mjs';
import { hashPassword, verifyPassword } from '../src/server/password';
import { Database } from '../src/server/sqlite';
test('dependency-free MVP serves local assets and the real application API', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'foodb-node-'));
  const app = createNodeMvp({
    dataDir: dir,
    mode: 'simulation'
  });
  try {
    const page = await app.fetch(new Request('http://127.0.0.1:3000/'));
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-type')!, /text\/html/);
    assert.match(page.headers.get('content-security-policy')!, /script-src 'self'/);
    assert.match(await page.text(), /FOODB MVP/);
    assert.equal((await app.fetch(new Request('http://127.0.0.1:3000/mvp.js'))).status, 200);
    assert.equal((await app.fetch(new Request('http://127.0.0.1:3000/package.json'))).status, 404);
    assert.equal((await app.fetch(new Request('http://remote.example/'))).status, 403);
    const setup = await app.fetch(new Request('http://127.0.0.1:3000/api/v1/setup'));
    assert.equal((await setup.json()).data.required, true);
  } finally {
    app.close();
    rmSync(dir, {
      recursive: true,
      force: true
    });
  }
});
test('portable password hashes verify without Bun and reject corruption', async () => {
  const stored = await hashPassword('portable-password-test');
  assert.match(stored, /^\$foodb\$scrypt\$/);
  assert.equal(await verifyPassword('portable-password-test', stored), true);
  assert.equal(await verifyPassword('wrong-password', stored), false);
  assert.equal(await verifyPassword('portable-password-test', '$foodb$scrypt$malformed'), false);
  assert.notEqual(stored, await hashPassword('portable-password-test'));
});
test('native SQLite adapter preserves outer transaction when a nested savepoint rolls back', () => {
  const db = new Database(':memory:');
  try {
    db.exec('CREATE TABLE sample(value INTEGER)');
    db.transaction(() => {
      db.run('INSERT INTO sample VALUES(1)');
      assert.throws(() => db.transaction(() => {
        db.run('INSERT INTO sample VALUES(2)');
        throw new Error('rollback nested');
      })());
      db.run('INSERT INTO sample VALUES(3)');
    })();
    assert.deepEqual(db.query('SELECT value FROM sample ORDER BY value').all().map((r: any) => r.value), [1, 3]);
  } finally {
    db.close();
  }
});
