// Runtime adapter: domain code and migrations are shared by Bun and the dependency-free Node MVP.
const nativeBun = typeof Bun !== 'undefined';
const Driver: any = nativeBun ? (await import('bun:sqlite')).Database : (await import('node:sqlite')).DatabaseSync;
export class Database {
  private driver: any;
  private depth = 0;
  private statements = new Map<string, any>();
  constructor(path: string, options?: {
    create?: boolean;
  }) {
    this.driver = nativeBun ? new Driver(path, options) : new Driver(path);
  }
  exec(sql: string) {
    return this.driver.exec(sql);
  }
  query(sql: string): any {
    if (nativeBun) return this.driver.query(sql);
    let statement = this.statements.get(sql);
    if (!statement) {
      statement = this.driver.prepare(sql);
      this.statements.set(sql, statement);
    }
    return statement;
  }
  run(sql: string, ...params: any[]) {
    return this.query(sql).run(...params);
  }
  transaction<T>(fn: () => T): (() => T) & {
    immediate: () => T;
  } {
    if (nativeBun) return this.driver.transaction(fn);
    const run = () => {
      const level = this.depth++,
        savepoint = 'foodb_' + level;
      try {
        this.exec(level ? `SAVEPOINT ${savepoint}` : 'BEGIN IMMEDIATE');
        try {
          const result = fn();
          this.exec(level ? `RELEASE ${savepoint}` : 'COMMIT');
          return result;
        } catch (error) {
          this.exec(level ? `ROLLBACK TO ${savepoint}` : 'ROLLBACK');
          if (level) this.exec(`RELEASE ${savepoint}`);
          throw error;
        }
      } finally {
        this.depth--;
      }
    };
    return Object.assign(run, {
      immediate: run
    });
  }
  close() {
    this.statements.clear();
    this.driver.close();
  }
}
