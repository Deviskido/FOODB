import { Store } from '../db';
import { type Actor, requireThat, mass, text } from '../../shared/contracts';
import { permit } from '../../shared/permissions';
export class Inventory {
  constructor(public s: Store) {}
  stock(a: Actor, id: string) {
    this.s.get('lots', a.orgId, id);
    const onHand = this.s.one('SELECT coalesce(sum(quantity_mg),0) n FROM inventory_events WHERE org_id=? AND lot_id=?', a.orgId, id).n;
    const reserved = this.s.one("SELECT coalesce(sum(quantity_mg),0) n FROM reservations WHERE org_id=? AND lot_id=? AND status='active'", a.orgId, id).n;
    return {
      onHandMg: onHand,
      reservedMg: reserved,
      availableMg: onHand - reserved
    };
  }
  ancestors(a: Actor, id: string): string[] {
    return this.s.all('WITH RECURSIVE ancestors(id) AS (SELECT ? UNION SELECT e.parent_id FROM lot_edges e JOIN ancestors x ON e.child_id=x.id WHERE e.org_id=?) SELECT id FROM ancestors', id, a.orgId).map(x => x.id);
  }
  descendants(a: Actor, id: string): string[] {
    return this.s.all('WITH RECURSIVE descendants(id) AS (SELECT ? UNION SELECT e.child_id FROM lot_edges e JOIN descendants x ON e.parent_id=x.id WHERE e.org_id=?) SELECT id FROM descendants', id, a.orgId).map(x => x.id);
  }
  holds(a: Actor, id: string) {
    const ancestry = this.ancestors(a, id);
    return this.s.list('holds', a.orgId).filter(h => h.status === 'active' && ancestry.includes(h.lotId));
  }
  eligible(a: Actor, id: string) {
    requireThat(!this.holds(a, id).length, 'This material or an ancestor is on hold.');
  }
  move(a: Actor, id: string, quantity: number, kind: string, reference: string, location?: string) {
    this.s.get('lots', a.orgId, id);
    requireThat(Number.isSafeInteger(quantity), 'Quantity must be integer milligrams.', 400);
    requireThat(Number.isSafeInteger(this.stock(a, id).onHandMg + quantity), 'Stock exceeds supported integer precision.');
    if (quantity < 0) requireThat(this.stock(a, id).availableMg >= -quantity, 'Insufficient available stock.');
    if (location) this.s.get('locations', a.orgId, location);
    this.s.run('INSERT INTO inventory_events VALUES(?,?,?,?,?,?,?,?)', a.orgId, crypto.randomUUID(), id, kind, quantity, location ?? null, reference, this.s.now());
    const lot = this.s.get('lots', a.orgId, id);
    this.s.update('lots', a, id, lot.revision, location ? {
      locationId: location
    } : {});
  }
  receive(a: Actor, b: any) {
    permit(a, 'quality', 'robotics');
    text(b.name, 'Lot name');
    const quantity = mass(b.quantityMg);
    if (b.supplierId) this.s.get('suppliers', a.orgId, b.supplierId);
    if (b.locationId) this.s.get('locations', a.orgId, b.locationId);
    requireThat(b.origin === this.s.mode || b.origin === undefined, 'Origin does not match application mode.', 400);
    const lot = this.s.add('lots', a, {
      ...b,
      origin: this.s.mode,
      commodity: b.commodity ?? 'tomato',
      provenance: b.provenance ?? 'unknown'
    }, 'received');
    this.move(a, lot.id, quantity, 'receive', lot.id, b.locationId);
    return this.s.get('lots', a.orgId, lot.id);
  }
  hold(a: Actor, b: any) {
    this.s.get('lots', a.orgId, b.lotId);
    const reason = text(b.reason, 'Reason');
    requireThat(['safety', 'identity', 'quality', 'equipment', 'withdrawal', 'reconciliation'].includes(b.kind ?? 'quality'), 'Invalid hold kind.', 400);
    return this.s.add('holds', a, {
      lotId: b.lotId,
      reason,
      kind: b.kind === 'safety' ? 'safety' : (permit(a, 'quality', 'robotics', 'safety'), b.kind ?? 'quality')
    }, 'active');
  }
  release(a: Actor, id: string, b: any) {
    const h = this.s.get('holds', a.orgId, id);
    permit(a, ...(h.kind === 'safety' || h.kind === 'withdrawal' ? ['safety' as const] : ['quality' as const, 'robotics' as const, 'safety' as const]));
    text(b.reason, 'Release reason');
    requireThat(h.status === 'active', 'Hold is already released.', 409);
    return this.s.update('holds', a, id, b.expectedRevision, {
      releaseReason: b.reason,
      releasedAt: this.s.now()
    }, 'released');
  }
  adjust(a: Actor, id: string, b: any) {
    permit(a, 'robotics');
    this.eligible(a, id);
    requireThat(this.s.get('lots', a.orgId, id).revision === b.expectedRevision, 'Refresh this lot before reconciliation.', 409);
    text(b.reason, 'Reason');
    requireThat(Array.isArray(b.evidenceIds) && b.evidenceIds.length, 'Reconciliation evidence is required.');
    for (const e of b.evidenceIds) requireThat(this.s.one('SELECT id FROM evidence_files WHERE org_id=? AND id=?', a.orgId, e), 'Evidence not found.', 404);
    const n = Number(b.quantityMg);
    requireThat(Number.isSafeInteger(n) && n !== 0, 'Quantity must be nonzero integer milligrams.', 400);
    this.move(a, id, n, b.kind === 'dispose' ? 'dispose' : 'adjust', b.reason);
    return this.stock(a, id);
  }
  lineage(a: Actor, b: any) {
    permit(a, 'robotics');
    requireThat(Array.isArray(b.inputs) && b.inputs.length, 'Inputs are required.', 400);
    requireThat(new Set(b.inputs.map((x: any) => x.lotId)).size === b.inputs.length, 'Duplicate input lot.', 400);
    const total = b.inputs.reduce((n: number, x: any) => n + mass(x.quantityMg), 0);
    const output = mass(b.quantityMg),
      loss = b.lossMg ?? 0;
    requireThat(Number.isSafeInteger(total), 'Total mass exceeds integer precision.');
    requireThat(Number.isSafeInteger(loss) && loss >= 0 && output + loss === total, 'Input, output and processing loss must balance.');
    for (const x of b.inputs) {
      this.eligible(a, x.lotId);
      requireThat(this.stock(a, x.lotId).availableMg >= x.quantityMg, 'Insufficient available stock.');
    }
    const lot = this.s.add('lots', a, {
      name: text(b.name, 'Name'),
      commodity: 'tomato',
      origin: this.s.mode
    }, 'received');
    for (const x of b.inputs) {
      this.move(a, x.lotId, -x.quantityMg, 'transform', lot.id);
      this.s.run('INSERT INTO lot_edges VALUES(?,?,?,?)', a.orgId, x.lotId, lot.id, x.quantityMg);
    }
    this.move(a, lot.id, total, 'receive', lot.id);
    if (loss) this.move(a, lot.id, -loss, 'processing_loss', lot.id);
    this.s.audit(a, 'lineage.processing_loss', lot.id, String(loss));
    return this.s.get('lots', a.orgId, lot.id);
  }
  reserve(a: Actor, lotId: string, batchId: string, quantity: number) {
    this.eligible(a, lotId);
    requireThat(this.stock(a, lotId).availableMg >= quantity, 'Insufficient available stock.');
    this.s.run('INSERT INTO reservations VALUES(?,?,?,?,?,?,?)', a.orgId, crypto.randomUUID(), lotId, batchId, mass(quantity), 'active', this.s.now());
  }
}
