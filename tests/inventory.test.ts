import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { fixture, lot } from './helpers';
test('receiving is idempotent and persisted after reopening', async () => {
  const f = await fixture();
  try {
    const key = crypto.randomUUID(),
      body = {
        name: 'Retry lot',
        quantityMg: 1000000
      };
    const first = await f.call('lots', body, {
      key
    });
    const retry = await f.call('lots', body, {
      key
    });
    assert.equal(first.id, retry.id);
    assert.equal((await f.call('inventory'))[0].onHandMg, 1000000);
    assert.equal((await f.raw('lots', {
      ...body,
      quantityMg: 2
    }, {
      key
    })).status, 409);
    f.reopen();
    assert.equal((await f.call('inventory'))[0].onHandMg, 1000000);
  } finally {
    f.close();
  }
});
test('lineage conserves mass and inherited safety holds prevent new transformations', async () => {
  const f = await fixture();
  try {
    const a = await lot(f, 10000000);
    const child = await f.call('lineage', {
      name: 'Split',
      inputs: [{
        lotId: a.id,
        quantityMg: 4000000
      }],
      quantityMg: 3500000,
      lossMg: 500000
    });
    const inventory = await f.call('inventory');
    assert.equal(inventory.find((x: any) => x.id === a.id).onHandMg, 6000000);
    assert.equal(inventory.find((x: any) => x.id === child.id).onHandMg, 3500000);
    await f.call('holds', {
      lotId: a.id,
      kind: 'safety',
      reason: 'Investigate'
    });
    assert.equal((await f.raw('lineage', {
      name: 'Blocked',
      inputs: [{
        lotId: child.id,
        quantityMg: 1000
      }],
      quantityMg: 1000
    })).status, 422);
    assert.equal((await f.call('lineage/' + child.id)).holds.length, 1);
    assert.equal((await f.call('lots')).length, 2);
  } finally {
    f.close();
  }
});
