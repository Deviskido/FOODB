import { scenarioEvents } from './scenarios';
const base = process.env.SIMULATOR_URL ?? 'http://127.0.0.1:3001';
const token = process.env.DEVICE_TOKEN,
  deviceId = process.env.DEVICE_ID;
if (!token || !deviceId) throw new Error('Set DEVICE_TOKEN and DEVICE_ID for a simulation device issued in the demo workspace.');
const health = await fetch(base + '/api/v1/health').then(r => r.json());
if (health.data.mode !== 'simulation') throw new Error('The simulator only connects to a simulation workspace.');
const events = scenarioEvents(process.argv[2] ?? 'happy', {
  deviceId,
  lotId: process.env.SIMULATOR_LOT_ID,
  commandId: process.env.SIMULATOR_COMMAND_ID,
  sourceId: process.env.SIMULATOR_SOURCE_ID,
  destinationId: process.env.SIMULATOR_DESTINATION_ID,
  runId: process.env.SIMULATOR_RUN_ID ?? crypto.randomUUID(),
  now: new Date().toISOString()
});
if (events.length === 0) console.log('Disconnected: no event sent. The device becomes stale after 60 seconds without a heartbeat.');
for (const event of events) {
  const r = await fetch(base + '/api/v1/device-events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(event)
  });
  console.log(r.status, await r.text());
  if (!r.ok) process.exit(1);
}
