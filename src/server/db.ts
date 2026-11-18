import { Database } from './sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { entities, sql } from './migrations/001-foundation';
import { type Actor, type Mode, type RecordRow, requireThat, AppError } from '../shared/contracts';
export type Entity = typeof entities[number];
export class Store {
  public clock: () => Date;
  public mode: Mode;
  public dataDir: string;
  db: Database;
  constructor(dataDir: string, mode: Mode, clock: () => Date) {
    this.dataDir = dataDir;
    this.mode = mode;
    this.clock = clock;
    mkdirSync(join(dataDir, 'evidence'), {
      recursive: true,
      mode: 0o700
    });
    this.db = new Database(join(dataDir, 'app.sqlite'), {
      create: true
    });
    this.db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;');
    const version = this.one('PRAGMA user_version').user_version;
    requireThat(version <= 1, 'This database requires a newer FOODB version.');
    if (version === 0) this.db.transaction(() => this.db.exec(sql))();
    const existing = this.one('SELECT value FROM metadata WHERE key=?', 'mode');
    requireThat(!existing || existing.value === mode, 'This data directory belongs to a different application mode.');
    this.run('INSERT OR IGNORE INTO metadata VALUES (?,?)', 'mode', mode);
  }
  now() {
    return this.clock().toISOString();
  }
  one(sql: string, ...params: any[]): any {
    return this.db.query(sql).get(...params);
  }
  all(sql: string, ...params: any[]): any[] {
    return this.db.query(sql).all(...params);
  }
  run(sql: string, ...params: any[]) {
    return this.db.query(sql).run(...params);
  }
  tx<T>(fn: () => T): T {
    return this.db.transaction(fn).immediate();
  }
  get(t: Entity, org: string, id: string): any {
    const row = this.one(`SELECT * FROM ${t} WHERE org_id=? AND id=?`, org, id);
    if (!row) throw new AppError(404, 'NOT_FOUND', 'Record not found.');
    return this.unpack(row);
  }
  unpack(row: RecordRow): any {
    const {
      body,
      ...rest
    } = row;
    const publicColumns = Object.fromEntries(Object.entries(rest).filter(([key]) => !key.startsWith('ref_')));
    return {
      ...JSON.parse(body),
      ...publicColumns
    };
  }
  list(t: Entity, org: string) {
    return this.all(`SELECT * FROM ${t} WHERE org_id=? ORDER BY created_at DESC,rowid DESC`, org).map(r => this.unpack(r));
  }
  add(t: Entity, a: Actor, body: any, status = 'draft') {
    const id = crypto.randomUUID();
    this.run(`INSERT INTO ${t}(org_id,id,name,status,body,created_at) VALUES(?,?,?,?,?,?)`, a.orgId, id, body.name ?? body.attribute ?? t, status, JSON.stringify(body), this.now());
    this.audit(a, `${t}.create`, id, body.reason ?? '');
    return this.get(t, a.orgId, id);
  }
  update(t: Entity, a: Actor, id: string, revision: number, patch: any, status?: string) {
    const prev = this.get(t, a.orgId, id);
    requireThat(prev.revision === revision, 'This record changed. Refresh and try again.', 409, 'STALE_REVISION');
    const body = {
      ...prev,
      ...patch
    };
    for (const k of ['org_id', 'id', 'revision', 'created_at', 'status']) delete body[k];
    this.run(`UPDATE ${t} SET body=?,name=?,status=?,revision=revision+1 WHERE org_id=? AND id=? AND revision=?`, JSON.stringify(body), body.name ?? prev.name, status ?? prev.status, a.orgId, id, revision);
    this.audit(a, `${t}.update`, id, patch.reason ?? '');
    return this.get(t, a.orgId, id);
  }
  audit(a: Actor, action: string, target: string, reason = '') {
    this.run('INSERT INTO audit_events VALUES(?,?,?,?,?,?,?,?)', crypto.randomUUID(), a.orgId, a.id, JSON.stringify(a.roles), action, target, String(reason).slice(0, 500), this.now());
  }
  close() {
    this.db.close();
  }
}
