import { Database } from 'bun:sqlite';
import { mkdirSync, existsSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { hash, requireThat } from '../src/shared/contracts';
export function backup(source: string, destination: string) {
  source = resolve(source);
  destination = resolve(destination);
  requireThat(!existsSync(join(source, 'server.lock')), 'Stop the server before creating a backup.');
  requireThat(!existsSync(destination), 'Backup destination must be a new directory.');
  requireThat(existsSync(join(source, 'app.sqlite')), 'Source database does not exist.');
  mkdirSync(destination, {
    recursive: true,
    mode: 0o700
  });
  mkdirSync(join(destination, 'evidence'), {
    mode: 0o700
  });
  const db = new Database(join(source, 'app.sqlite'));
  try {
    db.run('VACUUM INTO ?', join(destination, 'app.sqlite'));
    const files = ['app.sqlite'];
    for (const e of db.query('SELECT id FROM evidence_files').all() as {
      id: string;
    }[]) {
      copyFileSync(join(source, 'evidence', e.id), join(destination, 'evidence', e.id));
      files.push('evidence/' + e.id);
    }
    const manifest = {
      createdAt: new Date().toISOString(),
      files: files.map(path => ({
        path,
        checksum: new Bun.CryptoHasher('sha256').update(readFileSync(join(destination, path))).digest('hex')
      }))
    };
    writeFileSync(join(destination, 'manifest.json'), JSON.stringify(manifest, null, 2));
    return manifest;
  } finally {
    db.close();
  }
}
if (import.meta.main) {
  const [source, destination] = process.argv.slice(2);
  if (!source || !destination) throw new Error('Usage: bun run backup <stopped-data-directory> <new-backup-directory>');
  console.log(backup(source, destination));
}
