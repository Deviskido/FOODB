import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { fixture, lot } from './helpers';
test('classification distinguishes absent evidence, bounded uncertainty and expiry', async () => {
  const f = await fixture();
  try {
    const l = await lot(f);
    let spec = await f.call('specifications', {
      name: 'Sauce',
      intendedUse: 'Sauce',
      rules: [{
        attribute: 'ssc_brix',
        unit: '°Bx',
        basis: 'fresh weight',
        min: 4,
        max: 7,
        maxAgeHours: 1
      }]
    });
    spec = await f.call(`specifications/${spec.id}/approve`, {
      expectedRevision: spec.revision,
      reason: 'Simulation approval'
    });
    const args = {
      lotId: l.id,
      specificationVersionId: spec.id
    };
    assert.equal((await f.call('decisions', args)).status, 'review');
    await f.call('observations', {
      lotId: l.id,
      attribute: 'ssc_brix',
      value: 5.5,
      unit: '°Bx',
      basis: 'fresh weight',
      method: 'reference',
      scope: 'lot',
      observedAt: '2026-11-18T10:00:00Z',
      uncertainty: {
        kind: 'interval',
        lower: 5,
        upper: 6
      }
    });
    assert.equal((await f.call('decisions', args)).status, 'suitable');
    f.advance(2 * 3600000);
    await f.call('auth/login', {
      email: 'owner@example.test',
      password: 'testing-password-only'
    });
    assert.equal((await f.call('decisions', args)).status, 'review');
    assert.equal((await f.raw('observations', {
      lotId: l.id,
      attribute: 'ph',
      value: 4,
      unit: '°Bx',
      basis: 'fresh weight',
      method: 'reference',
      scope: 'lot',
      observedAt: '2026-11-18T10:00:00Z'
    })).status, 400);
  } finally {
    f.close();
  }
});
