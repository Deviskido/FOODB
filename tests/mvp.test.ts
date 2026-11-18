import { test } from 'bun:test';
import { Database } from '../src/server/sqlite';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { fixture, lot, qualify } from './helpers';
async function ready(f: Awaited<ReturnType<typeof fixture>>, rules: any[] = []) {
  const material = await lot(f);
  await qualify(f, material.id);
  let recipe = await f.call('recipes', {
    name: 'MVP tomato sauce',
    ingredients: [{
      name: 'Tomato',
      commodity: 'tomato',
      quantityMg: 2000000
    }],
    steps: [{
      instruction: 'Record the approved preparation procedure'
    }],
    yieldMg: 1800000,
    allergens: [],
    validatedDomain: 'unvalidated',
    rules
  });
  recipe = await f.call(`recipes/${recipe.id}/approve`, {
    expectedRevision: recipe.revision,
    reason: 'Simulation recipe approval'
  });
  return {
    material,
    recipe,
    body: {
      lotId: material.id,
      lotRevision: material.revision,
      recipeVersionId: recipe.id,
      recipeRevision: recipe.revision
    }
  };
}
test('MVP fixed-recipe journey is persistent and retry-safe from reservation through finished inventory', async () => {
  const f = await fixture();
  try {
    const {
        material,
        body
      } = await ready(f),
      key = crypto.randomUUID();
    let batch = await f.call('mvp/prepare', body, {
      key
    });
    assert.equal((await f.call('mvp/prepare', body, {
      key
    })).id, batch.id);
    let summary = await f.call('mvp');
    assert.equal(summary.batches.length, 1);
    assert.equal(summary.lots.find((l: any) => l.id === material.id).reservedMg, 2000000);
    f.reopen();
    assert.equal((await f.call('mvp')).batches[0].id, batch.id);
    batch = await f.call(`production/${batch.id}/start`, {
      expectedRevision: batch.revision
    });
    await f.call(`production/${batch.id}/events`, {
      step: 0,
      actual: 'Completed the approved preparation procedure'
    });
    batch = await f.call(`production/${batch.id}/complete`, {
      expectedRevision: batch.revision,
      yieldMg: 1800000
    });
    summary = await f.call('mvp');
    assert.equal(summary.lots.find((l: any) => l.id === material.id).onHandMg, 8000000);
    assert.equal(summary.lots.find((l: any) => l.id === batch.finishedLotId).onHandMg, 1800000);
    assert.equal(summary.batches[0].events.length, 1);
  } finally {
    f.close();
  }
});
test('MVP rejects held material and stale snapshots without leaving reservations or batches', async () => {
  const f = await fixture();
  try {
    const {
      material,
      body
    } = await ready(f);
    assert.equal((await f.raw('mvp/prepare', {
      ...body,
      lotRevision: 0
    })).status, 409);
    await f.call('holds', {
      lotId: material.id,
      kind: 'safety',
      reason: 'Investigation'
    });
    assert.equal((await f.raw('mvp/prepare', body)).status, 422);
    const summary = await f.call('mvp');
    assert.equal(summary.batches.length, 0);
    assert.equal(summary.lots.find((l: any) => l.id === material.id).reservedMg, 0);
  } finally {
    f.close();
  }
});
test('MVP cancellation returns reserved mass; viewer summaries do not expose private instructions', async () => {
  const f = await fixture();
  try {
    const {
      body
    } = await ready(f);
    const batch = await f.call('mvp/prepare', body);
    await f.call(`production/${batch.id}/cancel`, {
      expectedRevision: batch.revision,
      reason: 'Cancel before production'
    });
    assert.equal((await f.call('mvp')).lots[0].reservedMg, 0);
    await f.call('users', {
      name: 'Read only',
      email: 'mvp-viewer@example.test',
      password: 'viewer-mvp-password',
      roles: ['viewer']
    });
    await f.call('auth/login', {
      email: 'mvp-viewer@example.test',
      password: 'viewer-mvp-password'
    });
    const summary = await f.call('mvp');
    assert.deepEqual(summary.recipes, []);
    assert.equal(summary.batches[0].instructions, undefined);
    assert.equal((await f.raw('mvp/prepare', body)).status, 403);
  } finally {
    f.close();
  }
});
test('MVP rechecks expired evidence before starting a prepared batch', async () => {
  const f = await fixture();
  try {
    const {
      body
    } = await ready(f);
    const batch = await f.call('mvp/prepare', body);
    assert.equal((await f.call('mvp')).batches[0].instructions.steps.length, 1);
    f.advance(25 * 3600000);
    await f.call('auth/login', {
      email: 'owner@example.test',
      password: 'testing-password-only'
    });
    assert.equal((await f.raw(`production/${batch.id}/start`, {
      expectedRevision: batch.revision
    })).status, 422);
    assert.equal((await f.call('mvp')).lots[0].onHandMg, 10000000);
    assert.equal((await f.call('usage')).length, 0);
  } finally {
    f.close();
  }
});
test('MVP only accepts fixed recipes and does not partially reserve adaptive recipes', async () => {
  const f = await fixture();
  try {
    const {
      body
    } = await ready(f, [{
      attribute: 'ssc_brix',
      unit: '°Bx',
      basis: 'fresh weight',
      reference: 5,
      slope: 10000,
      inputMin: 4,
      inputMax: 7,
      target: 'ingredient',
      index: 0,
      outputMin: 1000000,
      outputMax: 3000000
    }]);
    assert.equal((await f.raw('mvp/prepare', body)).status, 422);
    const summary = await f.call('mvp');
    assert.equal(summary.recipes.length, 0);
    assert.equal(summary.batches.length, 0);
    assert.equal(summary.lots[0].reservedMg, 0);
  } finally {
    f.close();
  }
});
test('MVP aggregate is tenant scoped', async () => {
  const f = await fixture();
  try {
    const {
      body
    } = await ready(f);
    await f.call('mvp/prepare', body);
    const other = await f.call('organizations', {
      name: 'Separate organization'
    });
    await f.call('auth/organization', {
      orgId: other.id
    });
    const summary = await f.call('mvp');
    assert.deepEqual(summary.lots, []);
    assert.deepEqual(summary.recipes, []);
    assert.deepEqual(summary.batches, []);
  } finally {
    f.close();
  }
});
test('MVP rolls back approved proposal and stock reservation if batch insertion fails', async () => {
  const f = await fixture();
  let db: Database | undefined;
  try {
    const {
      body
    } = await ready(f);
    db = new Database(join(f.dataDir, 'app.sqlite'));
    db.exec("CREATE TRIGGER fail_mvp_batch BEFORE INSERT ON production_batches BEGIN SELECT RAISE(ABORT,'simulated storage failure'); END");
    const key = crypto.randomUUID();
    assert.equal((await f.raw('mvp/prepare', body, {
      key
    })).status, 500);
    assert.equal((await f.call('adaptations')).length, 0);
    const summary = await f.call('mvp');
    assert.equal(summary.batches.length, 0);
    assert.equal(summary.lots[0].reservedMg, 0);
    db.exec('DROP TRIGGER fail_mvp_batch');
    assert.equal((await f.call('mvp/prepare', body, {
      key
    })).status, 'approved');
  } finally {
    db?.close();
    f.close();
  }
});
test('a newer quality decision invalidates already prepared production', async () => {
  const f = await fixture();
  try {
    const {
      body,
      material
    } = await ready(f);
    const batch = await f.call('mvp/prepare', body);
    const previous = (await f.call('decisions'))[0];
    await f.call('observations', {
      lotId: material.id,
      attribute: 'ssc_brix',
      value: 9,
      unit: '°Bx',
      basis: 'fresh weight',
      method: 'new reference',
      scope: 'lot',
      observedAt: '2026-11-18T10:00:00Z',
      uncertainty: {
        kind: 'interval',
        lower: 8.9,
        upper: 9.1
      }
    });
    const latest = await f.call('decisions', {
      lotId: material.id,
      specificationVersionId: previous.specificationVersionId
    });
    assert.equal(latest.status, 'unsuitable');
    assert.equal((await f.raw(`production/${batch.id}/start`, {
      expectedRevision: batch.revision
    })).status, 409);
    assert.equal((await f.call('mvp')).lots[0].onHandMg, 10000000);
    assert.equal((await f.call('usage')).length, 0);
  } finally {
    f.close();
  }
});
