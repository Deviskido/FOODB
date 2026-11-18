import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { fixture, lot } from './helpers';
test('frozen monitoring policy suspends a model when paired-reference error fails', async () => {
  const f = await fixture();
  try {
    const l = await lot(f);
    let model = await f.call('models', {
      name: 'Imported model v1',
      domain: 'tomato simulation',
      monitoringPolicy: {
        maxError: 0.2,
        minCoverage: 0.9,
        maxAgeHours: 24
      }
    });
    const common = {
      lotId: l.id,
      attribute: 'ssc_brix',
      unit: '°Bx',
      basis: 'fresh weight',
      method: 'reference',
      scope: 'lot',
      observedAt: '2026-11-18T10:00:00Z'
    };
    const prediction = await f.call('observations', {
      ...common,
      modelId: model.id,
      domain: 'tomato simulation',
      value: 5,
      uncertainty: {
        kind: 'interval',
        lower: 4.9,
        upper: 5.1
      }
    });
    const reference = await f.call('observations', {
      ...common,
      value: 6,
      uncertainty: {
        kind: 'interval',
        lower: 5.9,
        upper: 6.1
      }
    });
    model = await f.call(`models/${model.id}/evaluate`, {
      expectedRevision: model.revision,
      pairs: [{
        predictionId: prediction.id,
        referenceId: reference.id
      }]
    });
    assert.equal(model.status, 'suspended');
    assert.equal(model.maxError, 1);
    assert.equal(model.coverage, 0);
    const observation = await f.call('observations/' + prediction.id);
    assert.equal(observation.currentUsability, 'outside validated domain');
  } finally {
    f.close();
  }
});
