import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { fixture, lot } from './helpers';
test('acknowledgement never moves material; late duplicated physical outcome records once and retains hold', async () => {
  const f = await fixture();
  try {
    const l = await lot(f),
      dest = await f.call('locations', {
        name: 'Kitchen'
      }),
      device = await f.call('devices', {
        name: 'Simulated conveyor'
      });
    const command = await f.call('routing', {
      lotId: l.id,
      destinationId: dest.id,
      quantityMg: 10000000
    });
    const envelope = {
      eventId: crypto.randomUUID(),
      schemaVersion: 1,
      deviceId: device.id,
      occurredAt: '2026-11-18T10:00:00Z',
      kind: 'routing_ack',
      subjectId: l.id,
      correlationId: command.id,
      payload: {
        commandId: command.id
      }
    };
    const opts = {
      authorization: 'Bearer ' + device.token
    };
    await f.call('device-events', envelope, opts);
    assert.equal((await f.call('lots/' + l.id)).locationId, l.locationId);
    await f.call('holds', {
      lotId: l.id,
      kind: 'safety',
      reason: 'Late concern'
    });
    const outcome = {
      ...envelope,
      eventId: crypto.randomUUID(),
      kind: 'routing_outcome',
      payload: {
        commandId: command.id,
        materialId: l.id,
        sourceId: l.locationId,
        destinationId: dest.id,
        outcome: 'confirmed'
      }
    };
    await f.call('device-events', outcome, opts);
    await f.call('device-events', outcome, opts);
    assert.equal((await f.call('lots/' + l.id)).locationId, dest.id);
    assert.equal((await f.call('inventory'))[0].onHandMg, 10000000);
    assert.equal((await f.call('lineage/' + l.id)).holds.length, 1);
    const exported = await f.call('exports');
    assert.equal(exported.inventory_events.filter((e: any) => e.kind === 'transfer').length, 1);
    assert.equal((await f.raw('device-events', {
      ...outcome,
      payload: {
        ...outcome.payload,
        outcome: 'failed'
      }
    }, opts)).status, 409);
  } finally {
    f.close();
  }
});
