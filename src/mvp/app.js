const root = document.querySelector('#app'),
  message = document.querySelector('#message'),
  account = document.querySelector('#account');
let session = null,
  data = null,
  specs = [],
  recipeVersions = [],
  holds = [],
  selectedLot = '',
  selectedBatch = '',
  busy = false;
const has = role => session?.roles.includes(role);
const labels = {
  approved: '준비 / 승인',
  in_progress: '생산 중',
  completed: '완료',
  held: '보류',
  cancelled: '취소',
  draft: '초안',
  suitable: '적합',
  unsuitable: '부적합',
  review: '검토 필요',
  unassessed: '미판정'
};
const kg = mg => new Intl.NumberFormat('ko-KR', {
  maximumFractionDigits: 6
}).format(mg / 1000000) + ' kg';
function el(tag, attributes = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (key.startsWith('on')) node.addEventListener(key.slice(2), value);else if (key === 'class') node.className = value;else if (value === true) node.setAttribute(key, '');else if (value !== false && value != null) node.setAttribute(key, String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child != null) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}
function tell(text, error = false) {
  message.replaceChildren(text ? el('div', {
    class: error ? 'notice error' : 'notice',
    role: error ? 'alert' : 'status'
  }, text) : '');
}
async function api(path, body) {
  const response = await fetch('/api/v1/' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? {} : {
      'Content-Type': 'application/json',
      'Idempotency-Key': crypto.randomUUID()
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.error?.message ?? '요청을 처리할 수 없습니다.');
    error.status = response.status;
    throw error;
  }
  return result.data;
}
async function list(path) {
  const rows = [];
  let cursor;
  do {
    const response = await fetch('/api/v1/' + path + '?limit=100' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''));
    const result = await response.json();
    if (!response.ok) {
      const error = new Error(result.error?.message ?? '목록 조회 실패');
      error.status = response.status;
      throw error;
    }
    rows.push(...result.data);
    cursor = result.nextCursor;
  } while (cursor);
  return rows;
}
function button(label, operation, secondary = false) {
  return el('button', {
    type: 'button',
    class: secondary ? 'secondary' : '',
    disabled: busy,
    onclick: () => run(operation)
  }, label);
}
async function run(operation, success = '저장했습니다.') {
  if (busy) return;
  busy = true;
  tell('');
  document.querySelectorAll('button').forEach(b => b.disabled = true);
  try {
    const result = await operation();
    if (session) await refresh();
    tell(typeof result === 'string' ? result : success);
  } catch (error) {
    tell(error.message, true);
    if (error.status === 401) {
      session = null;
      await boot();
    }
  } finally {
    busy = false;
    document.querySelectorAll('button').forEach(b => b.disabled = false);
  }
}
function field(name, label, type = 'text', extra = {}) {
  return {
    name,
    label,
    type,
    ...extra
  };
}
function form(title, fields, submit, submitText = '저장', success = '저장했습니다.') {
  const node = el('form', {
    onsubmit: event => {
      event.preventDefault();
      const values = new FormData(node),
        body = {};
      for (const f of fields) {
        const value = values.get(f.name);
        if (value !== null && value !== '') body[f.name] = f.type === 'number' ? Number(value) : value;
      }
      void run(() => submit(body), success);
    }
  });
  for (const f of fields) {
    const attrs = {
      name: f.name,
      required: !f.optional,
      ...(f.min !== undefined ? {
        min: f.min
      } : {}),
      ...(f.step ? {
        step: f.step
      } : {})
    };
    let input;
    if (f.options) {
      input = el('select', attrs, el('option', {
        value: ''
      }, '선택하세요'), f.options.map(o => el('option', {
        value: o.id
      }, o.name)));
      if (f.value) input.value = f.value;
    } else if (f.type === 'textarea') input = el('textarea', attrs, f.value ?? '');else input = el('input', {
      ...attrs,
      type: f.type,
      value: f.value ?? '',
      minlength: f.type === 'password' ? 12 : undefined
    });
    node.append(el('label', {
      class: f.type === 'textarea' ? 'wide' : ''
    }, f.label + (f.optional ? ' (선택)' : ''), input));
  }
  node.append(el('button', {
    type: 'submit',
    disabled: busy
  }, submitText));
  return el('div', {}, title ? el('h3', {}, title) : null, node);
}
function section(id, title, ...content) {
  return el('section', {
    id
  }, el('h2', {}, title), ...content);
}
function mass(value) {
  if (!Number.isFinite(value) || value <= 0 || !Number.isSafeInteger(Math.round(value * 1000000))) throw new Error('유효한 양수 중량을 입력하세요.');
  return Math.round(value * 1000000);
}
const lotField = () => field('lotId', '원료 로트', 'text', {
  options: data.lots.filter(l => l.commodity !== 'sauce').map(l => ({
    id: l.id,
    name: l.name
  })),
  value: selectedLot
});
const revision = (rows, id) => {
  const row = rows.find(r => r.id === id);
  if (!row) throw new Error('기록을 다시 선택하세요.');
  return row.revision;
};
async function boot() {
  try {
    const setup = await api('setup');
    if (setup.required) {
      renderLogin(true, setup.mode);
      return;
    }
    try {
      session = await api('auth/me');
    } catch (error) {
      if (error.status !== 401) throw error;
      renderLogin(false, setup.mode);
      return;
    }
    await refresh();
  } catch (error) {
    tell(error.message, true);
    root.replaceChildren(button('다시 연결', boot));
  }
}
function renderLogin(setup, mode) {
  account.replaceChildren();
  root.replaceChildren(el('section', {
    class: 'login'
  }, el('h1', {}, setup ? '처음 시작하기' : 'FOODB 로그인'), el('p', {}, mode === 'simulation' ? '시뮬레이션 전용 데이터입니다.' : '기록은 이 컴퓨터에 저장됩니다.'), form('', [...(setup ? [field('name', '이름'), field('organization', '조직 이름')] : []), field('email', '이메일', 'email'), field('password', '비밀번호 (12자 이상)', 'password')], async body => {
    if (setup) await api('setup', body);
    await api('auth/login', {
      email: body.email,
      password: body.password
    });
    session = await api('auth/me');
  }, setup ? '계정 생성 후 시작' : '로그인', '로그인했습니다.')));
}
async function refresh() {
  [data, specs, recipeVersions, holds] = await Promise.all([api('mvp'), list('specifications'), has('chef') || has('kitchen') || has('commercial') ? list('recipes') : Promise.resolve([]), list('holds')]);
  render();
}
function render() {
  account.replaceChildren(el('span', {}, session.organization + ' · ' + session.name), button('새로고침', () => '최신 기록을 불러왔습니다.', true), button('로그아웃', async () => {
    await api('auth/logout', {});
    session = null;
    data = null;
    await boot();
  }, true));
  root.replaceChildren();
  root.append(section('guide', '입고부터 생산 완료까지', el('p', {}, '입고 → 측정 → 품질 판정 → 고정 레시피 승인 → 재고 예약 → 생산 완료'), el('nav', {}, [['receiving', '입고'], ['quality', '측정·품질'], ['recipes', '레시피'], ['prepare', '생산 준비'], ['production', '작업·완료'], ['safety', '안전 보류']].map(([id, label]) => el('a', {
    href: '#' + id
  }, label))), el('p', {}, el('small', {}, 'MVP는 단일 원료 고정 레시피를 사용합니다. 품질 적합 판정과 별개로 보류가 있으면 생산할 수 없습니다.'))));
  if (session.mode === 'simulation') root.append(el('div', {
    class: 'notice'
  }, '시뮬레이션 모드 · 실제 장비·공정·맛의 검증 결과가 아닙니다.'));
  if (!data.retentionApproved && session.mode === 'operational') root.append(section('retention', '첫 설정: 데이터 보관 정책', has('owner') ? form('', [field('reason', '보관 목적과 기간', 'textarea')], body => api('retention-policy', body), '정책 승인') : el('p', {}, '소유자의 보관 정책 승인이 필요합니다.')));
  if (data.recoveryHeld) root.append(section('recovery', '복원 확인 필요', el('p', {}, '재고·증빙·보류 상태를 확인하기 전에는 데이터를 변경할 수 없습니다.'), has('owner') ? form('', [field('reason', '복원 확인 내용', 'textarea')], body => api('recovery/release', body), '확인 후 운영 재개') : null));
  const receiving = section('receiving', '1. 원료 입고와 재고');
  if (has('quality') || has('robotics')) receiving.append(form('', [field('name', '입고 로트명'), field('commodity', '원료 종류', 'text', {
    value: 'tomato'
  }), field('quantityKg', '입고 중량 (kg)', 'number', {
    min: .000001,
    step: .000001
  }), field('provenance', '원산지·공급 정보', 'text', {
    optional: true
  })], async body => {
    const lot = await api('lots', {
      name: body.name,
      commodity: body.commodity,
      quantityMg: mass(body.quantityKg),
      provenance: body.provenance ?? 'unknown'
    });
    selectedLot = lot.id;
  }, '입고 등록', '입고를 등록했습니다. 측정·품질 판정을 진행하세요.'));
  receiving.append(el('div', {
    class: 'scroll'
  }, el('table', {}, el('caption', {}, '현재 재고'), el('thead', {}, el('tr', {}, ['로트', '보유', '예약', '가용', '마지막 판정', '보류'].map(v => el('th', {}, v)))), el('tbody', {}, data.lots.map(l => el('tr', {}, el('td', {}, l.name), el('td', {}, kg(l.onHandMg)), el('td', {}, kg(l.reservedMg)), el('td', {}, kg(l.availableMg)), el('td', {}, labels[l.lastDecision] ?? l.lastDecision), el('td', {}, l.holds.length + '건')))))));
  if (!data.lots.length) receiving.append(el('p', {}, '아직 입고 기록이 없습니다.'));
  root.append(receiving);
  if (has('quality')) renderQuality();
  if (has('chef')) renderRecipes();
  const prepare = section('prepare', '4. 승인된 레시피로 생산 준비', el('p', {}, '지시와 투입량을 확인한 뒤 예약합니다. chef·kitchen 역할이 모두 필요합니다.'));
  if (has('chef') && has('kitchen')) prepare.append(form('', [lotField(), field('recipeVersionId', '승인된 단일 원료 고정 레시피', 'text', {
    options: data.recipes.map(r => ({
      id: r.id,
      name: r.name + ' · ' + kg(r.ingredients[0].quantityMg)
    }))
  })], body => {
    const lot = data.lots.find(l => l.id === body.lotId);
    return api('mvp/prepare', {
      ...body,
      lotRevision: lot.revision,
      recipeRevision: revision(data.recipes, body.recipeVersionId)
    }).then(batch => {
      selectedBatch = batch.id;
    });
  }, '승인 및 재고 예약', '지시를 승인하고 재고를 예약했습니다.'));
  for (const r of data.recipes) prepare.append(el('details', {}, el('summary', {}, r.name + ' — 투입 ' + kg(r.ingredients[0].quantityMg)), el('ol', {}, r.steps.map(s => el('li', {}, s.instruction)))));
  if (!data.recipes.length) prepare.append(el('p', {}, '승인된 고정 레시피가 없습니다.'));
  root.append(prepare);
  const production = section('production', '5. 생산 작업과 완료');
  const batchSelect = el('select', {
    'aria-label': '생산 배치 선택'
  }, el('option', {
    value: ''
  }, '생산 선택'), data.batches.map(b => el('option', {
    value: b.id
  }, b.name + ' · ' + (labels[b.status] ?? b.status))));
  batchSelect.value = selectedBatch;
  const details = el('div', {});
  batchSelect.addEventListener('change', () => {
    selectedBatch = batchSelect.value;
    renderBatch(details);
  });
  production.append(el('label', {}, '생산 배치', batchSelect), details);
  renderBatch(details);
  root.append(production);
  renderSafety();
  if (has('owner')) root.append(section('administration', '운영 관리', form('작업자 추가', [field('name', '이름'), field('email', '이메일', 'email'), field('password', '초기 비밀번호', 'password'), field('roles', '역할 (쉼표로 구분)', 'text', {
    value: 'viewer'
  })], body => api('users', {
    ...body,
    roles: body.roles.split(',').map(r => r.trim())
  }), '작업자 추가'), button('운영 기록 내보내기', async () => {
    const records = await api('exports');
    const url = URL.createObjectURL(new Blob([JSON.stringify(records, null, 2)], {
      type: 'application/json'
    }));
    const a = el('a', {
      href: url,
      download: 'foodb-export.json'
    });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, true)));
}
function renderQuality() {
  const sectionNode = section('quality', '2. 측정·품질 기준·판정');
  sectionNode.append(form('측정 기록', [lotField(), field('attribute', '측정 항목', 'text', {
    options: [{
      id: 'ssc_brix',
      name: '가용성 고형분 (°Bx)'
    }, {
      id: 'ph',
      name: 'pH'
    }],
    value: 'ssc_brix'
  }), field('unit', '단위', 'text', {
    options: [{
      id: '°Bx',
      name: '°Bx'
    }, {
      id: 'pH',
      name: 'pH'
    }],
    value: '°Bx'
  }), field('value', '측정값', 'number', {
    step: 'any'
  }), field('lower', '불확실성 하한', 'number', {
    step: 'any'
  }), field('upper', '불확실성 상한', 'number', {
    step: 'any'
  }), field('basis', '측정 기준', 'text', {
    value: 'fresh weight'
  }), field('method', '측정 방법'), field('observedAt', '측정 시각', 'datetime-local', {
    value: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  })], body => api('observations', {
    lotId: body.lotId,
    attribute: body.attribute,
    value: body.value,
    unit: body.unit,
    basis: body.basis,
    method: body.method,
    scope: 'lot',
    origin: 'operator',
    observedAt: new Date(body.observedAt).toISOString(),
    uncertainty: {
      kind: 'interval',
      lower: body.lower,
      upper: body.upper
    }
  }), '측정 저장'));
  sectionNode.append(form('품질 기준 작성', [field('name', '기준 이름'), field('intendedUse', '사용 용도'), field('attribute', '판정 항목', 'text', {
    options: [{
      id: 'ssc_brix',
      name: '가용성 고형분'
    }, {
      id: 'ph',
      name: 'pH'
    }],
    value: 'ssc_brix'
  }), field('unit', '기준 단위', 'text', {
    options: [{
      id: '°Bx',
      name: '°Bx'
    }, {
      id: 'pH',
      name: 'pH'
    }],
    value: '°Bx'
  }), field('basis', '측정 기준', 'text', {
    value: 'fresh weight'
  }), field('min', '허용 하한', 'number', {
    step: 'any'
  }), field('max', '허용 상한', 'number', {
    step: 'any'
  }), field('maxAgeHours', '측정 유효시간 (시간)', 'number', {
    min: 1,
    step: 1,
    value: 24
  })], body => api('specifications', {
    name: body.name,
    intendedUse: body.intendedUse,
    rules: [{
      attribute: body.attribute,
      unit: body.unit,
      basis: body.basis,
      min: body.min,
      max: body.max,
      maxAgeHours: body.maxAgeHours
    }]
  }), '기준 초안 저장'));
  const drafts = specs.filter(s => s.status === 'draft');
  if (drafts.length) sectionNode.append(form('품질 기준 승인', [field('id', '기준', 'text', {
    options: drafts
  }), field('reason', '승인 근거')], body => api(`specifications/${body.id}/approve`, {
    expectedRevision: revision(drafts, body.id),
    reason: body.reason
  }), '기준 승인'));
  sectionNode.append(form('로트 품질 판정', [lotField(), field('specificationVersionId', '승인된 품질 기준', 'text', {
    options: specs.filter(s => s.status === 'approved')
  })], async body => {
    const result = await api('decisions', {
      ...body,
      scope: 'lot'
    });
    return '판정 저장: ' + (labels[result.status] ?? result.status) + ' — ' + result.reasons.map(r => r.reason).join(', ');
  }, '품질 판정 저장', '판정을 저장했습니다. 재고의 마지막 판정을 확인하세요.'));
  root.append(sectionNode);
}
function renderRecipes() {
  const node = section('recipes', '3. 단일 원료 고정 레시피');
  node.append(form('레시피 작성', [field('name', '레시피 이름'), field('commodity', '원료 종류', 'text', {
    value: 'tomato'
  }), field('ingredientKg', '투입 중량 (kg)', 'number', {
    min: .000001,
    step: .000001
  }), field('yieldKg', '예상 완제품 중량 (kg)', 'number', {
    min: .000001,
    step: .000001
  }), field('steps', '작업 지시 (한 줄에 한 단계)', 'textarea'), field('allergens', '알레르기 정보 (쉼표 구분)', 'text', {
    optional: true
  }), field('validatedDomain', '검증된 사용 범위', 'text', {
    value: 'unvalidated'
  })], body => api('recipes', {
    name: body.name,
    ingredients: [{
      name: body.commodity,
      commodity: body.commodity,
      quantityMg: mass(body.ingredientKg)
    }],
    yieldMg: mass(body.yieldKg),
    steps: body.steps.split('\n').map(s => s.trim()).filter(Boolean).map(instruction => ({
      instruction
    })),
    allergens: (body.allergens ?? '').split(',').map(a => a.trim()).filter(Boolean),
    validatedDomain: body.validatedDomain,
    rules: []
  }), '레시피 초안 저장'));
  const drafts = recipeVersions.filter(r => r.status === 'draft');
  if (drafts.length) node.append(form('레시피 승인', [field('id', '레시피', 'text', {
    options: drafts
  }), field('reason', '승인 근거')], body => api(`recipes/${body.id}/approve`, {
    expectedRevision: revision(drafts, body.id),
    reason: body.reason
  }), '레시피 승인'));
  root.append(node);
}
function renderBatch(target) {
  target.replaceChildren();
  const batch = data.batches.find(b => b.id === selectedBatch);
  if (!batch) {
    target.append(el('p', {}, '작업할 생산 배치를 선택하세요.'));
    return;
  }
  target.append(el('h3', {}, batch.name), el('p', {}, '상태: ' + (labels[batch.status] ?? batch.status)));
  if (batch.instructions) {
    const steps = el('ol', {
      class: 'steps'
    });
    batch.instructions.steps.forEach((step, index) => {
      const recorded = batch.events?.find(e => e.step === index);
      const row = el('li', {}, el('p', {}, step.instruction));
      if (recorded) row.append(el('span', {
        class: 'badge'
      }, '기록됨: ' + recorded.actual));else if (batch.status === 'in_progress' && has('kitchen')) row.append(form('', [field('actual', '실제 작업 내용'), field('deviation', '지시와 다른 점 (기록 시 보류)', 'text', {
        optional: true
      })], body => api(`production/${batch.id}/events`, {
        ...body,
        step: index
      }), '단계 기록'));
      steps.append(row);
    });
    target.append(steps);
  }
  if (batch.status === 'approved' && has('kitchen')) target.append(el('div', {
    class: 'actions'
  }, button('생산 시작', () => api(`production/${batch.id}/start`, {
    expectedRevision: batch.revision
  })), button('생산 취소·예약 해제', () => api(`production/${batch.id}/cancel`, {
    expectedRevision: batch.revision,
    reason: '작업자가 MVP에서 준비된 생산을 취소함'
  }), true)));
  if (batch.status === 'in_progress' && has('kitchen')) target.append(form('생산 완료', [field('yieldKg', '실제 완제품 중량 (kg)', 'number', {
    min: .000001,
    step: .000001
  }), field('assessment', '결과 메모', 'text', {
    optional: true
  })], body => api(`production/${batch.id}/complete`, {
    expectedRevision: batch.revision,
    yieldMg: mass(body.yieldKg),
    assessment: body.assessment
  }), '생산 완료', '완제품 재고와 원료 이력을 저장했습니다.'));
  if (batch.status === 'held' && has('chef')) target.append(form('작업 차이 검토', [field('reason', '검토 및 재개 근거', 'textarea')], body => api(`production/${batch.id}/review`, {
    expectedRevision: batch.revision,
    ...body
  }), '검토 후 재개'));
  if (batch.status === 'completed') target.append(el('div', {
    class: 'notice'
  }, '완제품 ' + kg(batch.yieldMg) + ' · 공정 손실 ' + kg(batch.lossMg)), button('원료 이력 보기', async () => {
    const lineage = await api('lineage/' + batch.finishedLotId);
    const names = Object.fromEntries(data.lots.map(l => [l.id, l.name]));
    window.alert('연결된 원료: ' + lineage.ancestors.map(id => names[id] ?? id).join(', ') + '\n현재 보류: ' + lineage.holds.length + '건');
  }, true));
}
function renderSafety() {
  const node = section('safety', '안전 보류');
  node.append(form('안전 우려 신고', [lotField(), field('reason', '보류 사유', 'textarea')], body => api('holds', {
    ...body,
    kind: 'safety'
  }), '안전 보류 등록', '안전 보류를 등록했습니다. 연결된 원료의 새 생산이 차단됩니다.'));
  const active = holds.filter(h => h.status === 'active');
  if (active.length) node.append(el('ul', {}, active.map(h => el('li', {}, (data.lots.find(l => l.id === h.lotId)?.name ?? h.lotId) + ': ' + h.reason))));
  if (has('safety') && active.length) node.append(form('보류 해제', [field('id', '보류 건', 'text', {
    options: active.map(h => ({
      id: h.id,
      name: h.reason
    }))
  }), field('reason', '해제 근거', 'textarea')], body => api(`holds/${body.id}/release`, {
    expectedRevision: revision(active, body.id),
    reason: body.reason
  }), '검토 후 보류 해제'));
  root.append(node);
}
void boot();
