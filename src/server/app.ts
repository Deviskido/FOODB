import { Store, type Entity } from './db';
import { Auth } from './auth';
import { Inventory } from './modules/inventory';
import { Quality } from './modules/quality';
import { Routing } from './modules/routing';
import { Recipes } from './modules/recipes';
import { Production } from './modules/production';
import { Fulfillment } from './modules/fulfillment';
import { entities } from './migrations/001-foundation';
import { AppError, type Actor, type Mode, type Role, requireThat, text, number, date, hash, canonical, roles } from '../shared/contracts';
import { permit, readRecipes } from '../shared/permissions';
import { join } from 'node:path';
import { mkdirSync, existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
export function createApp({
  dataDir,
  clock = () => new Date(),
  mode = 'operational'
}: {
  dataDir: string;
  clock?: () => Date;
  mode?: Mode;
}) {
  const s = new Store(dataDir, mode, clock),
    auth = new Auth(s),
    inv = new Inventory(s),
    quality = new Quality(s, inv),
    routing = new Routing(s, inv),
    recipes = new Recipes(s, inv, quality),
    production = new Production(s, inv, recipes),
    fulfillment = new Fulfillment(s, inv);
  mkdirSync(join(dataDir, 'control'), {
    recursive: true,
    mode: 0o700
  });
  const journal = join(dataDir, 'control', 'deletions.json');
  if (!existsSync(journal)) writeFileSync(journal, '[]', {
    mode: 0o600
  });
  s.tx(() => {
    for (const instruction of JSON.parse(readFileSync(journal, 'utf8'))) {
      s.run("UPDATE users SET name='Deleted user',email=?,password='',disabled=1 WHERE id=?", 'deleted:' + instruction.userId, instruction.userId);
      s.run('DELETE FROM sessions WHERE user_id=?', instruction.userId);
    }
  });
  const reply = (data: any, status = 200, headers: Record<string, string> = {}) => Response.json({
    data
  }, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers
    }
  });
  const names: Record<string, Entity> = {
    lots: 'lots',
    suppliers: 'suppliers',
    samples: 'samples',
    observations: 'observations',
    specifications: 'specification_versions',
    decisions: 'quality_decisions',
    holds: 'holds',
    locations: 'locations',
    routing: 'routing_commands',
    recipes: 'recipe_versions',
    adaptations: 'adaptations',
    production: 'production_batches',
    licenses: 'licenses',
    products: 'product_versions',
    orders: 'orders',
    complaints: 'complaints',
    withdrawals: 'withdrawals',
    evaluations: 'evaluations',
    costs: 'costs',
    calibrations: 'calibrations',
    models: 'models',
    approvals: 'approvals'
  };
  function access(a: Actor, t: Entity) {
    if (['recipes', 'recipe_versions', 'adaptations'].includes(t)) requireThat(readRecipes(a), 'Recipe access is restricted.', 403);
    if (t === 'licenses') permit(a, 'commercial');
    if (t === 'costs') permit(a, 'commercial', 'owner');
  }
  function present(a: Actor, t: Entity, row: any) {
    if (t === 'observations') return {
      ...row,
      currentUsability: quality.usable(a, row)
    };
    if (t === 'adaptations' && row.recipeRef?.kind === 'catalog') {
      try {
        recipes.entitled(a, row.recipeRef);
      } catch {
        const {
          instructions,
          observations,
          ...metadata
        } = row;
        return {
          ...metadata,
          contentRestricted: true
        };
      }
    }
    if (t === 'production_batches' && !a.roles.some(r => ['kitchen', 'chef'].includes(r))) {
      const {
        instructions,
        ...safe
      } = row;
      return safe;
    }
    return row;
  }
  function metrics(a: Actor) {
    const lots = s.list('lots', a.orgId),
      obs = s.list('observations', a.orgId),
      batches = s.list('production_batches', a.orgId),
      orders = s.list('orders', a.orgId),
      costs = s.list('costs', a.orgId),
      decisions = s.list('quality_decisions', a.orgId);
    const totals = lots.reduce((v, l) => {
      const x = inv.stock(a, l.id);
      v.onHandMg += x.onHandMg;
      v.reservedMg += x.reservedMg;
      return v;
    }, {
      onHandMg: 0,
      reservedMg: 0
    });
    return {
      mode,
      lots: lots.length,
      observations: obs.length,
      validObservations: obs.filter(o => quality.usable(a, o) === 'valid').length,
      measurementValidity: obs.length ? obs.filter(o => quality.usable(a, o) === 'valid').length / obs.length : null,
      activeHolds: s.list('holds', a.orgId).filter(h => h.status === 'active').length,
      activeProduction: batches.filter(b => b.status === 'in_progress').length,
      completedProduction: batches.filter(b => b.status === 'completed').length,
      orders: orders.length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      decisionCoverage: decisions.length ? decisions.filter(d => d.status !== 'review').length / decisions.length : null,
      costByCurrency: costs.reduce((v, c) => ({
        ...v,
        [c.currency]: (v[c.currency] ?? 0) + c.amountMinor
      }), {} as Record<string, number>),
      ...totals
    };
  }
  function authorizeMutation(a: Actor, resource: string, action?: string) {
    const allowed: Record<string, Role[]> = {
      lots: ['quality', 'robotics'],
      lineage: ['robotics'],
      observations: ['quality'],
      specifications: ['quality'],
      decisions: ['quality'],
      routing: ['robotics'],
      recipes: ['chef'],
      adaptations: ['chef'],
      production: action === 'review' ? ['chef'] : ['kitchen'],
      inventory: ['robotics'],
      products: action === 'approve' ? ['quality'] : ['delivery', 'chef'],
      orders: ['delivery'],
      withdrawals: ['safety'],
      complaints: ['delivery'],
      suppliers: ['quality', 'robotics'],
      locations: ['quality', 'robotics'],
      samples: ['quality'],
      calibrations: ['quality'],
      models: ['quality'],
      costs: ['commercial', 'owner'],
      evaluations: ['quality'],
      licenses: ['commercial'],
      devices: ['owner'],
      users: ['owner'],
      organizations: ['owner'],
      memberships: ['owner'],
      'retention-policy': ['owner'],
      usage: ['commercial'],
      permissions: ['commercial']
    };
    if (resource === 'lots' && action === 'adjust') permit(a, 'robotics');else if (allowed[resource]) permit(a, ...allowed[resource]);
    if (resource === 'catalog' || resource === 'licenses' && !action) requireThat(a.platformAdmin, 'Platform administrator required.', 403);
  }
  function mutate(a: Actor, parts: string[], b: any): any {
    const [resource, id, action] = parts;
    if (mode === 'operational' && ['lots', 'recipes', 'catalog', 'products'].includes(resource)) requireThat(s.one('SELECT value FROM metadata WHERE key=?', 'retention:' + a.orgId), 'Approve a retention policy in Administration before entering live business data.');
    switch (resource) {
      case 'inventory':
        if (id && action === 'adjust') return inv.adjust(a, id, b);
        break;
      case 'lots':
        if (!id) return inv.receive(a, b);
        if (action === 'adjust') return inv.adjust(a, id, b);
        break;
      case 'lineage':
        return inv.lineage(a, b);
      case 'holds':
        return id && action === 'release' ? inv.release(a, id, b) : inv.hold(a, b);
      case 'observations':
        return quality.observe(a, b);
      case 'specifications':
        if (!id) return quality.spec(a, b);
        if (action === 'approve') return quality.approveSpec(a, id, b);
        break;
      case 'decisions':
        return quality.classify(a, b);
      case 'routing':
        if (!id) return routing.command(a, b);
        if (action === 'outcome') return routing.outcome(a, id, b);
        if (action === 'reconcile') return routing.reconcile(a, id, b);
        break;
      case 'recipes':
        if (!id) return recipes.create(a, b);
        if (action === 'approve') return recipes.approve(a, id, b);
        if (action === 'retire') {
          permit(a, 'chef');
          text(b.reason, 'Reason');
          return s.update('recipe_versions', a, id, b.expectedRevision, {
            reason: b.reason
          }, 'retired');
        }
        break;
      case 'adaptations':
        if (!id) return recipes.propose(a, b);
        if (action === 'approve') return recipes.approveAdaptation(a, id, b);
        if (action === 'cancel') {
          permit(a, 'chef');
          const p = s.get('adaptations', a.orgId, id);
          requireThat(['proposed', 'approved', 'unavailable'].includes(p.status), 'Started adaptation cannot be cancelled.');
          requireThat(!s.list('production_batches', a.orgId).some(x => x.adaptationId === id && x.status !== 'cancelled'), 'Cancel its production batch first.');
          s.run("UPDATE reservations SET status='cancelled' WHERE org_id=? AND batch_id=?", a.orgId, id);
          return s.update('adaptations', a, id, b.expectedRevision, {
            reason: text(b.reason, 'Reason')
          }, 'cancelled');
        }
        break;
      case 'production':
        if (!id) return production.plan(a, b);
        if (action === 'review') return production.review(a, id, b);
        if (action === 'start') return production.start(a, id, b);
        if (action === 'events') return production.event(a, id, b);
        if (action === 'complete') return production.complete(a, id, b);
        if (action === 'cancel') return production.cancel(a, id, b);
        break;
      case 'products':
        if (!id) return fulfillment.product(a, b);
        if (action === 'approve') {
          permit(a, 'quality');
          const p = s.get('product_versions', a.orgId, id);
          requireThat(p.status === 'draft', 'Product is not a draft.');
          return s.update('product_versions', a, id, b.expectedRevision, {
            reason: text(b.reason, 'Reason')
          }, 'approved');
        }
        break;
      case 'orders':
        if (!id) return fulfillment.order(a, b);
        if (action === 'allocate') return fulfillment.allocate(a, id, b);
        if (action === 'ready' || action === 'dispatch') return fulfillment.transition(a, id, action, b);
        if (action === 'delivery-events') return fulfillment.delivery(a, id, b);
        break;
      case 'withdrawals':
        if (!id) return fulfillment.withdraw(a, b);
        if (action === 'actions') {
          permit(a, 'safety');
          const w = s.get('withdrawals', a.orgId, id);
          return s.update('withdrawals', a, id, b.expectedRevision, {
            actions: [...w.actions, {
              note: text(b.note, 'Corrective action'),
              at: s.now(),
              actor: a.id
            }]
          });
        }
        break;
      case 'complaints':
        permit(a, 'delivery');
        s.get('orders', a.orgId, b.orderId);
        return s.add('complaints', a, {
          orderId: b.orderId,
          name: text(b.name, 'Complaint'),
          reason: text(b.reason, 'Details')
        }, 'open');
      case 'suppliers':
      case 'locations':
        permit(a, 'quality', 'robotics');
        return s.add(resource, a, {
          name: text(b.name, 'Name')
        }, 'active');
      case 'samples':
        {
          permit(a, 'quality');
          s.get('lots', a.orgId, b.lotId);
          text(b.method, 'Sampling method');
          const sample = s.add('samples', a, {
            name: text(b.name, 'Sample name'),
            lotId: b.lotId,
            method: b.method
          }, 'recorded');
          if (b.destroyedMg) inv.move(a, b.lotId, -b.destroyedMg, 'sample_destroy', sample.id);
          return sample;
        }
      case 'calibrations':
        {
          permit(a, 'quality');
          const expiresAt = date(b.expiresAt, 'Expiry');
          requireThat(expiresAt > s.now(), 'Calibration must expire in the future.');
          text(b.reference, 'Reference procedure');
          return s.add('calibrations', a, {
            name: text(b.name, 'Name'),
            expiresAt,
            reference: b.reference,
            origin: mode
          }, 'approved');
        }
      case 'models':
        return quality.model(a, id, action, b);
      case 'costs':
        permit(a, 'commercial', 'owner');
        number(b.amountMinor, 'Cost in minor currency units', 0);
        requireThat(Number.isSafeInteger(b.amountMinor) && /^[A-Z]{3}$/.test(b.currency), 'Use integer minor units and a three-letter currency.', 400);
        return s.add('costs', a, {
          name: text(b.name, 'Cost category'),
          amountMinor: b.amountMinor,
          currency: b.currency,
          origin: mode
        }, 'recorded');
      case 'evaluations':
        {
          permit(a, 'quality');
          if (!id) {
            for (const field of ['name', 'population', 'baseline', 'endpoint', 'replication', 'confidenceRule']) text(b[field], field);
            number(b.threshold, 'Frozen threshold');
            return s.add('evaluations', a, {
              ...b,
              origin: mode
            }, 'draft');
          }
          if (action === 'freeze') {
            const e = s.get('evaluations', a.orgId, id);
            requireThat(e.status === 'draft', 'Protocol already frozen.');
            return s.update('evaluations', a, id, b.expectedRevision, {
              frozenAt: s.now()
            }, 'frozen');
          }
          if (action === 'results') {
            const e = s.get('evaluations', a.orgId, id);
            requireThat(e.status === 'frozen', 'Freeze the protocol before recording results.');
            requireThat(Array.isArray(b.values) && b.values.length >= 2 && b.values.every((x: any) => typeof x === 'number' && Number.isFinite(x)), 'Record at least two finite replicated values.');
            const mean = b.values.reduce((n: number, x: number) => n + x, 0) / b.values.length;
            return s.update('evaluations', a, id, b.expectedRevision, {
              values: b.values,
              mean,
              passesThreshold: mean >= e.threshold,
              physicalValidation: false
            }, 'recorded');
          }
          break;
        }
      case 'permissions':
        {
          permit(a, 'commercial');
          const recipe = s.get('recipes', a.orgId, b.recipeId);
          const permissionId = crypto.randomUUID();
          const grants = {
            publication: b.publication === true,
            derivatives: b.derivatives === true,
            export: b.export === true,
            training: b.training === true,
            reason: text(b.reason, 'Permission reason')
          };
          s.run('INSERT INTO permissions VALUES(?,?,?,?,?)', a.orgId, permissionId, recipe.id, JSON.stringify(grants), s.now());
          s.audit(a, 'permissions.grant', permissionId, b.reason);
          return {
            id: permissionId,
            ...grants
          };
        }
      case 'licenses':
        {
          permit(a, 'commercial');
          if (!id) {
            requireThat(a.platformAdmin, 'Only the platform administrator can issue catalog entitlements.', 403);
            requireThat(s.one('SELECT id FROM catalog_recipe_versions WHERE id=?', b.catalogVersionId), 'Catalog version not found.', 404);
            const startsAt = date(b.startsAt, 'Starts at'),
              expiresAt = date(b.expiresAt, 'Expires at');
            requireThat(startsAt < expiresAt, 'License expiry must follow its start.');
            return s.add('licenses', a, {
              name: text(b.name, 'Name'),
              catalogVersionId: b.catalogVersionId,
              startsAt,
              expiresAt,
              production: b.production === true,
              export: b.export === true,
              training: b.training === true,
              derivatives: b.derivatives === true,
              publication: b.publication === true
            }, 'active');
          }
          if (action === 'revoke') return s.update('licenses', a, id, b.expectedRevision, {
            reason: text(b.reason, 'Revocation reason')
          }, 'revoked');
          break;
        }
      case 'catalog':
        {
          requireThat(a.platformAdmin, 'Platform administrator required.', 403);
          recipes.validate(b);
          const recipeId = crypto.randomUUID(),
            versionId = crypto.randomUUID();
          s.run('INSERT INTO catalog_recipes VALUES(?,?)', recipeId, b.name);
          s.run('INSERT INTO catalog_recipe_versions VALUES(?,?,?,?,?)', versionId, recipeId, JSON.stringify({
            ...b,
            simulation: mode === 'simulation'
          }), 'approved', s.now());
          s.audit(a, 'catalog.create', versionId);
          return {
            id: versionId,
            name: b.name
          };
        }
      case 'users':
        {
          permit(a, 'owner');
          requireThat(action === 'disable' && id && id !== a.id, 'Choose another account to disable.', 400);
          requireThat(s.one('SELECT user_id FROM memberships WHERE org_id=? AND user_id=?', a.orgId, id), 'User not found.', 404);
          requireThat(s.one('SELECT count(*) n FROM memberships WHERE user_id=?', id).n === 1, 'Shared accounts require platform review.');
          text(b.reason, 'Disable reason');
          s.run('UPDATE users SET disabled=1 WHERE id=?', id);
          s.run('DELETE FROM sessions WHERE user_id=?', id);
          s.audit(a, 'user.disable', id, b.reason);
          return {
            id,
            disabled: true
          };
        }
      case 'devices':
        {
          permit(a, 'owner');
          if (id) {
            const d = s.one('SELECT * FROM devices WHERE org_id=? AND id=?', a.orgId, id);
            requireThat(d, 'Device not found.', 404);
            requireThat(d.revision === b.expectedRevision, 'Refresh this device.', 409);
            requireThat(['revoke', 'rotate'].includes(action), 'Unknown credential action.', 400);
            const rotated = action === 'rotate' ? crypto.randomUUID() + crypto.randomUUID() : null;
            s.run('UPDATE devices SET token=?,revision=revision+1 WHERE org_id=? AND id=?', rotated ? hash(rotated) : null, a.orgId, id);
            if (rotated) {
              s.audit(a, 'device.rotate', id);
              return {
                id,
                token: rotated,
                revision: d.revision + 1
              };
            }
            s.audit(a, 'device.revoke', id);
            return {
              id,
              revoked: true
            };
          }
          const token = crypto.randomUUID() + crypto.randomUUID(),
            deviceId = crypto.randomUUID();
          s.run('INSERT INTO devices(id,org_id,name,token,mode) VALUES(?,?,?,?,?)', deviceId, a.orgId, text(b.name, 'Name'), hash(token), mode);
          s.audit(a, 'device.create', deviceId);
          return {
            id: deviceId,
            token,
            mode
          };
        }
      case 'organizations':
        {
          permit(a, 'owner');
          const orgId = crypto.randomUUID();
          s.run('INSERT INTO organizations VALUES(?,?,?)', orgId, text(b.name, 'Organization name'), s.now());
          s.run('INSERT INTO memberships VALUES(?,?,?)', orgId, a.id, JSON.stringify(['owner']));
          s.audit(a, 'organization.create', orgId);
          return {
            id: orgId
          };
        }
      case 'memberships':
        {
          permit(a, 'owner');
          requireThat(s.one('SELECT user_id FROM memberships WHERE org_id=? AND user_id=?', a.orgId, b.userId), 'User not found.', 404);
          requireThat(Array.isArray(b.roles) && b.roles.length && b.roles.every((r: any) => roles.includes(r)), 'Invalid roles.', 400);
          requireThat(b.userId !== a.id, 'Ask another owner to change your own roles.');
          s.run('UPDATE memberships SET roles=? WHERE org_id=? AND user_id=?', JSON.stringify(b.roles), a.orgId, b.userId);
          s.audit(a, 'membership.update', b.userId);
          return {
            id: b.userId
          };
        }
      case 'retention-policy':
        permit(a, 'owner');
        text(b.reason, 'Policy');
        s.run('INSERT OR REPLACE INTO metadata VALUES(?,?)', 'retention:' + a.orgId, JSON.stringify({
          policy: b.reason,
          approvedBy: a.id,
          at: s.now()
        }));
        s.audit(a, 'retention.approve', a.orgId, b.reason);
        return {
          approved: true
        };
      case 'usage':
        {
          permit(a, 'commercial');
          requireThat(action === 'dispute', 'Unsupported usage action.', 400);
          s.get('production_batches', a.orgId, id);
          s.run('INSERT INTO usage_events VALUES(?,?,?,?,?)', a.orgId, id, 'dispute:' + crypto.randomUUID(), JSON.stringify({
            reason: text(b.reason, 'Dispute reason')
          }), s.now());
          return {
            recorded: true
          };
        }
    }
    throw new AppError(404, 'NOT_FOUND', 'Action not found.');
  }
  async function device(req: Request, b: any) {
    const credential = req.headers.get('authorization')?.replace(/^Bearer /, '');
    requireThat(credential, 'Device credential required.', 401);
    const d = s.one('SELECT * FROM devices WHERE token=?', hash(credential));
    requireThat(d && d.id === b.deviceId && d.mode === mode, 'Invalid device credential.', 401);
    requireThat(b.schemaVersion === 1, 'Unsupported event schema.', 400);
    text(b.eventId, 'Event ID');
    date(b.occurredAt, 'Event time');
    const a: Actor = {
      id: d.id,
      orgId: d.org_id,
      name: d.name,
      roles: ['quality', 'robotics'],
      platformAdmin: false
    };
    return s.tx(() => {
      const eventHash = hash(canonical(b)),
        old = s.one('SELECT * FROM integration_events WHERE org_id=? AND id=?', a.orgId, b.eventId);
      if (old) {
        requireThat(old.hash === eventHash, 'Event ID was reused with different content.', 409);
        return JSON.parse(old.result);
      }
      let result: any;
      switch (b.kind) {
        case 'heartbeat':
          result = {
            accepted: true
          };
          break;
        case 'observation':
          requireThat(b.payload.lotId === b.subjectId, 'Subject mismatch.');
          result = quality.observe(a, {
            ...b.payload,
            origin: mode === 'simulation' ? 'simulation' : 'instrument',
            observedAt: b.occurredAt,
            deviceId: d.id
          });
          break;
        case 'routing_ack':
          {
            const c = s.get('routing_commands', a.orgId, b.payload.commandId);
            requireThat(c.lotId === b.subjectId, 'Subject mismatch.');
            result = c.status === 'queued' ? s.update('routing_commands', a, c.id, c.revision, {}, 'acknowledged') : c;
            break;
          }
        case 'routing_outcome':
          requireThat(b.payload.materialId === b.subjectId, 'Subject mismatch.');
          result = routing.outcome(a, b.payload.commandId, b.payload);
          break;
        case 'fault':
          result = inv.hold(a, {
            lotId: b.subjectId,
            kind: 'equipment',
            reason: text(b.payload.reason, 'Fault reason')
          });
          break;
        default:
          throw new AppError(400, 'UNSUPPORTED_EVENT', 'Unsupported device event.');
      }
      s.run('UPDATE devices SET last_seen=? WHERE id=?', s.now(), d.id);
      s.run('INSERT INTO integration_events VALUES(?,?,?,?,?)', a.orgId, b.eventId, eventHash, JSON.stringify(result), s.now());
      s.audit(a, 'device.' + b.kind, b.subjectId ?? d.id);
      return result;
    });
  }
  async function fetch(req: Request): Promise<Response> {
    let securityActor: Actor | undefined;
    try {
      const url = new URL(req.url);
      requireThat(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Only loopback access is allowed.', 403);
      const host = req.headers.get('host');
      requireThat(!host || host === url.host, 'Invalid Host header.', 403);
      requireThat(!url.username && !url.password && !url.searchParams.has('token'), 'Credentials cannot be placed in URLs.', 400);
      const origin = req.headers.get('origin');
      requireThat(!origin || origin === url.origin, 'Cross-origin access is blocked.', 403);
      requireThat(req.headers.get('sec-fetch-site') !== 'cross-site', 'Cross-site access is blocked.', 403);
      const parts = url.pathname.replace(/^\/api\/v1\/?/, '').split('/').filter(Boolean),
        [resource, id, action] = parts;
      requireThat(url.pathname.startsWith('/api/v1/'), 'API endpoint not found.', 404);
      if (resource === 'health') return reply({
        status: 'ok',
        mode
      });
      if (resource === 'setup' && req.method === 'GET') return reply({
        required: !s.one('SELECT id FROM users LIMIT 1'),
        mode
      });
      let b: any = {};
      if (req.method !== 'GET' && req.method !== 'HEAD' && resource !== 'evidence') {
        const raw = await req.text();
        requireThat(raw.length <= 1024 * 1024, 'Request exceeds 1 MiB.', 413);
        try {
          b = raw ? JSON.parse(raw) : {};
        } catch {
          throw new AppError(400, 'INVALID_JSON', 'Request must be valid JSON.');
        }
        requireThat(b && typeof b === 'object' && !Array.isArray(b), 'JSON object required.', 400);
      }
      if (resource === 'setup' && req.method === 'POST') return reply(await auth.setup(b), 201);
      if (resource === 'auth' && id === 'login' && req.method === 'POST') {
        const token = await auth.login(b, req);
        return reply({
          signedIn: true
        }, 200, {
          'Set-Cookie': auth.cookie(token)
        });
      }
      if (resource === 'device-events' && req.method === 'POST') return reply(await device(req, b));
      const a = auth.actor(req);
      securityActor = a;
      if (s.one("SELECT value FROM metadata WHERE key='recovery'")?.value === 'held') permit(a, 'owner');
      if (s.one("SELECT value FROM metadata WHERE key='recovery'")?.value === 'held' && !['GET', 'HEAD'].includes(req.method) && !(resource === 'recovery' && id === 'release') && !(resource === 'auth' && id === 'logout')) throw new AppError(423, 'RECOVERY_HOLD', 'Restored data is held. Owner reconciliation is required.');
      if (resource === 'recovery' && id === 'release' && req.method === 'POST') {
        permit(a, 'owner');
        text(b.reason, 'Reconciliation reason');
        s.tx(() => {
          s.run("DELETE FROM metadata WHERE key='recovery'");
          s.audit(a, 'recovery.release', a.orgId, b.reason);
        });
        return reply({
          released: true
        });
      }
      if (resource === 'deletions') {
        permit(a, 'owner');
        const user = s.one('SELECT u.id FROM users u JOIN memberships m ON m.user_id=u.id WHERE m.org_id=? AND u.id=?', a.orgId, b.userId);
        requireThat(user, 'User not found.', 404);
        requireThat(b.userId !== a.id, 'Cannot delete the current owner.');
        requireThat(s.one('SELECT count(*) n FROM memberships WHERE user_id=?', b.userId).n === 1, 'Shared accounts require platform review.');
        if (id === 'preview') return reply({
          userId: b.userId,
          effect: 'Disable account, revoke sessions, pseudonymize identity. Retain restricted audit and production evidence.'
        });
        requireThat(id === 'apply', 'Unknown deletion action.', 404);
        text(b.reason, 'Deletion reason');
        const instructions = JSON.parse(readFileSync(journal, 'utf8'));
        instructions.push({
          userId: b.userId,
          reason: b.reason,
          at: s.now()
        });
        writeFileSync(journal + '.tmp', JSON.stringify(instructions), {
          mode: 0o600
        });
        renameSync(journal + '.tmp', journal);
        s.tx(() => {
          s.run("UPDATE users SET name='Deleted user',email=?,password='',disabled=1 WHERE id=?", 'deleted:' + b.userId, b.userId);
          s.run('DELETE FROM sessions WHERE user_id=?', b.userId);
          s.audit(a, 'user.delete', b.userId, b.reason);
        });
        return reply({
          deleted: true
        });
      }
      if (resource === 'auth' && id === 'me') return reply({
        ...a,
        mode,
        organization: s.one('SELECT name FROM organizations WHERE id=?', a.orgId).name,
        organizations: s.all('SELECT o.id,o.name FROM organizations o JOIN memberships m ON m.org_id=o.id WHERE m.user_id=?', a.id)
      });
      if (resource === 'auth' && id === 'password' && req.method === 'POST') return reply(await auth.changePassword(a, b));
      if (resource === 'auth' && id === 'logout' && req.method === 'POST') {
        auth.logout(req);
        return reply({
          signedIn: false
        }, 200, {
          'Set-Cookie': 'foodb=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'
        });
      }
      if (resource === 'auth' && id === 'organization' && req.method === 'POST') {
        requireThat(s.one('SELECT user_id FROM memberships WHERE org_id=? AND user_id=?', b.orgId, a.id), 'Organization not found.', 404);
        const token = req.headers.get('cookie')!.match(/foodb=([^;]+)/)![1];
        s.run('UPDATE sessions SET org_id=? WHERE token=?', b.orgId, hash(token));
        return reply({
          orgId: b.orgId
        });
      }
      if (resource === 'evidence') {
        if (req.method === 'POST') {
          permit(a, 'quality', 'chef', 'robotics', 'safety');
          const bytes = new Uint8Array(await req.arrayBuffer());
          requireThat(bytes.length <= 10 * 1024 * 1024, 'Evidence exceeds 10 MiB.', 413);
          const mime = req.headers.get('content-type') ?? 'application/octet-stream';
          const signatures: Record<string, number[]> = {
            'image/png': [137, 80, 78, 71, 13, 10, 26, 10],
            'image/jpeg': [255, 216, 255],
            'image/webp': [82, 73, 70, 70]
          };
          if (mime.startsWith('image/')) requireThat(signatures[mime] && signatures[mime].every((x, i) => bytes[i] === x) && (mime !== 'image/webp' || String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'), 'Image signature does not match media type.', 400);
          const evidenceId = crypto.randomUUID(),
            checksum = new Bun.CryptoHasher('sha256').update(bytes).digest('hex'),
            name = text(req.headers.get('x-file-name') ?? 'attachment', 'Filename');
          await Bun.write(join(dataDir, 'evidence', evidenceId), bytes);
          s.tx(() => {
            s.run('INSERT INTO evidence_files VALUES(?,?,?,?,?,?,?)', evidenceId, a.orgId, name, mime, checksum, bytes.length, s.now());
            s.audit(a, 'evidence.create', evidenceId);
          });
          return reply({
            id: evidenceId,
            checksum,
            size: bytes.length
          }, 201);
        }
        if (id) {
          const e = s.one('SELECT * FROM evidence_files WHERE org_id=? AND id=?', a.orgId, id);
          requireThat(e, 'Evidence not found.', 404);
          return new Response(Bun.file(join(dataDir, 'evidence', e.id)), {
            headers: {
              'Content-Type': 'application/octet-stream',
              'Content-Disposition': 'attachment',
              'Cache-Control': 'no-store',
              'X-Content-Type-Options': 'nosniff'
            }
          });
        }
        return reply(s.all('SELECT * FROM evidence_files WHERE org_id=?', a.orgId));
      }
      if (resource === 'users' && !id && req.method === 'POST') return reply(await auth.createUser(a, b), 201);
      if (req.method === 'GET') {
        if (resource === 'metrics') return reply(metrics(a));
        if (resource === 'inventory') return reply(s.list('lots', a.orgId).map(l => ({
          ...l,
          ...inv.stock(a, l.id),
          holds: inv.holds(a, l.id)
        })));
        if (resource === 'lineage' && id) {
          s.get('lots', a.orgId, id);
          return reply({
            ancestors: inv.ancestors(a, id),
            descendants: inv.descendants(a, id),
            holds: inv.holds(a, id)
          });
        }
        if (resource === 'audit') {
          permit(a, 'owner', 'safety');
          return reply(s.all('SELECT * FROM audit_events WHERE org_id=? ORDER BY created_at DESC LIMIT 100', a.orgId));
        }
        if (resource === 'users') {
          permit(a, 'owner');
          return reply(s.all('SELECT u.id,u.name,u.email,u.disabled,m.roles FROM users u JOIN memberships m ON m.user_id=u.id WHERE m.org_id=?', a.orgId));
        }
        if (resource === 'devices') {
          permit(a, 'owner', 'robotics');
          return reply(s.all('SELECT id,name,mode,revision,last_seen,token IS NULL AS revoked FROM devices WHERE org_id=?', a.orgId).map(d => ({
            ...d,
            status: d.revoked ? 'revoked' : !d.last_seen || s.clock().getTime() - Date.parse(d.last_seen) > 60000 ? 'stale' : 'connected'
          })));
        }
        if (resource === 'permissions') {
          permit(a, 'commercial');
          return reply(s.all('SELECT * FROM permissions WHERE org_id=?', a.orgId));
        }
        if (resource === 'usage') {
          permit(a, 'commercial');
          return reply(s.all('SELECT * FROM usage_events WHERE org_id=? ORDER BY created_at DESC', a.orgId));
        }
        if (resource === 'catalog') {
          if (id) return reply(recipes.entitled(a, {
            kind: 'catalog',
            versionId: id
          }));
          requireThat(readRecipes(a), 'Recipe access is restricted.', 403);
          const licensed = new Set(s.list('licenses', a.orgId).filter(l => l.status === 'active' && l.startsAt <= s.now() && l.expiresAt > s.now()).map(l => l.catalogVersionId));
          return reply(s.all('SELECT v.id,v.recipe_id,v.status,v.created_at,r.name FROM catalog_recipe_versions v JOIN catalog_recipes r ON r.id=v.recipe_id').filter(v => a.platformAdmin || licensed.has(v.id)));
        }
        if (resource === 'exports') {
          permit(a, 'owner');
          const out: Record<string, any> = {
            manifest: {
              mode,
              createdAt: s.now(),
              credentialsIncluded: false
            }
          };
          for (const t of entities) {
            if (['recipes', 'recipe_versions', 'adaptations', 'licenses'].includes(t)) continue;
            out[t] = s.list(t, a.orgId).map(x => present({
              ...a,
              roles: ['viewer']
            }, t, x));
          }
          out.inventory_events = s.all('SELECT * FROM inventory_events WHERE org_id=?', a.orgId);
          out.lot_edges = s.all('SELECT * FROM lot_edges WHERE org_id=?', a.orgId);
          return reply(out);
        }
        const table = names[resource];
        requireThat(table, 'Endpoint not found.', 404);
        access(a, table);
        if (id) {
          const row = s.get(table, a.orgId, id);
          return reply(present(a, table, row));
        }
        const limit = Number(url.searchParams.get('limit') ?? 25);
        requireThat(Number.isInteger(limit) && limit >= 1 && limit <= 100, 'Limit must be 1 to 100.', 400);
        const cursor = url.searchParams.get('cursor');
        let offset = 0;
        if (cursor) {
          try {
            offset = Number(atob(cursor));
          } catch {
            throw new AppError(400, 'INVALID_CURSOR', 'Invalid cursor.');
          }
          requireThat(Number.isSafeInteger(offset) && offset >= 0, 'Invalid cursor.', 400);
        }
        const search = (url.searchParams.get('search') ?? '').toLowerCase(),
          status = url.searchParams.get('status');
        const list = s.list(table, a.orgId).filter(r => (!search || r.name.toLowerCase().includes(search)) && (!status || r.status === status));
        return Response.json({
          data: list.slice(offset, offset + limit).map(r => present(a, table, r)),
          nextCursor: offset + limit < list.length ? btoa(String(offset + limit)) : undefined
        }, {
          headers: {
            'Cache-Control': 'no-store'
          }
        });
      }
      requireThat(req.method === 'POST', 'Method not allowed.', 405);
      const requestId = text(req.headers.get('idempotency-key') ?? b.requestId, 'Idempotency-Key');
      const bodyHash = hash(canonical({
        path: url.pathname,
        body: b,
        actor: a.id
      }));
      authorizeMutation(a, resource, action);
      const result = s.tx(() => {
        const old = s.one('SELECT * FROM integration_events WHERE org_id=? AND id=?', a.orgId, 'request:' + requestId);
        if (old) {
          requireThat(old.hash === bodyHash, 'Request ID reused with different content.', 409);
          const saved = JSON.parse(old.result);
          return names[resource] ? present(a, names[resource], saved) : saved;
        }
        const output = mutate(a, parts, b);
        s.run('INSERT INTO integration_events VALUES(?,?,?,?,?)', a.orgId, 'request:' + requestId, bodyHash, JSON.stringify(resource === 'devices' && output.token ? {
          ...output,
          token: undefined,
          credentialShownOnce: true
        } : output), s.now());
        return output;
      });
      return reply(result, 201);
    } catch (error) {
      const err = error instanceof AppError ? error : error instanceof Error && error.message === 'LOGIN_DENIED' ? new AppError(401, 'LOGIN_DENIED', 'Invalid email or password.') : new AppError(500, 'INTERNAL', 'The operation could not be completed.');
      if ([401, 403].includes(err.status)) s.run('INSERT INTO security_events VALUES(?,?,?,?,?)', crypto.randomUUID(), securityActor?.orgId ?? null, securityActor?.id ?? null, err.code, s.now());
      if (err.status === 500) console.error('Request failed:', error instanceof Error ? error.name : 'unknown');
      return Response.json({
        error: {
          code: err.code,
          message: err.message
        }
      }, {
        status: err.status,
        headers: {
          'Cache-Control': 'no-store'
        }
      });
    }
  }
  return {
    fetch,
    close: () => s.close()
  };
}
