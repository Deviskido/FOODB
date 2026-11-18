import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { prepare } from '../src/web/forms';
import { fixture } from './helpers';
test('recipe form data creates an approvable version and action forms do not require creation fields', async () => {
  const f = await fixture();
  try {
    const body = prepare('recipes', {
      name: 'Form recipe',
      ingredientsJson: JSON.stringify([{
        name: 'Tomato',
        commodity: 'tomato',
        quantityMg: 1000000
      }]),
      stepsJson: JSON.stringify([{
        instruction: 'Prepare under an approved procedure'
      }]),
      yieldMg: 900000,
      validatedDomain: 'unvalidated'
    });
    const recipe = await f.call('recipes', body);
    const approved = await f.call(`recipes/${recipe.id}/approve`, {
      ...prepare('', {
        reason: 'Simulation only'
      }),
      expectedRevision: recipe.revision
    });
    assert.equal(approved.status, 'approved');
    assert.equal(approved.ingredients[0].commodity, 'tomato');
    assert.equal(approved.ingredientsJson, undefined);
  } finally {
    f.close();
  }
});
test('form conversion preserves missing measurements and rejects empty evaluation values', () => {
  assert.equal(prepare('observations', {
    attribute: 'ssc_brix'
  }).value, null);
  assert.throws(() => prepare('', {
    valuesText: '1,,2'
  }), /numeric/);
  assert.deepEqual(prepare('', {
    evidenceText: 'one, two'
  }).evidenceIds, ['one', 'two']);
});
