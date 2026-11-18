import { Database } from '../src/server/sqlite';
import { mkdirSync, existsSync, readFileSync, copyFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { hash,requireThat } from '../src/shared/contracts';
export function restore(snapshot: string, destination: string, journalPath: string) {
  snapshot = resolve(snapshot);
  destination = resolve(destination);
  requireThat(!existsSync(destination), 'Restore destination must be a new directory.');
  requireThat(existsSync(journalPath), 'The latest deletion journal is required.');
  const journal = JSON.parse(readFileSync(journalPath, 'utf8'));
  requireThat(Array.isArray(journal), 'Invalid deletion journal.');
  const manifest = JSON.parse(readFileSync(join(snapshot, 'manifest.json'), 'utf8'));
  requireThat(Array.isArray(manifest.files) && manifest.files.some((f: any) => f.path === 'app.sqlite'), 'Invalid snapshot manifest.');
  for (const file of manifest.files) {
    requireThat(file.path === 'app.sqlite' || /^evidence\/[a-f0-9-]{36}$/.test(file.path), 'Invalid manifest path.');
    const digest = hash(new Uint8Array(readFileSync(join(snapshot, file.path))));
    requireThat(digest === file.checksum, 'Snapshot checksum verification failed.');
  }
  mkdirSync(join(destination, 'evidence'), {
    recursive: true,
    mode: 0o700
  });
  mkdirSync(join(destination, 'control'), {
    mode: 0o700
  });
  for (const file of manifest.files) copyFileSync(join(snapshot, file.path), join(destination, file.path));
  const db = new Database(join(destination, 'app.sqlite'));
  try {
    requireThat((db.query('PRAGMA integrity_check').get() as any).integrity_check === 'ok', 'Database integrity check failed.');
    db.transaction(() => {
      db.run('DELETE FROM sessions');
      db.run('UPDATE devices SET token=NULL');
      for (const deletion of journal) {
        requireThat(typeof deletion.userId === 'string', 'Invalid deletion instruction.');
        db.run("UPDATE users SET name='Deleted user',email=?,password='',disabled=1 WHERE id=?", 'deleted:' + deletion.userId, deletion.userId);
      }
      db.run("INSERT OR REPLACE INTO metadata VALUES('recovery','held')");
    })();
    writeFileSync(join(destination, 'control', 'deletions.json'), JSON.stringify(journal, null, 2));
    return {
      restored: true,
      recoveryHold: true,
      destination
    };
  } finally {
    db.close();
  }
}
if (import.meta.main) {
  const [snapshot, destination, journal] = process.argv.slice(2);
  if (!snapshot || !destination || !journal) throw new Error('Usage: bun run restore <snapshot> <new-data-directory> <latest-deletion-journal>');
  console.log(restore(snapshot, destination, journal));
}
