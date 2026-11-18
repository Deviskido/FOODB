# Operations

> This reference originally describes the Bun extension. The dependency-free Node MVP runs with `npm run start:mvp`, stores data in `mvp-data`, and uses `npm run backup:mvp -- <source> <snapshot>` / `npm run restore:mvp -- <snapshot> <new-directory> <latest-deletion-journal>`. Its owner recovery confirmation is available directly in the MVP screen. See [MVP.md](MVP.md) for the current primary workflow.

## Configuration and storage

| Variable | Default | Purpose |
| --- | --- | --- |
| `APP_MODE` | `operational` | `operational` or `simulation`; persisted in database metadata and checked at startup |
| `APP_DATA_DIR` | `./data` / `./demo-data` | Database, evidence files, deletion control journal |
| `PORT` | `3000` / `3001` | Loopback listener |
| `NODE_ENV` | unset | Set `development` for Bun development behavior |

Use a separate directory for every instance. SQLite uses foreign keys, WAL and synchronous FULL. The process opens a `server.lock` file. A normal Ctrl+C removes it. After a crash, verify that the process has stopped before removing a stale lock. Never remove a live process's lock.

The database and attachments are local files. Keep the directory accessible only to authorized OS users; the application does not claim encrypted storage or tamper-proof audit against the operating-system owner.

## Roles

- Owner: accounts, organizations, retention, export, devices, recovery. This role alone cannot release safety holds.
- Quality: receiving, measurement evidence, calibration, specifications, classification, model monitoring, product approval.
- Robotics: stock reconciliation, lineage, routing, operational holds.
- Chef: recipe versions, adaptation proposals/approvals, production deviation review.
- Kitchen: execute approved batches and record actual outcomes.
- Commercial: entitlements, explicit content-use grants, usage, disputes, costs.
- Delivery: products, allocations, packaging, dispatch, delivery, complaints.
- Safety: safety/withdrawal disposition and corrective action.
- Viewer: operational summaries without private recipe access.

Any member may report a safety concern. Only the safety role can release it. Holds propagate through lot ancestry; quality approval cannot clear them.

Accounts use opaque, hashed-at-rest sessions, HttpOnly SameSite=Strict cookies, 30-minute idle timeout, and eight-hour absolute timeout. Password changes and disabling/deleting an account invalidate sessions. Local HTTP cookies are intentionally not marked Secure; this application is not configured for remote deployment.

## Backup and recovery

1. Stop the application. Choose a new snapshot directory.
2. Run `bun run backup <data-directory> <new-snapshot-directory>`.
3. Preserve the snapshot and its checksum manifest. Keep the **latest** `<data-directory>/control/deletions.json` outside older snapshots.
4. Restore with `bun run restore <snapshot> <new-data-directory> <latest-deletions.json>`.
5. Start the restored instance using `APP_DATA_DIR=<new-data-directory> bun run start`.
6. Sign in as an existing owner. Verify stock, lineage, evidence and holds. Other roles cannot access a held recovery workspace.
7. Submit `POST /api/v1/recovery/release` with a reconciliation reason through the owner session. Use the owner recovery confirmation form on the Node MVP or React MVP screen, or this endpoint from an API client.

Restore verifies every manifest checksum, invalidates human/device sessions, replays account deletion instructions, and sets the recovery hold. It never overwrites an existing directory. Backup uses a consistent SQLite `VACUUM INTO` snapshot and copies referenced evidence. Missing/corrupt files fail recovery. Data newer than the snapshot is not restored.

Deletion keeps referenced operational/audit records, disables the account, and pseudonymizes the user's direct identity fields. Free-text business records are not automatically scanned/redacted; broader personal-data deletion requires a reviewed workflow. Shared multi-organization accounts cannot be deleted by a single organization owner.

## Error handling

Responses use `{data}` or `{error:{code,message}}`. Mutations carry a fresh `Idempotency-Key`; retry the same operation with the same key and body. Reuse with a different body returns 409. Changing an existing record requires its `expectedRevision`; refresh after a stale-revision response.

A lost routing outcome must be reconciled; do not blindly resend an uncertain physical command. Late confirmed facts are recorded once even when a new hold exists; the hold is preserved.

Do not substitute an ingredient or overwrite a version to repair a failed production attempt. Regenerate stale adaptations, cancel unused reservations explicitly, or record and review a deviation on started work.

## Acceptance still required

Run native Bun typecheck/tests/build/load test and browser workflows against the compiled output. Verify desktop/mobile layouts and light/dark themes. Windows launcher execution and a native restore rehearsal remain unverified in this environment. The implementation coverage document lists outstanding product capabilities separately from these verification tasks.
