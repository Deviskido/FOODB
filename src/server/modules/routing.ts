import { Store } from '../db';
import { Inventory } from './inventory';
import { type Actor, requireThat, mass, text } from '../../shared/contracts';
import { permit } from '../../shared/permissions';
export class Routing {
  constructor(public s: Store, public inv: Inventory) {}
  command(a: Actor, b: any) {
    permit(a, 'robotics');
    this.inv.eligible(a, b.lotId);
    const lot = this.s.get('lots', a.orgId, b.lotId);
    this.s.get('locations', a.orgId, b.destinationId);
    requireThat(lot.locationId && lot.locationId !== b.destinationId, 'Choose a different destination.');
    requireThat(!this.s.list('routing_commands', a.orgId).some(c => c.lotId === lot.id && ['queued', 'acknowledged', 'uncertain'].includes(c.status)), 'An unresolved routing command already exists.');
    requireThat(this.inv.stock(a, lot.id).reservedMg === 0, 'Reserved material cannot be routed.');
    return this.s.add('routing_commands', a, {
      lotId: lot.id,
      sourceId: lot.locationId,
      destinationId: b.destinationId,
      quantityMg: mass(b.quantityMg),
      origin: this.s.mode
    }, 'queued');
  }
  outcome(a: Actor, id: string, b: any) {
    permit(a, 'robotics');
    const c = this.s.get('routing_commands', a.orgId, id);
    if (c.status === 'confirmed' || c.status === 'reconciled') return c;
    requireThat(['confirmed', 'failed', 'unknown'].includes(b.outcome), 'Invalid outcome.', 400);
    requireThat(b.materialId === c.lotId && b.sourceId === c.sourceId && b.destinationId === c.destinationId, 'Physical identity does not match the command.');
    if (b.outcome === 'confirmed') {
      const lot = this.s.get('lots', a.orgId, c.lotId);
      requireThat(lot.locationId === c.sourceId, 'Source no longer matches; reconcile physical identity.');
      requireThat(c.quantityMg === this.inv.stock(a, lot.id).onHandMg, 'Whole-lot routing requires the exact physical quantity. Split first.');
      this.inv.move(a, lot.id, 0, 'transfer', c.id, c.destinationId);
    } else if (b.outcome === 'unknown') this.inv.hold(a, {
      lotId: c.lotId,
      kind: 'reconciliation',
      reason: 'Unknown physical routing outcome'
    });
    return this.s.update('routing_commands', a, id, c.revision, {
      outcomeAt: this.s.now()
    }, b.outcome === 'unknown' ? 'uncertain' : b.outcome);
  }
  reconcile(a: Actor, id: string, b: any) {
    permit(a, 'robotics');
    const c = this.s.get('routing_commands', a.orgId, id);
    requireThat(c.status === 'uncertain', 'Only uncertain commands need reconciliation.');
    text(b.reason, 'Reconciliation reason');
    requireThat(b.expectedRevision === c.revision, 'Refresh this command.', 409);
    return this.outcome(a, id, {
      ...c,
      ...b,
      materialId: c.lotId
    });
  }
}
