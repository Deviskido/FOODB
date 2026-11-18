import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { Database } from 'bun:sqlite';
import { join } from 'node:path';
import { fixture, lot } from './helpers';
test('SQLite rejects cross-tenant evidence identities even when bypassing the HTTP validation layer', async () => {
  const f = await fixture();
  try {
    const l = await lot(f);
    const org = await f.call('organizations', {
      name: 'Other'
    });
    const db = new Database(join(f.dataDir, 'app.sqlite'));
    try {
      db.exec('PRAGMA foreign_keys=ON');
      assert.throws(() => db.query('INSERT INTO samples(org_id,id,name,status,body,created_at) VALUES(?,?,?,?,?,?)').run(org.id, crypto.randomUUID(), 'Cross tenant', 'recorded', JSON.stringify({
        lotId: l.id
      }), new Date().toISOString()), /FOREIGN KEY/);
    } finally {
      db.close();
    }
  } finally {
    f.close();
  }
});
