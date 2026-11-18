import { requireThat } from '../shared/contracts';
export function scenarioEvents(name: string, options: {
  deviceId: string;
  lotId?: string;
  commandId?: string;
  sourceId?: string;
  destinationId?: string;
  runId: string;
  now: string;
}) {
  const base = {
    schemaVersion: 1,
    deviceId: options.deviceId,
    occurredAt: options.now,
    correlationId: options.runId
  };
  const envelope = (kind: string, payload: any, subjectId = options.lotId ?? options.deviceId, index = 0) => ({
    ...base,
    eventId: options.runId + ':' + index,
    kind,
    subjectId,
    payload
  });
  if (name === 'disconnect') return [];
  if (name === 'happy') return [envelope('heartbeat', {})];
  if (name === 'duplicate') {
    const event = envelope('heartbeat', {});
    return [event, event];
  }
  requireThat(options.lotId, 'Set SIMULATOR_LOT_ID for this scenario.');
  if (name === 'fault') return [envelope('fault', {
    reason: 'Simulated equipment fault'
  })];
  if (name === 'stale-calibration') return [envelope('observation', {
    lotId: options.lotId,
    attribute: 'ssc_brix',
    value: 5,
    unit: '°Bx',
    basis: 'fresh weight',
    method: 'simulated expired calibration',
    scope: 'lot',
    usability: 'expired',
    uncertainty: {
      kind: 'interval',
      lower: 4.9,
      upper: 5.1
    }
  })];
  requireThat(['late', 'identity-loss'].includes(name), 'Unknown scenario.');
  requireThat(options.commandId && options.sourceId && options.destinationId, 'Set SIMULATOR_COMMAND_ID, SIMULATOR_SOURCE_ID and SIMULATOR_DESTINATION_ID.');
  const outcome = {
    commandId: options.commandId,
    materialId: options.lotId,
    sourceId: options.sourceId,
    destinationId: options.destinationId,
    outcome: name === 'identity-loss' ? 'unknown' : 'confirmed'
  };
  if (name === 'identity-loss') return [envelope('routing_outcome', outcome)];
  return [envelope('routing_ack', {
    commandId: options.commandId
  }), envelope('fault', {
    reason: 'Simulated concern before late physical outcome'
  }, options.lotId, 1), envelope('routing_outcome', outcome, options.lotId, 2), envelope('routing_outcome', outcome, options.lotId, 2)];
}
