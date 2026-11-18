# Device contract v1

Issue a device credential from Administration. It is shown once; only its hash is persisted. Rotate or revoke it through the device record. Device credentials cannot authenticate operator endpoints.

Send `POST /api/v1/device-events` with `Authorization: Bearer <credential>` and JSON:

```json
{
  "eventId": "unique-event-id",
  "schemaVersion": 1,
  "deviceId": "issued-device-id",
  "occurredAt": "2026-11-18T10:00:00Z",
  "kind": "heartbeat",
  "subjectId": "issued-device-id",
  "correlationId": "run-or-command-id",
  "payload": {}
}
```

| Kind | Payload / subject | Effect |
| --- | --- | --- |
| `heartbeat` | device ID | Update last-seen time; UI reports stale after 60 seconds |
| `observation` | Lot ID; ordinary observation fields including `lotId` | Append evidence with received time and device identity |
| `routing_ack` | Lot ID; `{commandId}` | Acknowledge without moving stock |
| `routing_outcome` | Lot ID; `{commandId, materialId, sourceId, destinationId, outcome}` | Outcome is `confirmed`, `failed` or `unknown`; confirm once or place reconciliation hold |
| `fault` | Lot ID; `{reason}` | Preserve an equipment hold |

The same event ID/body returns the original result. The same ID with different content returns 409. Tenant, device, mode, command identity and material must match. Unknown events are rejected rather than accepted as successful no-ops. Operational and simulation instances have separate credentials and databases.

Whole-lot routing is supported. Split a lot before moving a subset. This contract is not a physical robot driver or a safety controller.

## Simulator

Set `DEVICE_TOKEN` and `DEVICE_ID` for a simulation device; `SIMULATOR_URL` defaults to `http://127.0.0.1:3001`.

```sh
bun run simulate happy
bun run simulate duplicate
bun run simulate disconnect
bun run simulate fault
bun run simulate identity-loss
bun run simulate late
bun run simulate stale-calibration
```

For material scenarios set `SIMULATOR_LOT_ID`. For routing scenarios also set `SIMULATOR_COMMAND_ID`, `SIMULATOR_SOURCE_ID`, and `SIMULATOR_DESTINATION_ID` to a queued command's values. `SIMULATOR_RUN_ID` controls deterministic event identities. Reusing a run ID with a different event time/body correctly produces a conflict; reuse exact envelopes to test transport retries.

The late scenario acknowledges, records an equipment concern, then sends a duplicated confirmed outcome. The expired-evidence scenario records an explicitly expired synthetic observation. Neither scenario clears holds or establishes physical validation.
