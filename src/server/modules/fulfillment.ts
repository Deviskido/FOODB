import { Store } from '../db';
import { Inventory } from './inventory';
import { type Actor, requireThat, text, mass, number } from '../../shared/contracts';
import { permit } from '../../shared/permissions';
export class Fulfillment {
  public inv: Inventory;
  public s: Store;
  constructor(s: Store, inv: Inventory) {
    this.s = s;
    this.inv = inv;
  }
  product(a: Actor, b: any) {
    permit(a, 'delivery', 'chef');
    text(b.name, 'Name');
    number(b.minTemperatureC, 'Minimum temperature');
    number(b.maxTemperatureC, 'Maximum temperature');
    requireThat(b.minTemperatureC <= b.maxTemperatureC, 'Temperature range is inverted.', 400);
    number(b.maxTransitMinutes, 'Maximum transit time', 1);
    text(b.packaging, 'Packaging');
    const p = this.s.add('products', a, {
      name: b.name
    }, 'active');
    return this.s.add('product_versions', a, {
      ...b,
      productId: p.id,
      origin: this.s.mode
    }, 'draft');
  }
  order(a: Actor, b: any) {
    permit(a, 'delivery');
    const p = this.s.get('product_versions', a.orgId, b.productVersionId);
    requireThat(p.status === 'approved', 'An approved product version is required.');
    mass(b.quantityMg);
    return this.s.add('orders', a, {
      name: text(b.name, 'Order reference'),
      productVersionId: p.id,
      quantityMg: b.quantityMg,
      origin: this.s.mode
    }, 'draft');
  }
  allocate(a: Actor, id: string, b: any) {
    permit(a, 'delivery');
    const order = this.s.get('orders', a.orgId, id),
      batch = this.s.get('production_batches', a.orgId, b.batchId);
    requireThat(['draft', 'allocated'].includes(order.status), 'Order can no longer be allocated.');
    requireThat(order.revision === b.expectedRevision, 'Refresh this order.', 409);
    requireThat(batch.status === 'completed', 'Only completed production can be allocated.');
    this.inv.eligible(a, batch.finishedLotId);
    const quantity = mass(b.quantityMg),
      orderAllocated = this.s.one('SELECT coalesce(sum(quantity_mg),0) n FROM order_allocations WHERE org_id=? AND order_id=?', a.orgId, id).n;
    requireThat(orderAllocated + quantity <= order.quantityMg, 'Allocation exceeds order quantity.');
    this.inv.reserve(a, batch.finishedLotId, 'order:' + id, quantity);
    this.s.run('INSERT INTO order_allocations VALUES(?,?,?,?,?)', a.orgId, crypto.randomUUID(), id, batch.id, quantity);
    return this.s.update('orders', a, id, order.revision, {}, 'allocated');
  }
  check(a: Actor, o: any) {
    const allocations = this.s.all('SELECT * FROM order_allocations WHERE org_id=? AND order_id=?', a.orgId, o.id);
    requireThat(allocations.reduce((n, x) => n + x.quantity_mg, 0) === o.quantityMg, 'Allocate the full order quantity first.');
    for (const x of allocations) {
      const batch = this.s.get('production_batches', a.orgId, x.batch_id);
      this.inv.eligible(a, batch.finishedLotId);
    }
    return allocations;
  }
  transition(a: Actor, id: string, action: string, b: any) {
    permit(a, 'delivery');
    const o = this.s.get('orders', a.orgId, id);
    requireThat(o.revision === b.expectedRevision, 'Refresh this order.', 409);
    this.check(a, o);
    const p = this.s.get('product_versions', a.orgId, o.productVersionId);
    if (action === 'ready') {
      requireThat(o.status === 'allocated', 'Order is not allocated.');
      text(b.packaging, 'Packaging confirmation');
      requireThat(b.packaging === p.packaging, 'Packaging does not match product requirements.');
      return this.s.update('orders', a, id, o.revision, {
        packaging: b.packaging
      }, 'ready');
    }
    requireThat(action === 'dispatch' && o.status === 'ready', 'Order is not ready.');
    const allocations = this.check(a, o);
    this.s.run("UPDATE reservations SET status='consumed' WHERE org_id=? AND batch_id=?", a.orgId, 'order:' + id);
    for (const x of allocations) {
      const batch = this.s.get('production_batches', a.orgId, x.batch_id);
      this.inv.move(a, batch.finishedLotId, -x.quantity_mg, 'dispatch', id);
    }
    return this.s.update('orders', a, id, o.revision, {
      dispatchedAt: this.s.now()
    }, 'dispatched');
  }
  delivery(a: Actor, id: string, b: any) {
    permit(a, 'delivery');
    const o = this.s.get('orders', a.orgId, id);
    requireThat(o.status === 'dispatched', 'Order has not been dispatched.');
    const p = this.s.get('product_versions', a.orgId, o.productVersionId);
    const temperature = number(b.temperatureC, 'Arrival temperature'),
      elapsed = (this.s.clock().getTime() - Date.parse(o.dispatchedAt)) / 60000;
    const allocations = this.s.all('SELECT * FROM order_allocations WHERE org_id=? AND order_id=?', a.orgId, id);
    const held = allocations.some(x => this.inv.holds(a, this.s.get('production_batches', a.orgId, x.batch_id).finishedLotId).length);
    const accepted = !held && temperature >= p.minTemperatureC && temperature <= p.maxTemperatureC && elapsed <= p.maxTransitMinutes && b.packagingIntact === true;
    this.s.run('INSERT INTO delivery_events VALUES(?,?,?,?,?)', a.orgId, crypto.randomUUID(), id, JSON.stringify({
      ...b,
      elapsedMinutes: elapsed,
      accepted
    }), this.s.now());
    return this.s.update('orders', a, id, b.expectedRevision, {
      arrival: b,
      accepted,
      deliveredAt: this.s.now()
    }, accepted ? 'delivered' : 'held');
  }
  withdraw(a: Actor, b: any) {
    permit(a, 'safety');
    text(b.reason, 'Withdrawal reason');
    this.s.get('lots', a.orgId, b.lotId);
    const lots = this.inv.descendants(a, b.lotId),
      batches = this.s.all('SELECT * FROM production_inputs WHERE org_id=?', a.orgId).filter(i => lots.includes(i.lot_id)).map(i => i.batch_id);
    const orders = this.s.all('SELECT * FROM order_allocations WHERE org_id=?', a.orgId).filter(i => batches.includes(i.batch_id)).map(i => i.order_id);
    this.inv.hold(a, {
      lotId: b.lotId,
      kind: 'withdrawal',
      reason: b.reason
    });
    return this.s.add('withdrawals', a, {
      ...b,
      lots,
      batches: [...new Set(batches)],
      orders: [...new Set(orders)],
      actions: []
    }, 'active');
  }
}
