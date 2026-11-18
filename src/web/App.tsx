import { useEffect, useState, type FormEvent } from 'react';
import { RepeatField } from './components/RepeatField';
import { api, request } from './api';
import { forms, actionForms, prepare, type Field } from './forms';
const navigation = [['overview', 'Overview', '◈'], ['lots', 'Receiving', '▦'], ['observations', 'Measurements', '⌁'], ['specifications', 'Quality', '◎'], ['inventory', 'Inventory', '▤'], ['routing', 'Routing', '⇄'], ['recipes', 'Recipes', '▧'], ['production', 'Production', '◷'], ['licenses', 'Licensing', '◇'], ['orders', 'Orders & delivery', '↗'], ['analytics', 'Analytics', '▥'], ['administration', 'Administration', '⚙']];
const groups: Record<string, string[]> = {
  lots: ['lots', 'suppliers', 'samples', 'locations'],
  observations: ['observations', 'calibrations', 'models'],
  inventory: ['inventory', 'lineage'],
  specifications: ['specifications', 'decisions', 'holds'],
  recipes: ['recipes', 'adaptations'],
  production: ['production'],
  licenses: ['licenses', 'usage', 'catalog', 'permissions'],
  orders: ['orders', 'products', 'complaints', 'withdrawals'],
  analytics: ['costs', 'evaluations'],
  administration: ['users', 'devices', 'audit', 'evidence', 'retention-policy', 'organizations']
};
const titles: Record<string, string> = {
  observations: 'Measurements',
  specifications: 'Quality specifications',
  lots: 'Receiving',
  analytics: 'Operating analytics',
  administration: 'Administration',
  production: 'Kitchen production'
};
const routeState = () => {
  const [path, query] = (location.hash.slice(2) || 'overview').split('?');
  return {
    page: path.split('/')[0],
    params: new URLSearchParams(query)
  };
};
const recordUrl = (resource: string, id: string) => {
  const page = Object.keys(groups).find(p => groups[p].includes(resource)) ?? resource;
  return '#/' + page + '?tab=' + resource + '&record=' + encodeURIComponent(id);
};
const human = (s: string) => s.replaceAll('_', ' ').replaceAll('-', ' ').replace(/^./, c => c.toUpperCase());
const kg = (n: number) => new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 3
}).format(n / 1000000) + ' kg';
function Badge({
  value
}: {
  value: string;
}) {
  return <span className={'badge ' + value}>{human(value)}</span>;
}
function ErrorBox({
  message
}: {
  message: string;
}) {
  return <div className="error" role="alert">{message}</div>;
}
function DataForm({
  fields,
  onSubmit,
  label = 'Save record',
  initial = {}
}: {
  fields: Field[];
  onSubmit: (b: any) => Promise<void>;
  label?: string;
  initial?: any;
}) {
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [options, setOptions] = useState<Record<string, any[]>>({});
  useEffect(() => {
    let alive = true;
    Promise.all([...new Set(fields.flatMap(f => f.source ? [f.source] : []))].map(async source => [source, await api(source + '?limit=100')] as const)).then(entries => {
      if (alive) setOptions(Object.fromEntries(entries));
    }).catch(e => {
      if (alive) setError(e.message);
    });
    return () => {
      alive = false;
    };
  }, [fields]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget),
      b: any = {};
    for (const f of fields) {
      const value = data.get(f.key);
      if (f.type === 'checkbox') b[f.key] = value === 'on';else if (value !== '' && value !== null) b[f.key] = f.type === 'number' ? Number(value) : value;
    }
    setBusy(true);
    setError('');
    try {
      await onSubmit(b);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return <form onSubmit={submit} className="data-form">{fields.map(f => <label key={f.key} className={['textarea', 'ingredients', 'steps', 'inputs'].includes(f.type ?? '') ? 'wide' : f.type === 'checkbox' ? 'check' : ''}><span>{f.label}{f.required === false ? ' (optional)' : ''}</span>{['ingredients', 'steps', 'inputs'].includes(f.type ?? '') ? <RepeatField name={f.key} kind={f.type!} options={f.source ? options[f.source] : []} /> : f.source ? <select name={f.key} required={f.required !== false} defaultValue={initial[f.key] ?? ''}><option value="">Select {f.label.toLowerCase()}</option>{(options[f.source] ?? []).map(o => <option key={o.id} value={o.id}>{o.name} · {human(o.status ?? 'active')}</option>)}</select> : f.options ? <select name={f.key} defaultValue={initial[f.key] ?? f.value ?? f.options[0]}>{f.options.map(o => <option key={o}>{o}</option>)}</select> : f.type === 'textarea' ? <textarea name={f.key} rows={4} required={f.required !== false} defaultValue={initial[f.key] ?? f.value} /> : <input name={f.key} type={f.type ?? 'text'} step={f.type === 'number' ? 'any' : undefined} required={f.type === 'checkbox' ? false : f.required !== false} defaultChecked={f.type === 'checkbox' ? initial[f.key] : undefined} defaultValue={f.type === 'checkbox' ? undefined : initial[f.key] ?? f.value ?? (f.type === 'datetime-local' ? new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : undefined)} minLength={f.type === 'password' ? 12 : undefined} />}{f.hint && <small>{f.hint}</small>}</label>)}{error && <div className="wide"><ErrorBox message={error} /></div>}<div className="wide form-footer"><button disabled={busy}>{busy ? 'Saving…' : label}</button></div></form>;
}
function Identity({
  setup,
  onDone
}: {
  setup: boolean;
  onDone: () => void;
}) {
  const fields: Field[] = [...(setup ? [{
    key: 'name',
    label: 'Your name'
  }, {
    key: 'organization',
    label: 'Organization'
  }] : []), {
    key: 'email',
    label: 'Email address',
    type: 'email'
  }, {
    key: 'password',
    label: 'Password (12+ characters)',
    type: 'password'
  }];
  return <div className="identity"><div className="identity-story"><div className="brand">FOODB<span>PRODUCE INTELLIGENCE</span></div><h1>Every ingredient.<br />Every decision.<br /><em>Connected.</em></h1><p>From the receiving dock to the finished dish, keep evidence, inventory, and people on the same page.</p><div className="identity-foot">LOCAL OPERATIONS · PRIVATE BY DESIGN</div></div><main className="identity-form"><p className="eyebrow">YOUR OPERATIONS WORKSPACE</p><h2>{setup ? 'Start with your team.' : 'Welcome back.'}</h2><p>{setup ? 'Create the first organization and owner account. Your records stay on this computer.' : 'Sign in to continue your work.'}</p><DataForm fields={fields} label={setup ? 'Create workspace' : 'Sign in'} onSubmit={async b => {
        if (setup) await api('setup', b);
        await api('auth/login', b);
        onDone();
      }} /></main></div>;
}
function Overview({
  metrics,
  go
}: {
  metrics: any;
  go: (s: string) => void;
}) {
  if (!metrics) return <p>Loading operating records…</p>;
  return <><div className="welcome"><div><p className="eyebrow">FROM INGREDIENT TO OUTCOME</p><h2>A clear view of your operation.</h2><p>Follow your material, understand its quality, and keep every decision traceable.</p><button onClick={() => go('lots')}>Receive a lot <span>↗</span></button></div><div className="produce-art" aria-hidden="true"><div className="tomato t1" /><div className="tomato t2" /><div className="tomato t3" /><div className="art-label">GOOD FOOD STARTS<br />WITH KNOWN INGREDIENTS.</div></div></div><div className="stats">{[['Available stock', kg(metrics.onHandMg - metrics.reservedMg), 'inventory'], ['Received lots', metrics.lots, 'lots'], ['Active holds', metrics.activeHolds, 'specifications'], ['In production', metrics.activeProduction, 'production']].map(([label, value, path]) => <button className="stat" key={label} onClick={() => go(String(path))}><span>{label}</span><strong>{value}</strong><small>View records ↗</small></button>)}</div><div className="section-title"><h2>Your operating flow</h2><span>Six connected stages</span></div><div className="flow">{[['01', 'Receive & measure', 'Build an evidence trail for every incoming lot.', 'lots'], ['02', 'Assess quality', 'Evaluate intended use against approved specifications.', 'specifications'], ['03', 'Route & reconcile', 'Track confirmed movements and exact quantities.', 'inventory'], ['04', 'Prepare & produce', 'Approve instructions and record actual kitchen work.', 'recipes'], ['05', 'Manage rights', 'Keep recipes private and licensed use accountable.', 'licenses'], ['06', 'Deliver & trace', 'Connect finished orders back to their ingredients.', 'orders']].map(([n, title, desc, path]) => <button key={n} className="flow-card" onClick={() => go(path)}><span className="flow-number">{n}</span><h3>{title}</h3><p>{desc}</p><span className="arrow">↗</span></button>)}</div></>;
}
const permissions: Record<string, string[]> = {
  lots: ['quality', 'robotics'],
  inventory: ['robotics'],
  lineage: ['robotics'],
  permissions: ['commercial'],
  models: ['quality'],
  suppliers: ['quality', 'robotics'],
  locations: ['quality', 'robotics'],
  samples: ['quality'],
  observations: ['quality'],
  calibrations: ['quality'],
  specifications: ['quality'],
  decisions: ['quality'],
  holds: ['owner', 'quality', 'robotics', 'chef', 'kitchen', 'commercial', 'delivery', 'safety', 'viewer'],
  routing: ['robotics'],
  recipes: ['chef'],
  adaptations: ['chef'],
  production: ['kitchen'],
  licenses: ['commercial'],
  orders: ['delivery'],
  products: ['chef', 'delivery'],
  complaints: ['delivery'],
  withdrawals: ['safety'],
  costs: ['owner', 'commercial'],
  evaluations: ['quality'],
  users: ['owner'],
  devices: ['owner'],
  organizations: ['owner'],
  'retention-policy': ['owner']
};
function actions(resource: string, row: any): string[] {
  switch (resource) {
    case 'specifications':
    case 'recipes':
    case 'products':
      return row.status === 'draft' ? ['approve'] : resource === 'recipes' && row.status === 'approved' ? ['retire'] : [];
    case 'adaptations':
      return row.status === 'proposed' ? ['approve', 'cancel'] : row.status === 'approved' ? ['cancel'] : [];
    case 'holds':
      return row.status === 'active' ? ['release'] : [];
    case 'routing':
      return row.status === 'uncertain' ? ['reconcile'] : ['queued', 'acknowledged'].includes(row.status) ? ['outcome'] : [];
    case 'users':
      return row.disabled ? [] : ['disable', 'delete'];
    case 'devices':
      return ['rotate', 'revoke'];
    case 'inventory':
      return ['adjust'];
    case 'production':
      return row.status === 'held' ? ['review'] : row.status === 'approved' ? ['start', 'cancel'] : row.status === 'in_progress' ? ['events', 'complete'] : [];
    case 'orders':
      return row.status === 'draft' ? ['allocate'] : row.status === 'allocated' ? ['allocate', 'ready'] : row.status === 'ready' ? ['dispatch'] : row.status === 'dispatched' ? ['delivery-events'] : [];
    case 'licenses':
      return row.status === 'active' ? ['revoke'] : [];
    case 'models':
      return ['evaluate', 'suspend'];
    case 'evaluations':
      return row.status === 'draft' ? ['freeze'] : row.status === 'frozen' ? ['results'] : [];
    case 'withdrawals':
      return ['actions'];
    default:
      return [];
  }
}
function RecordDetail({
  resource,
  row,
  reload,
  close,
  canEdit
}: {
  resource: string;
  row: any;
  reload: () => void;
  close: () => void;
  canEdit: boolean;
}) {
  const [action, setAction] = useState(''),
    [credential, setCredential] = useState('');
  const visible = Object.entries(row).filter(([k]) => !['id', 'org_id', 'name', 'revision', 'status', 'created_at'].includes(k));
  return <section className="detail panel"><div className="section-title"><div><p className="eyebrow">{human(resource)} · REVISION {row.revision ?? '—'}</p><h2>{row.name ?? row.action ?? 'Record details'}</h2></div><button className="secondary" onClick={close}>Close</button></div>{row.status && <Badge value={row.status} />}<p className="record-id">{row.id}</p><div className="record-links">{Object.entries({
        lotId: 'lots',
        adaptationId: 'adaptations',
        productVersionId: 'products',
        specificationVersionId: 'specifications',
        orderId: 'orders',
        finishedLotId: 'lots'
      }).filter(([key]) => row[key]).map(([key, target]) => <a key={key} href={recordUrl(target, row[key])}>{human(key)} ↗</a>)}{resource === 'evidence' && <a href={'/api/v1/evidence/' + row.id} download>Download attachment ↓</a>}</div><dl>{visible.map(([key, value]) => <div key={key}><dt>{human(key)}</dt><dd>{typeof value === 'object' ? <pre>{JSON.stringify(value, null, 2)}</pre> : String(value ?? 'Not recorded')}</dd></div>)}</dl>{canEdit && <div className="actions">{actions(resource, row).map(a => <button key={a} className="secondary" onClick={() => setAction(a)}>{human(a)}</button>)}</div>}{credential && <div className="notice" role="status">Copy this device credential now: {credential}</div>}{action && <div className="action-form"><h3>{human(action)}</h3>{['release', 'revoke', 'cancel', 'retire', 'delete', 'disable'].includes(action) && <p>This changes operational access or release eligibility. Enter the reason to confirm.</p>}<DataForm fields={actionForms[action] ?? []} label={'Confirm ' + human(action).toLowerCase()} onSubmit={async input => {
        const b: any = {
          ...prepare('', input),
          expectedRevision: row.revision
        };
        if (['outcome', 'reconcile'].includes(action)) Object.assign(b, {
          materialId: row.lotId,
          sourceId: row.sourceId,
          destinationId: row.destinationId
        });
        if (resource === 'users' && action === 'delete') {
          await api('deletions/preview', {
            userId: row.id
          });
          await api('deletions/apply', {
            userId: row.id,
            reason: b.reason
          });
        } else {
          const result = await api(`${resource}/${row.id}/${action}`, b);
          if (result.token) {
            setCredential(result.token);
            setAction('');
            return;
          }
        }
        setAction('');
        reload();
      }} /></div>}</section>;
}
function Records({
  resource,
  session,
  version
}: {
  resource: string;
  session: any;
  version: number;
}) {
  const [rows, setRows] = useState<any[]>([]),
    [selected, setSelected] = useState<any>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [creating, setCreating] = useState(false),
    [search, setSearch] = useState(''),
    [cursor, setCursor] = useState<string | undefined>(),
    [next, setNext] = useState<string | undefined>(),
    [generation, setGeneration] = useState(0),
    [notice, setNotice] = useState('');
  const editable = resource === 'catalog' ? session.platformAdmin : (permissions[resource] ?? []).some(r => session.roles.includes(r));
  const reload = () => {
    setGeneration(n => n + 1);
    setSelected(null);
  };
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    setSelected(null);
    const noList = ['retention-policy', 'organizations', 'lineage'].includes(resource);
    if (noList) {
      setRows([]);
      setLoading(false);
      return;
    }
    request(resource + (resource === 'inventory' ? '' : `?limit=25&search=${encodeURIComponent(search)}${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}`)).then(r => {
      if (alive) {
        setRows(r.data);
        setNext(r.nextCursor);
        const record = routeState().params.get('record');
        if (record) {
          const found = r.data.find((x: any) => x.id === record);
          if (found) setSelected(found);else if (!['audit', 'usage', 'catalog', 'inventory', 'devices', 'users', 'evidence'].includes(resource)) api(resource + '/' + record).then(row => {
            if (alive) setSelected(row);
          }).catch(e => {
            if (alive) setError(e.message);
          });
        }
      }
    }).catch(e => {
      if (alive) setError(e.message);
    }).finally(() => {
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [resource, search, cursor, generation, version]);
  return <><div className="toolbar"><div><h2>{human(resource)}</h2><p>{resource === 'inventory' ? 'Available mass accounts for active reservations. Holds follow material ancestry.' : 'Persistent records with permissions, revisions, and an audit trail.'}</p></div>{editable && forms[resource] && <button onClick={() => {
        setCreating(!creating);
        setNotice('');
      }}>{creating ? 'Close form' : '+ ' + (['retention-policy', 'organizations', 'lineage'].includes(resource) ? human(resource) : 'New record')}</button>}</div>{notice && <div className="notice" role="status">{notice}</div>}{creating && <section className="panel"><h3>{human(resource)} · New record</h3><DataForm fields={forms[resource]} onSubmit={async b => {
        const result = await api(resource, prepare(resource, b));
        setCreating(false);
        reload();
        if (result.token) setNotice('Copy this device credential now. It is shown once: ' + result.token);else setNotice('Record saved.');
      }} /></section>}{resource === 'evidence' && <section className="panel"><label>Upload private evidence<input type="file" onChange={async e => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            const r = await fetch('/api/v1/evidence', {
              method: 'POST',
              headers: {
                'Content-Type': file.type || 'application/octet-stream',
                'X-File-Name': file.name
              },
              body: file
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.error.message);
            reload();
          } catch (e) {
            setError((e as Error).message);
          }
        }} /></label></section>}<div className="table-tools"><label>Search records<input type="search" value={search} onChange={e => {
          setSearch(e.target.value);
          setCursor(undefined);
        }} placeholder="Search by name…" /></label></div>{error ? <ErrorBox message={error} /> : loading ? <div className="empty" role="status">Loading records…</div> : rows.length === 0 ? <div className="empty"><span className="empty-icon">▤</span><h3>No records yet</h3><p>{search ? 'Try another search.' : 'Add your first record to start this part of the workflow.'}</p></div> : <section className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>Record</th><th>Status / action</th>{resource === 'inventory' && <><th>On hand</th><th>Reserved</th><th>Available</th></>}<th>Created / last seen</th><th /></tr></thead><tbody>{rows.map((r, i) => <tr key={r.id ?? r.batch_id ?? i}><td><strong>{r.name ?? r.action ?? r.kind ?? r.id ?? r.batch_id}</strong><small>{r.id?.slice(0, 8)}{r.origin ? ' · ' + r.origin : ''}</small></td><td>{r.status ? <Badge value={r.status} /> : r.action ?? r.kind ?? (r.disabled ? 'Disabled' : 'Recorded')}{r.holds?.length > 0 && <Badge value="held" />}</td>{resource === 'inventory' && <><td>{kg(r.onHandMg)}</td><td>{kg(r.reservedMg)}</td><td>{kg(r.availableMg)}</td></>}<td>{r.created_at || r.last_seen ? new Date(r.created_at ?? r.last_seen).toLocaleString() : '—'}</td><td><button className="text-button" onClick={() => {
                  setSelected(r);
                  const state = routeState();
                  state.params.set('record', r.id);
                  history.replaceState(null, '', '#/' + state.page + '?' + state.params);
                }}>Inspect ↗</button></td></tr>)}</tbody></table></div><div className="pagination"><span>{rows.length} records shown</span>{cursor && <button className="secondary" onClick={() => setCursor(undefined)}>First page</button>}{next && <button className="secondary" onClick={() => setCursor(next)}>Next page →</button>}</div></section>}{selected && <RecordDetail resource={resource} row={selected} reload={reload} close={() => {
      setSelected(null);
      const state = routeState();
      state.params.delete('record');
      history.replaceState(null, '', '#/' + state.page + '?' + state.params);
    }} canEdit={editable || session.roles.includes('quality') && resource === 'products'} />}</>;
}
export default function App() {
  const [session, setSession] = useState<any>(null),
    [setup, setSetup] = useState(false),
    [ready, setReady] = useState(false),
    [error, setError] = useState(''),
    [route, setRoute] = useState(() => routeState().page),
    [tab, setTab] = useState(() => routeState().params.get('tab') ?? ''),
    [metrics, setMetrics] = useState<any>(null),
    [version, setVersion] = useState(0),
    [menu, setMenu] = useState(false);
  async function refresh() {
    try {
      const state = await api('setup');
      setSetup(state.required);
      if (!state.required) {
        try {
          setSession(await api('auth/me'));
        } catch {
          setSession(null);
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReady(true);
    }
  }
  useEffect(() => {
    refresh();
    const changed = () => {
      setRoute(routeState().page);
      setTab(routeState().params.get('tab') ?? '');
      setMenu(false);
    };
    window.addEventListener('hashchange', changed);
    return () => window.removeEventListener('hashchange', changed);
  }, []);
  useEffect(() => {
    if (session) api('metrics').then(setMetrics).catch(e => setError(e.message));
  }, [session, route, version]);
  const go = (page: string) => {
    location.hash = '/' + page;
  };
  const resource = tab || (groups[route]?.[0] ?? route);
  if (!ready) return <div className="boot">Opening FOODB…</div>;
  if (error && !session) return <div className="boot"><ErrorBox message={error} /><button onClick={() => {
      setError('');
      refresh();
    }}>Try again</button></div>;
  if (!session) return <Identity setup={setup} onDone={refresh} />;
  return <div className="app"><aside className={menu ? 'sidebar open' : 'sidebar'}><a className="brand" href="#/overview">FOODB<span>PRODUCE INTELLIGENCE</span></a><p className="nav-label">WORKSPACE</p><nav>{navigation.map(([path, label, icon]) => <a key={path} href={'#/' + path} className={route === path ? 'active' : ''} aria-current={route === path ? 'page' : undefined}><span>{icon}</span>{label}</a>)}</nav><div className="sidebar-bottom"><span className="online-dot" /> Local workspace<p>{session.organization}</p><small>{session.roles.join(' · ')}</small></div></aside><div className="workspace"><header><button className="menu-button secondary" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label="Toggle navigation">☰</button><div className="breadcrumb">Workspace <span>/</span> <strong>{titles[route] ?? human(route)}</strong></div><div className="header-right"><span className="avatar">{session.name.slice(0, 1).toUpperCase()}</span><span>{session.name}</span><button className="text-button" onClick={async () => {
            await api('auth/logout', {});
            setSession(null);
          }}>Sign out</button></div></header><main><div className="page-heading"><div><p className="eyebrow">FOODB / OPERATIONS</p><h1>{titles[route] ?? human(route)}</h1></div><button className="secondary" onClick={() => setVersion(v => v + 1)}>↻ Refresh</button></div>{session.mode === 'simulation' && <div className="simulation">SIMULATION WORKSPACE · Synthetic records do not establish physical or food-quality validation.</div>}{error && <ErrorBox message={error} />}{route === 'overview' ? <Overview metrics={metrics} go={go} /> : <>{groups[route] && <div className="tabs" role="navigation" aria-label="Module sections">{groups[route].map(t => <button className={resource === t ? 'selected' : ''} key={t} onClick={() => {
              location.hash = '/' + route + '?tab=' + t;
            }}>{human(t)}</button>)}</div>}{route === 'analytics' && metrics && <div className="stats"><div className="stat"><span>Measurement validity</span><strong>{metrics.measurementValidity === null ? 'Unavailable' : Math.round(metrics.measurementValidity * 100) + '%'}</strong><small>All attempted observations included</small></div><div className="stat"><span>Decision coverage</span><strong>{metrics.decisionCoverage === null ? 'Unavailable' : Math.round(metrics.decisionCoverage * 100) + '%'}</strong><small>Review outcomes remain in denominator</small></div><div className="stat"><span>Recorded costs</span><strong>{Object.entries(metrics.costByCurrency).map(([c, n]) => `${c} ${(Number(n) / 100).toFixed(2)}`).join(' · ') || 'Unavailable'}</strong><small>Only entered cost records</small></div></div>}{route === 'administration' && <div className="admin-tools"><button className="secondary" onClick={async () => {
              try {
                const data = await api('exports');
                const link = document.createElement('a');
                link.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {
                  type: 'application/json'
                }));
                link.download = 'foodb-export.json';
                link.click();
                URL.revokeObjectURL(link.href);
              } catch (e) {
                setError((e as Error).message);
              }
            }}>Export operational records ↓</button><label>Organization <select value={session.orgId} onChange={async e => {
                await api('auth/organization', {
                  orgId: e.target.value
                });
                await refresh();
                setVersion(v => v + 1);
              }}>{session.organizations.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label></div>}<Records key={resource} resource={resource} session={session} version={version} /></>}</main><footer>FOODB · Produce intelligence <span>Local records. Traceable decisions.</span></footer></div></div>;
}
