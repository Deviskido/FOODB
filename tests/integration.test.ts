import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { fixture, lot, qualify } from './helpers';
export async function prepared(f: Awaited<ReturnType<typeof fixture>>) {
  const l = await lot(f);
  await qualify(f, l.id);
  let recipe = await f.call('recipes', {
    name: 'Simulation sauce',
    ingredients: [{
      name: 'Tomato',
      quantityMg: 2000000
    }],
    steps: [{
      instruction: 'Process under the approved procedure'
    }],
    yieldMg: 1800000,
    allergens: [],
    validatedDomain: 'unvalidated',
    rules: []
  });
  recipe = await f.call(`recipes/${recipe.id}/approve`, {
    expectedRevision: recipe.revision,
    reason: 'Simulation only'
  });
  let adaptation = await f.call('adaptations', {
    recipeRef: {
      kind: 'private',
      versionId: recipe.id
    },
    inputs: [{
      lotId: l.id,
      quantityMg: 2000000
    }]
  });
  adaptation = await f.call(`adaptations/${adaptation.id}/approve`, {
    expectedRevision: adaptation.revision
  });
  const batch = await f.call('production', {
    name: 'Batch 1',
    adaptationId: adaptation.id
  });
  return {
    l,
    recipe,
    adaptation,
    batch
  };
}
test('receive → reserve → cook → dispatch → delivery preserves stock, usage and withdrawal lineage', async () => {
  const f = await fixture();
  try {
    let {
      l,
      batch
    } = await prepared(f);
    assert.equal((await f.call('inventory')).find((x: any) => x.id === l.id).reservedMg, 2000000);
    batch = await f.call(`production/${batch.id}/start`, {
      expectedRevision: batch.revision
    });
    await f.call(`production/${batch.id}/start`, {
      expectedRevision: 1
    });
    assert.equal((await f.call('usage')).length, 1);
    assert.equal((await f.call('inventory')).find((x: any) => x.id === l.id).onHandMg, 8000000);
    await f.call(`production/${batch.id}/events`, {
      step: 0,
      actual: 'Recorded actual procedure'
    });
    batch = await f.call(`production/${batch.id}/complete`, {
      expectedRevision: batch.revision,
      yieldMg: 1800000
    });
    let product = await f.call('products', {
      name: 'Sauce jar',
      packaging: 'Sealed jar',
      minTemperatureC: 1,
      maxTemperatureC: 8,
      maxTransitMinutes: 60
    });
    product = await f.call(`products/${product.id}/approve`, {
      expectedRevision: product.revision,
      reason: 'Simulation only'
    });
    let order = await f.call('orders', {
      name: 'Order 1',
      productVersionId: product.id,
      quantityMg: 1000000
    });
    order = await f.call(`orders/${order.id}/allocate`, {
      expectedRevision: order.revision,
      batchId: batch.id,
      quantityMg: 1000000
    });
    order = await f.call(`orders/${order.id}/ready`, {
      expectedRevision: order.revision,
      packaging: 'Sealed jar'
    });
    order = await f.call(`orders/${order.id}/dispatch`, {
      expectedRevision: order.revision
    });
    order = await f.call(`orders/${order.id}/delivery-events`, {
      expectedRevision: order.revision,
      temperatureC: 4,
      packagingIntact: true
    });
    assert.equal(order.status, 'delivered');
    const withdrawal = await f.call('withdrawals', {
      lotId: l.id,
      reason: 'Traceability exercise'
    });
    assert.ok(withdrawal.orders.includes(order.id));
    assert.ok((await f.call('lineage/' + batch.finishedLotId)).holds.length);
    assert.equal((await f.call('inventory')).find((x: any) => x.id === batch.finishedLotId).onHandMg, 800000);
  } finally {
    f.close();
  }
});
test('new safety hold blocks production without consuming reservations or generating usage', async () => {
  const f = await fixture();
  try {
    const {
      l,
      batch
    } = await prepared(f);
    await f.call('holds', {
      lotId: l.id,
      kind: 'safety',
      reason: 'Safety concern'
    });
    assert.equal((await f.raw(`production/${batch.id}/start`, {
      expectedRevision: batch.revision
    })).status, 422);
    assert.equal((await f.call('usage')).length, 0);
    const stock = (await f.call('inventory')).find((x: any) => x.id === l.id);
    assert.equal(stock.onHandMg, 10000000);
    assert.equal(stock.reservedMg, 2000000);
  } finally {
    f.close();
  }
});
