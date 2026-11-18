import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
const kilograms = (mg: number) => new Intl.NumberFormat('ko-KR', {
  maximumFractionDigits: 6
}).format(mg / 1000000) + ' kg';
const labels: Record<string, string> = {
  approved: '생산 준비',
  in_progress: '생산 중',
  completed: '완료',
  held: '보류',
  cancelled: '취소',
  suitable: '적합',
  unsuitable: '부적합',
  review: '검토 필요',
  unassessed: '미판정'
};
const link = (page: string, tab = page, record?: string) => `#/${page}?tab=${tab}${record ? '&record=' + record : ''}`;
export default function Mvp({
  session,
  version
}: {
  session: any;
  version: number;
}) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [reload, setReload] = useState(0),
    [lotId, setLotId] = useState(''),
    [recipeId, setRecipeId] = useState(''),
    [batchId, setBatchId] = useState('');
  const has = (role: string) => session.roles.includes(role);
  useEffect(() => {
    let alive = true;
    api('mvp').then(result => {
      if (alive) {
        setData(result);
        setError('');
      }
    }).catch(e => {
      if (alive) setError(e.message);
    });
    return () => {
      alive = false;
    };
  }, [version, reload, session.orgId]);
  async function act(operation: () => Promise<any>, message: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await operation();
      setNotice(message);
      setReload(n => n + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function submit(e: FormEvent<HTMLFormElement>, operation: (fields: FormData) => Promise<any>, message: string) {
    e.preventDefault();
    const form = e.currentTarget;
    const fields = new FormData(form);
    void act(async () => {
      await operation(fields);
      form.reset();
    }, message);
  }
  const batch = data?.batches.find((b: any) => b.id === batchId),
    recipe = data?.recipes.find((r: any) => r.id === recipeId),
    lot = data?.lots.find((l: any) => l.id === lotId);
  return <div className="mvp" lang="ko"><section className="panel"><p className="eyebrow">FOODB MVP · 수동 입고와 고정 레시피 생산</p><h2>입고부터 생산 완료까지</h2><p>① 입고 등록 → ② 측정·품질 판정 → ③ 고정 레시피 승인 → ④ 생산 준비 → ⑤ 작업 기록·완료</p><div className="record-links"><a href={link('observations')}>측정 기록</a><a href={link('specifications')}>품질 기준 작성·승인</a><a href={link('specifications', 'decisions')}>로트 품질 판정</a><a href={link('recipes')}>레시피 작성·승인</a><a href={link('specifications', 'holds')}>안전 보류 관리</a></div><p><small>품질 기준은 사용자가 승인합니다. 적합 판정은 식품 안전이나 맛의 검증을 대신하지 않습니다. MVP 생산 준비는 chef·kitchen 권한이 모두 필요하며, 역할을 나눈 팀은 레시피·생산 화면을 사용하세요.</small></p></section>
 {error && <div className="error" role="alert">{error}</div>}{notice && <div className="notice" role="status">{notice}</div>}
 {!data ? <p role="status">작업 기록을 불러오는 중…</p> : <>
 {data.recoveryHeld && <section className="panel"><h3>복원 데이터 확인</h3><p>재고·증빙·보류 상태를 검토한 뒤 운영을 재개하세요.</p>{has('owner') && <form onSubmit={e => submit(e, f => api('recovery/release', {
          reason: f.get('reason')
        }), '복원 확인을 기록하고 운영 보류를 해제했습니다.')}><label>복원 확인 내용<input name="reason" required /></label><button disabled={busy}>확인 후 운영 재개</button></form>}</section>}
 {!data.retentionApproved && session.mode === 'operational' && <section className="panel"><h3>처음 사용: 보관 정책 승인</h3><p>입고 기록을 만들기 전에 데이터 보관 목적과 기간을 입력하세요.</p>{has('owner') ? <form onSubmit={e => submit(e, f => api('retention-policy', {
          reason: f.get('reason')
        }), '보관 정책을 저장했습니다.')}><label>보관 정책<textarea name="reason" required /></label><button disabled={busy}>보관 정책 승인</button></form> : <p>조직 소유자에게 보관 정책 승인을 요청하세요.</p>}</section>}
 <section className="panel"><h3>1. 원료 입고</h3>{has('quality') || has('robotics') ? <form className="data-form" onSubmit={e => submit(e, async f => {
          const amount = String(f.get('kg'));
          if (!/^\d+(\.\d{1,6})?$/.test(amount)) throw new Error('중량은 소수점 6자리 이하의 양수로 입력하세요.');
          const quantityMg = Math.round(Number(amount) * 1000000);
          const received = await api('lots', {
            name: f.get('name'),
            commodity: f.get('commodity'),
            quantityMg,
            provenance: f.get('provenance') || 'unknown'
          });
          setLotId(received.id);
        }, '입고를 등록했습니다. 측정 기록과 품질 판정을 진행하세요.')}><label>입고 로트명<input name="name" required maxLength={100} /></label><label>원료 종류<input name="commodity" defaultValue="tomato" required /></label><label>입고 중량 (kg)<input name="kg" type="number" min="0.000001" step="0.000001" required /></label><label>공급·원산지 정보<input name="provenance" placeholder="모르면 비워두세요" /></label><button disabled={busy || data.recoveryHeld}>입고 등록</button></form> : <p>입고 담당자가 등록한 재고를 아래에서 확인하세요.</p>}
 <div className="table-scroll"><table><caption>현재 재고와 마지막 품질 판정</caption><thead><tr><th>로트</th><th>보유 / 예약 / 사용 가능</th><th>마지막 판정</th><th>보류</th></tr></thead><tbody>{data.lots.map((l: any) => <tr key={l.id}><td><a href={link('lots', 'lots', l.id)}>{l.name}</a></td><td>{kilograms(l.onHandMg)} / {kilograms(l.reservedMg)} / {kilograms(l.availableMg)}</td><td>{labels[l.lastDecision] ?? l.lastDecision}</td><td>{l.holds.length ? '보류 ' + l.holds.length + '건' : '없음'}</td></tr>)}</tbody></table>{!data.lots.length && <p>입고된 원료가 없습니다.</p>}</div><small>마지막 판정 이후 측정이 만료되거나 보류가 발생할 수 있습니다. 생산 준비와 시작 시 다시 확인합니다.</small></section>
 <section className="panel"><h3>2. 승인된 고정 레시피로 생산 준비</h3><p>품질 적합 판정을 받은 원료와 승인된 단일 원료 레시피를 선택하세요. 준비 시 정확한 재료량을 예약하며, 시작할 때 재고에서 차감합니다.</p><form className="data-form" onSubmit={e => {
          e.preventDefault();
          void act(async () => {
            if (!lot || !recipe) throw new Error('원료와 레시피를 선택하세요.');
            const prepared = await api('mvp/prepare', {
              lotId: lot.id,
              lotRevision: lot.revision,
              recipeVersionId: recipe.id,
              recipeRevision: recipe.revision
            });
            setBatchId(prepared.id);
          }, '재고를 예약하고 생산을 준비했습니다. 작업 지시를 확인한 뒤 시작하세요.');
        }}><label>원료 로트<select required value={lotId} onChange={e => setLotId(e.target.value)}><option value="">원료 선택</option>{data.lots.filter((l: any) => l.availableMg > 0).map((l: any) => <option key={l.id} value={l.id}>{l.name} · {kilograms(l.availableMg)}</option>)}</select></label><label>승인된 고정 레시피<select required value={recipeId} onChange={e => setRecipeId(e.target.value)}><option value="">레시피 선택</option>{data.recipes.map((r: any) => <option key={r.id} value={r.id}>{r.name} · {kilograms(r.ingredients[0].quantityMg)}</option>)}</select></label>{recipe && <div className="wide"><p>투입량: {kilograms(recipe.ingredients[0].quantityMg)} · 예상 수율: {kilograms(recipe.yieldMg)}</p><ol>{recipe.steps.map((s: any, i: number) => <li key={i}>{s.instruction}</li>)}</ol></div>}<button disabled={busy || data.recoveryHeld || !has('chef') || !has('kitchen')}>지시 승인 및 재고 예약</button></form>{!data.recipes.length && <p>표시할 레시피가 없습니다. 레시피 화면에서 단일 원료·고정 지시로 작성하고 승인하세요.</p>}</section>
 <section className="panel"><h3>3. 작업 기록과 생산 완료</h3><label>생산 배치<select value={batchId} onChange={e => setBatchId(e.target.value)}><option value="">생산 선택</option>{data.batches.map((b: any) => <option key={b.id} value={b.id}>{b.name} · {labels[b.status] ?? b.status}</option>)}</select></label>{batch && <div className="mvp-batch"><p>상태: <strong>{labels[batch.status] ?? batch.status}</strong></p>{batch.status === 'approved' && <div className="actions"><button disabled={busy || !has('kitchen')} onClick={() => void act(() => api(`production/${batch.id}/start`, {
              expectedRevision: batch.revision
            }), '생산을 시작하고 예약 재고를 소비했습니다.')}>생산 시작</button><button className="secondary" disabled={busy || !has('kitchen')} onClick={() => void act(() => api(`production/${batch.id}/cancel`, {
              expectedRevision: batch.revision,
              reason: '작업자가 MVP 화면에서 준비된 생산을 취소함'
            }), '생산을 취소하고 예약 재고를 반환했습니다.')}>생산 취소·예약 해제</button></div>}
 {batch.instructions && <ol className="mvp-steps">{batch.instructions.steps.map((s: any, index: number) => {
              const done = batch.events?.some((event: any) => event.step === index);
              return <li key={index}><p>{s.instruction}</p>{done ? <span className="badge">작업 기록 있음</span> : batch.status === 'in_progress' && has('kitchen') ? <form onSubmit={e => submit(e, f => api(`production/${batch.id}/events`, {
                  step: index,
                  actual: f.get('actual'),
                  deviation: f.get('deviation') || undefined
                }), '작업 사실을 기록했습니다.')}><label>실제 작업 내용<input name="actual" required /></label><label>지시와 다른 점 (있으면 생산 보류)<input name="deviation" /></label><button disabled={busy}>작업 기록 저장</button></form> : null}</li>;
            })}</ol>}
 {batch.status === 'in_progress' && has('kitchen') && <form onSubmit={e => submit(e, f => api(`production/${batch.id}/complete`, {
            expectedRevision: batch.revision,
            yieldMg: Math.round(Number(f.get('yieldKg')) * 1000000),
            assessment: f.get('assessment')
          }), '생산을 완료하고 완제품 재고를 등록했습니다.')}><label>실제 완제품 중량 (kg)<input name="yieldKg" type="number" min="0.000001" step="0.000001" required /></label><label>결과 메모<input name="assessment" /></label><button disabled={busy}>생산 완료</button></form>}
 {batch.status === 'held' && <p>작업 차이가 기록되어 보류 중입니다. <a href={link('production', 'production', batch.id)}>상세 화면에서 chef 검토</a>를 진행하세요. 안전 보류는 별도 해제가 필요합니다.</p>}
 {batch.status === 'completed' && <div className="notice">완제품 {kilograms(batch.yieldMg)} · 공정 손실 {kilograms(batch.lossMg)} · <a href={link('lots', 'lots', batch.finishedLotId)}>완제품 이력 보기</a></div>}</div>}{!data.batches.length && <p>아직 생산 기록이 없습니다.</p>}</section>
 </>}</div>;
}
