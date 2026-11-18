import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { fixture, lot, qualify } from './helpers';
test('revocation blocks new production and redacts adaptation contents', async () => {
  const f = await fixture();
  try {
    const l = await lot(f);
    await qualify(f, l.id);
    const catalog = await f.call('catalog', {
      name: 'Licensed sauce',
      ingredients: [{
        name: 'Tomato',
        quantityMg: 1000000
      }],
      steps: [{
        instruction: 'Private licensed step'
      }],
      yieldMg: 900000,
      allergens: [],
      validatedDomain: 'unvalidated'
    });
    const license = await f.call('licenses', {
      name: 'Test license',
      catalogVersionId: catalog.id,
      startsAt: '2026-11-18T00:00:00Z',
      expiresAt: '2026-11-19T00:00:00Z',
      production: true
    });
    let adaptation = await f.call('adaptations', {
      recipeRef: {
        kind: 'catalog',
        versionId: catalog.id
      },
      inputs: [{
        lotId: l.id,
        quantityMg: 1000000
      }]
    });
    adaptation = await f.call(`adaptations/${adaptation.id}/approve`, {
      expectedRevision: adaptation.revision
    });
    const batch = await f.call('production', {
      adaptationId: adaptation.id
    });
    await f.call(`licenses/${license.id}/revoke`, {
      expectedRevision: license.revision,
      reason: 'Revoked'
    });
    assert.equal((await f.raw(`production/${batch.id}/start`, {
      expectedRevision: batch.revision
    })).status, 403);
    const restricted = await f.call('adaptations/' + adaptation.id);
    assert.equal(restricted.contentRestricted, true);
    assert.equal(restricted.instructions, undefined);
    assert.equal((await f.call('usage')).length, 0);
  } finally {
    f.close();
  }
});
