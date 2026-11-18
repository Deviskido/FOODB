import { Store } from '../db';
import { Inventory } from './inventory';
import { type Actor, attributes, units, requireThat, text, number, date } from '../../shared/contracts';
import { permit } from '../../shared/permissions';
export class Quality {
  public inventory: Inventory;
  public s: Store;
  constructor(s: Store, inventory: Inventory) {
    this.s = s;
    this.inventory = inventory;
  }
  observe(a: Actor, b: any) {
    permit(a, 'quality');
    this.s.get('lots', a.orgId, b.lotId);
    requireThat(attributes.includes(b.attribute), 'Unknown attribute.', 400);
    requireThat(units[b.attribute]?.includes(b.unit), 'Unit is not valid for this attribute.', 400);
    text(b.basis, 'Basis');
    text(b.method, 'Method');
    requireThat(['lot', 'sample', 'item'].includes(b.scope), 'Scope must be lot, sample or item.', 400);
    if (b.scope === 'sample') {
      const sample = this.s.get('samples', a.orgId, b.sampleId);
      requireThat(sample.lotId === b.lotId, 'Sample belongs to another lot.');
    }
    if (b.scope === 'item') text(b.itemId, 'Item identity');
    const observedAt = date(b.observedAt, 'Observed at');
    requireThat(observedAt <= this.s.now(), 'Observation cannot be in the future.', 400);
    const origin = this.s.mode === 'simulation' ? 'simulation' : b.origin ?? 'operator';
    requireThat(['operator', 'instrument', 'model', 'simulation'].includes(origin) && !(this.s.mode === 'operational' && origin === 'simulation'), 'Invalid evidence origin.', 400);
    if (b.value !== null) {
      if (['color', 'ripeness'].includes(b.attribute)) text(b.value, 'Value');else number(b.value, 'Value');
    }
    const usability = b.value === null ? 'missing' : b.usability ?? 'valid';
    requireThat(['valid', 'missing', 'invalid', 'expired', 'outside_validated_domain'].includes(usability), 'Invalid usability.', 400);
    if (b.uncertainty) {
      if (b.uncertainty.confidence !== undefined) {
        number(b.uncertainty.confidence, 'Confidence', 0);
        requireThat(b.uncertainty.confidence <= 1, 'Confidence must be <= 1.', 400);
      }
      number(b.uncertainty.lower, 'Lower uncertainty');
      number(b.uncertainty.upper, 'Upper uncertainty');
      requireThat(typeof b.value === 'number', 'Numeric uncertainty requires a numeric observation.', 400);
      requireThat(b.uncertainty.lower <= b.value && b.uncertainty.upper >= b.value, 'Uncertainty must contain the value.', 400);
    }
    if (b.calibrationId) this.s.get('calibrations', a.orgId, b.calibrationId);
    if (origin === 'instrument') requireThat(b.calibrationId, 'Instrument evidence requires calibration.');
    if (origin === 'model') {
      this.s.get('models', a.orgId, b.modelId);
      requireThat(b.domain, 'Model evidence requires domain.');
    }
    for (const id of b.evidenceIds ?? []) requireThat(this.s.one('SELECT id FROM evidence_files WHERE org_id=? AND id=?', a.orgId, id), 'Evidence not found.', 404);
    if (b.supersedesId) this.s.get('observations', a.orgId, b.supersedesId);
    return this.s.add('observations', a, {
      ...b,
      origin,
      observedAt,
      receivedAt: this.s.now(),
      operatorId: a.id
    }, usability);
  }
  spec(a: Actor, b: any) {
    permit(a, 'quality');
    text(b.name, 'Name');
    text(b.intendedUse, 'Intended use');
    requireThat(Array.isArray(b.rules) && b.rules.length, 'Specification rules are required.', 400);
    for (const r of b.rules) {
      requireThat(attributes.includes(r.attribute) && units[r.attribute]?.includes(r.unit), 'Invalid attribute or unit.', 400);
      text(r.basis, 'Basis');
      number(r.maxAgeHours, 'Maximum age', 0);
      if (!r.categories) {
        number(r.min, 'Minimum');
        number(r.max, 'Maximum');
        requireThat(r.min <= r.max, 'Minimum exceeds maximum.', 400);
      }
    }
    const spec = b.specificationId ? this.s.get('specifications', a.orgId, b.specificationId) : this.s.add('specifications', a, {
      name: b.name
    }, 'draft');
    return this.s.add('specification_versions', a, {
      ...b,
      specificationId: spec.id,
      origin: this.s.mode
    }, 'draft');
  }
  approveSpec(a: Actor, id: string, b: any) {
    permit(a, 'quality');
    const v = this.s.get('specification_versions', a.orgId, id);
    requireThat(v.status === 'draft', 'Only draft specifications can be approved.');
    text(b.reason, 'Approval reason');
    return this.s.update('specification_versions', a, id, b.expectedRevision, {
      approvedBy: a.id,
      reason: b.reason
    }, 'approved');
  }
  usable(a: Actor, o: any, maxAgeHours = 24) {
    if (o.status !== 'valid') return o.status;
    if (Date.parse(o.observedAt) + maxAgeHours * 3600000 < this.s.clock().getTime()) return 'expired';
    if (o.calibrationId) {
      const c = this.s.get('calibrations', a.orgId, o.calibrationId);
      if (c.status !== 'approved' || Date.parse(c.expiresAt) <= this.s.clock().getTime()) return 'expired calibration';
    }
    if (o.modelId) {
      const m = this.s.get('models', a.orgId, o.modelId);
      if (m.status !== 'approved' || !m.lastEvaluationAt || Date.parse(m.lastEvaluationAt) + m.monitoringPolicy.maxAgeHours * 3600000 < this.s.clock().getTime() || JSON.stringify(m.domain) !== JSON.stringify(o.domain)) return 'outside validated domain';
    }
    return 'valid';
  }
  model(a: Actor, id: string | undefined, action: string | undefined, b: any) {
    permit(a, 'quality');
    if (!id) {
      text(b.name, 'Name');
      text(b.domain, 'Declared domain');
      requireThat(b.monitoringPolicy, 'Monitoring policy is required.');
      number(b.monitoringPolicy.maxError, 'Maximum error', 0);
      number(b.monitoringPolicy.minCoverage, 'Minimum interval coverage', 0);
      requireThat(b.monitoringPolicy.minCoverage <= 1, 'Coverage must be <= 1.', 400);
      number(b.monitoringPolicy.maxAgeHours, 'Maximum evaluation age', 0.01);
      return this.s.add('models', a, {
        ...b,
        origin: this.s.mode
      }, 'draft');
    }
    const model = this.s.get('models', a.orgId, id);
    if (action === 'evaluate') {
      requireThat(Array.isArray(b.pairs) && b.pairs.length, 'Paired prediction/reference observations are required.', 400);
      const seen = new Set<string>();
      let maxError = 0,
        covered = 0;
      for (const pair of b.pairs) {
        requireThat(!seen.has(pair.predictionId), 'Repeated predictions cannot inflate replication.', 400);
        seen.add(pair.predictionId);
        const prediction = this.s.get('observations', a.orgId, pair.predictionId),
          reference = this.s.get('observations', a.orgId, pair.referenceId);
        requireThat(prediction.modelId === id && !reference.modelId && prediction.lotId === reference.lotId && prediction.attribute === reference.attribute && prediction.unit === reference.unit && prediction.basis === reference.basis && prediction.scope === reference.scope && prediction.sampleId === reference.sampleId && prediction.itemId === reference.itemId, 'Prediction/reference pairing is invalid.');
        requireThat(this.usable(a, reference, model.monitoringPolicy.maxAgeHours) === 'valid' && typeof reference.value === 'number' && typeof prediction.value === 'number', 'Pair must contain valid numeric values.');
        maxError = Math.max(maxError, Math.abs(prediction.value - reference.value));
        if (prediction.uncertainty && reference.value >= prediction.uncertainty.lower && reference.value <= prediction.uncertainty.upper) covered++;
      }
      const coverage = covered / b.pairs.length,
        passed = maxError <= model.monitoringPolicy.maxError && coverage >= model.monitoringPolicy.minCoverage;
      this.s.add('evaluations', a, {
        name: model.name + ' monitoring',
        modelId: id,
        pairs: b.pairs,
        maxError,
        coverage,
        policy: model.monitoringPolicy,
        origin: this.s.mode
      }, passed ? 'passed' : 'failed');
      return this.s.update('models', a, id, b.expectedRevision, {
        lastEvaluationAt: this.s.now(),
        maxError,
        coverage
      }, passed ? 'approved' : 'suspended');
    }
    requireThat(action === 'suspend', 'Unknown model action.', 404);
    return this.s.update('models', a, id, b.expectedRevision, {
      reason: text(b.reason, 'Suspension reason')
    }, 'suspended');
  }
  classify(a: Actor, b: any) {
    permit(a, 'quality');
    requireThat(['lot', 'sample', 'item'].includes(b.scope ?? 'lot'), 'Invalid decision scope.', 400);
    if (b.scope === 'sample') {
      const sample = this.s.get('samples', a.orgId, b.sampleId);
      requireThat(sample.lotId === b.lotId, 'Sample belongs to another lot.');
    }
    const lot = this.s.get('lots', a.orgId, b.lotId),
      spec = this.s.get('specification_versions', a.orgId, b.specificationVersionId);
    requireThat(spec.status === 'approved', 'An approved specification is required.');
    const observations = this.s.list('observations', a.orgId).filter(o => o.lotId === lot.id);
    const superseded = new Set(observations.map(o => o.supersedesId));
    let result = 'suitable';
    const reasons: any[] = [],
      inputs: any[] = [];
    for (const rule of spec.rules) {
      const o = observations.find(o => !superseded.has(o.id) && o.attribute === rule.attribute && o.scope === (b.scope ?? 'lot') && (!b.sampleId || o.sampleId === b.sampleId));
      let reason = 'within specification',
        state = 'suitable';
      if (!o) {
        reason = 'missing decisive evidence';
        state = 'review';
      } else {
        inputs.push(o);
        const usable = this.usable(a, o, rule.maxAgeHours);
        if (usable !== 'valid' || o.unit !== rule.unit || o.basis !== rule.basis) {
          reason = usable === 'valid' ? 'unit or basis mismatch' : usable;
          state = 'review';
        } else if (rule.categories) {
          if (!rule.categories.includes(o.value)) {
            reason = 'category outside specification';
            state = 'unsuitable';
          }
        } else if (!o.uncertainty) {
          reason = 'missing uncertainty';
          state = 'review';
        } else if (o.uncertainty.lower < rule.min || o.uncertainty.upper > rule.max) {
          reason = 'uncertainty interval exceeds specification';
          state = 'unsuitable';
        }
      }
      if (state === 'unsuitable' || state === 'review' && result !== 'unsuitable') result = state;
      reasons.push({
        attribute: rule.attribute,
        result: state,
        reason,
        observationId: o?.id
      });
    }
    if (spec.commodity && spec.commodity !== lot.commodity) {
      result = 'review';
      reasons.push({
        reason: 'Commodity outside specification domain'
      });
    }
    return this.s.add('quality_decisions', a, {
      lotId: lot.id,
      specificationVersionId: spec.id,
      scope: b.scope ?? 'lot',
      sampleId: b.sampleId ?? null,
      reasons,
      inputs,
      origin: this.s.mode
    }, result);
  }
}
