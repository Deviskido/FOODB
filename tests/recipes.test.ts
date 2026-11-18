import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { fixture } from './helpers';
test('MVP rejects impossible recipe yield and invalid commodity input before persistence', async () => {
  const f = await fixture();
  try {
    assert.equal((await f.raw('recipes', {
      name: 'Impossible yield',
      ingredients: [{
        name: 'Tomato',
        quantityMg: 1000000
      }],
      steps: [{
        instruction: 'Prepare'
      }],
      yieldMg: 2000000,
      allergens: [],
      validatedDomain: 'unvalidated'
    })).status, 422);
    assert.deepEqual(await f.call('recipes'), []);
    assert.equal((await f.raw('lots', {
      name: 'Bad commodity',
      commodity: 123,
      quantityMg: 1000000
    })).status, 400);
    assert.deepEqual(await f.call('lots'), []);
  } finally {
    f.close();
  }
});
