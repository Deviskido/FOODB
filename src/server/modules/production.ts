import { Store } from '../db';
import { Inventory } from './inventory';
import { Recipes } from './recipes';
import { type Actor, requireThat, text, mass } from '../../shared/contracts';
import { permit } from '../../shared/permissions';
export class Production {
  constructor(public s: Store, public inv: Inventory, public recipes: Recipes) {}
  plan(a: Actor, b: any) {
    permit(a, 'kitchen');
    const p = this.s.get('adaptations', a.orgId, b.adaptationId);
    requireThat(p.status === 'approved', 'An approved adaptation is required.');
    requireThat(!this.s.list('production_batches', a.orgId).some(x => x.adaptationId === p.id && x.status !== 'cancelled'), 'This adaptation already has a batch.', 409);
    return this.s.add('production_batches', a, {
      name: b.name ?? p.name,
      adaptationId: p.id,
      origin: this.s.mode
    }, 'approved');
  }
  start(a: Actor, id: string, b: any) {
    permit(a, 'kitchen');
    const batch = this.s.get('production_batches', a.orgId, id);
    if (batch.status === 'in_progress') return batch;
    requireThat(batch.status === 'approved', 'Batch is not approved.');
    requireThat(batch.revision === b.expectedRevision, 'Refresh this batch.', 409);
    const p = this.s.get('adaptations', a.orgId, batch.adaptationId);
    requireThat(p.status === 'approved', 'Adaptation is no longer approved.');
    this.recipes.recheck(a, p);
    const reservations = this.s.all("SELECT * FROM reservations WHERE org_id=? AND batch_id=? AND status='active'", a.orgId, p.id);
    requireThat(reservations.length === p.inputs.length, 'Reservation snapshot is incomplete.');
    for (const i of p.inputs) {
      requireThat(reservations.some(r => r.lot_id === i.lotId && r.quantity_mg === i.quantityMg), 'Reservation changed.');
      this.s.run("UPDATE reservations SET status='consumed' WHERE org_id=? AND batch_id=? AND lot_id=?", a.orgId, p.id, i.lotId);
      this.inv.move(a, i.lotId, -i.quantityMg, 'consume', id);
      this.s.run('INSERT INTO production_inputs VALUES(?,?,?,?)', a.orgId, id, i.lotId, i.quantityMg);
    }
    this.s.run('INSERT INTO usage_events VALUES(?,?,?,?,?)', a.orgId, id, 'production_start', JSON.stringify({
      recipeRef: p.recipeRef
    }), this.s.now());
    this.s.update('adaptations', a, p.id, p.revision, {}, 'executing');
    return this.s.update('production_batches', a, id, batch.revision, {
      instructions: p.instructions,
      startedAt: this.s.now()
    }, 'in_progress');
  }
  event(a: Actor, id: string, b: any) {
    permit(a, 'kitchen');
    const batch = this.s.get('production_batches', a.orgId, id);
    requireThat(batch.status === 'in_progress', 'Production has not started.');
    const step = Number(b.step);
    requireThat(Number.isInteger(step) && step >= 0 && step < batch.instructions.steps.length, 'Choose an existing step.', 400);
    text(b.actual, 'Actual work performed', 2000);
    if (b.deviation) text(b.deviation, 'Deviation', 2000);
    this.s.run('INSERT INTO production_events VALUES(?,?,?,?,?)', a.orgId, crypto.randomUUID(), id, JSON.stringify({
      ...b,
      actor: a.id
    }), this.s.now());
    this.s.audit(a, 'production.step', id, b.deviation ?? '');
    if (b.deviation) return this.s.update('production_batches', a, id, batch.revision, {
      deviation: b.deviation
    }, 'held');
    return batch;
  }
  review(a: Actor, id: string, b: any) {
    permit(a, 'chef');
    const batch = this.s.get('production_batches', a.orgId, id);
    requireThat(batch.status === 'held', 'Only held production needs review.');
    text(b.reason, 'Review reason');
    const inputs = this.s.all('SELECT lot_id FROM production_inputs WHERE org_id=? AND batch_id=?', a.orgId, id);
    for (const input of inputs) this.inv.eligible(a, input.lot_id);
    return this.s.update('production_batches', a, id, b.expectedRevision, {
      reviewReason: b.reason,
      reviewedBy: a.id
    }, 'in_progress');
  }
  complete(a: Actor, id: string, b: any) {
    permit(a, 'kitchen');
    const batch = this.s.get('production_batches', a.orgId, id);
    requireThat(batch.status === 'in_progress', 'Only active production can complete.');
    requireThat(batch.revision === b.expectedRevision, 'Refresh this batch.', 409);
    const inputs = this.s.all('SELECT * FROM production_inputs WHERE org_id=? AND batch_id=?', a.orgId, id);
    for (const i of inputs) this.inv.eligible(a, i.lot_id);
    const steps = new Set(this.s.all('SELECT body FROM production_events WHERE org_id=? AND batch_id=?', a.orgId, id).map(e => JSON.parse(e.body).step));
    requireThat(steps.size === batch.instructions.steps.length, 'Record all actual production steps first.');
    const yieldMg = mass(b.yieldMg),
      total = inputs.reduce((n, x) => n + x.quantity_mg, 0);
    requireThat(yieldMg <= total, 'Yield cannot exceed recorded input mass.');
    const lot = this.s.add('lots', a, {
      name: batch.name + ' finished',
      commodity: 'sauce',
      origin: this.s.mode,
      batchId: id
    }, 'produced');
    for (const i of inputs) this.s.run('INSERT INTO lot_edges VALUES(?,?,?,?)', a.orgId, i.lot_id, lot.id, i.quantity_mg);
    this.inv.move(a, lot.id, total, 'receive', id);
    if (total - yieldMg) this.inv.move(a, lot.id, -(total - yieldMg), 'processing_loss', id);
    return this.s.update('production_batches', a, id, batch.revision, {
      yieldMg,
      lossMg: total - yieldMg,
      finishedLotId: lot.id,
      completedAt: this.s.now(),
      assessment: b.assessment ?? null
    }, 'completed');
  }
  cancel(a: Actor, id: string, b: any) {
    permit(a, 'chef', 'kitchen');
    const batch = this.s.get('production_batches', a.orgId, id);
    requireThat(batch.status === 'approved', 'Started production cannot be silently cancelled.');
    text(b.reason, 'Cancellation reason');
    this.s.run("UPDATE reservations SET status='cancelled' WHERE org_id=? AND batch_id=? AND status='active'", a.orgId, batch.adaptationId);
    const p = this.s.get('adaptations', a.orgId, batch.adaptationId);
    this.s.update('adaptations', a, p.id, p.revision, {}, 'cancelled');
    return this.s.update('production_batches', a, id, b.expectedRevision, {
      reason: b.reason
    }, 'cancelled');
  }
}
