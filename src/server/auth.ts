import { hashPassword, verifyPassword } from './password';
import { Store } from './db';
import { type Actor, roles, requireThat, text, hash } from '../shared/contracts';
import { permit } from '../shared/permissions';
export class Auth {
  private s: Store;
  constructor(s: Store) {
    this.s = s;
  }
  actor(req: Request): Actor {
    const token = req.headers.get('cookie')?.match(/(?:^|;\s*)foodb=([^;]+)/)?.[1];
    requireThat(token, 'Sign in to continue.', 401, 'UNAUTHENTICATED');
    const session = this.s.one('SELECT * FROM sessions WHERE token=?', hash(token));
    const now = this.s.clock().getTime();
    requireThat(session && now - session.last_seen < 1800000 && now - session.created_at < 28800000, 'Session expired. Sign in again.', 401, 'UNAUTHENTICATED');
    const user = this.s.one('SELECT * FROM users WHERE id=? AND disabled=0', session.user_id);
    const membership = this.s.one('SELECT roles FROM memberships WHERE org_id=? AND user_id=?', session.org_id, session.user_id);
    requireThat(user && membership, 'Account access is unavailable.', 401);
    this.s.run('UPDATE sessions SET last_seen=? WHERE token=?', now, hash(token));
    return {
      id: user.id,
      orgId: session.org_id,
      roles: JSON.parse(membership.roles),
      platformAdmin: !!user.platform_admin,
      name: user.name
    };
  }
  cookie(token: string) {
    return `foodb=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`;
  }
  async setup(b: any) {
    text(b.name, 'Name');
    text(b.organization, 'Organization');
    const email = text(b.email, 'Email').toLowerCase();
    requireThat(typeof b.password === 'string' && b.password.length >= 12, 'Use a password of at least 12 characters.', 400);
    const password = await hashPassword(b.password);
    return this.s.tx(() => {
      requireThat(!this.s.one('SELECT id FROM users LIMIT 1'), 'Setup has already been completed.', 409);
      const org = crypto.randomUUID(),
        id = crypto.randomUUID();
      this.s.run('INSERT INTO organizations VALUES(?,?,?)', org, b.organization, this.s.now());
      this.s.run('INSERT INTO users(id,name,email,password,platform_admin) VALUES(?,?,?,?,1)', id, b.name, email, password);
      this.s.run('INSERT INTO memberships VALUES(?,?,?)', org, id, JSON.stringify(roles));
      return {
        id
      };
    });
  }
  async login(b: any, req: Request) {
    const email = text(b.email, 'Email').toLowerCase(),
      now = this.s.clock().getTime();
    this.s.run('DELETE FROM login_attempts WHERE at<?', now - 900000);
    requireThat(this.s.one('SELECT count(*) n FROM login_attempts WHERE account=?', email).n < 10, 'Too many attempts. Try again in 15 minutes.', 429);
    requireThat(this.s.one('SELECT count(*) n FROM login_attempts WHERE account=?', '__loopback__').n < 10, 'Too many attempts. Try again in 15 minutes.', 429);
    const user = this.s.one('SELECT * FROM users WHERE email=? AND disabled=0', email);
    const valid = user && typeof b.password === 'string' && (await verifyPassword(b.password, user.password));
    if (!valid) {
      this.s.run('INSERT INTO login_attempts VALUES(?,?)', email, now);
      this.s.run('INSERT INTO login_attempts VALUES(?,?)', '__loopback__', now);
      throw new Error('LOGIN_DENIED');
    }
    const membership = this.s.one('SELECT org_id FROM memberships WHERE user_id=? ORDER BY org_id LIMIT 1', user.id);
    requireThat(membership, 'Invalid email or password.', 401);
    const token = crypto.randomUUID() + crypto.randomUUID();
    this.s.tx(() => {
      this.logout(req);
      this.s.run('INSERT INTO sessions VALUES(?,?,?,?,?)', hash(token), user.id, membership.org_id, now, now);
      this.s.run('DELETE FROM login_attempts WHERE account=?', email);
    });
    return token;
  }
  logout(req: Request) {
    const token = req.headers.get('cookie')?.match(/(?:^|;\s*)foodb=([^;]+)/)?.[1];
    if (token) this.s.run('DELETE FROM sessions WHERE token=?', hash(token));
  }
  async changePassword(a: Actor, b: any) {
    const user = this.s.one('SELECT * FROM users WHERE id=?', a.id);
    requireThat(typeof b.currentPassword === 'string' && (await verifyPassword(b.currentPassword, user.password)), 'Current password is incorrect.', 403);
    requireThat(typeof b.newPassword === 'string' && b.newPassword.length >= 12, 'Use at least 12 characters.', 400);
    const password = await hashPassword(b.newPassword);
    this.s.tx(() => {
      this.s.run('UPDATE users SET password=? WHERE id=?', password, a.id);
      this.s.run('DELETE FROM sessions WHERE user_id=?', a.id);
      this.s.audit(a, 'password.change', a.id);
    });
    return {
      signInRequired: true
    };
  }
  async createUser(a: Actor, b: any) {
    permit(a, 'owner');
    const name = text(b.name, 'Name'),
      email = text(b.email, 'Email').toLowerCase();
    requireThat(typeof b.password === 'string' && b.password.length >= 12, 'Password must contain at least 12 characters.', 400);
    requireThat(Array.isArray(b.roles) && b.roles.length && b.roles.every((r: any) => roles.includes(r)), 'Choose valid roles.', 400);
    const password = await hashPassword(b.password);
    return this.s.tx(() => {
      requireThat(!this.s.one('SELECT id FROM users WHERE email=?', email), 'Email is unavailable.', 409);
      const id = crypto.randomUUID();
      this.s.run('INSERT INTO users(id,name,email,password) VALUES(?,?,?,?)', id, name, email, password);
      this.s.run('INSERT INTO memberships VALUES(?,?,?)', a.orgId, id, JSON.stringify(b.roles));
      this.s.audit(a, 'users.create', id);
      return {
        id,
        name,
        email,
        roles: b.roles
      };
    });
  }
}
