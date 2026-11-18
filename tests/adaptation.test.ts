import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { fixture, lot, qualify } from './helpers';
test('bounded ingredient adaptation reserves its adjusted mass; unsupported bounds abstain', async () => {
  const f = await fixture();
  try {
    const l = await lot(f);
    await qualify(f, l.id);
    let recipe = await f.call('recipes', {
      name: 'Bounded simulation recipe',
      ingredients: [{
        name: 'Tomato',
        quantityMg: 2000000
      }],
      steps: [{
        instruction: 'Prepare under approved procedure'
      }],
      yieldMg: 1800000,
      allergens: [],
      validatedDomain: 'unvalidated',
      rules: [{
        attribute: 'ssc_brix',
        unit: '°Bx',
        basis: 'fresh weight',
        inputMin: 4,
        inputMax: 7,
        reference: 4,
        slope: 100000,
        target: 'ingredient',
        index: 0,
        outputMin: 1900000,
        outputMax: 2200000
      }]
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
    assert.equal(adaptation.instructions.ingredients[0].quantityMg, 2100000);
    assert.equal(adaptation.inputs[0].quantityMg, 2100000);
    await f.call(`adaptations/${adaptation.id}/approve`, {
      expectedRevision: adaptation.revision
    });
    assert.equal((await f.call('inventory'))[0].reservedMg, 2100000);
  } finally {
    f.close();
  }
});
test('recipe instructions cannot substitute an unapproved commodity', async () => {
  const f = await fixture();
  try {
    const l = await lot(f);
    await qualify(f, l.id);
    let recipe = await f.call('recipes', {
      name: 'Other ingredient',
      ingredients: [{
        name: 'Pepper',
        quantityMg: 1000000
      }],
      steps: [{
        instruction: 'Prepare'
      }],
      yieldMg: 900000,
      allergens: [],
      validatedDomain: 'unvalidated'
    });
    recipe = await f.call(`recipes/${recipe.id}/approve`, {
      expectedRevision: recipe.revision,
      reason: 'Simulation'
    });
    assert.equal((await f.raw('adaptations', {
      recipeRef: {
        kind: 'private',
        versionId: recipe.id
      },
      inputs: [{
        lotId: l.id,
        quantityMg: 1000000
      }]
    })).status, 422);
  } finally {
    f.close();
  }
});
