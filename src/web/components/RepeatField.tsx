import { useState } from 'react';
export function RepeatField({
  name,
  kind,
  options = []
}: {
  name: string;
  kind: string;
  options?: any[];
}) {
  const template = () => kind === 'ingredients' ? {
    name: '',
    commodity: '',
    quantityMg: 0
  } : kind === 'inputs' ? {
    lotId: '',
    ingredientIndex: 0,
    quantityMg: 0
  } : {
    instruction: ''
  };
  const [rows, setRows] = useState<any[]>([template()]);
  const change = (index: number, key: string, value: any) => setRows(previous => previous.map((row, i) => i === index ? {
    ...row,
    [key]: value
  } : row));
  return <div className="repeat-field"><input name={name} type="hidden" value={JSON.stringify(rows)} />{rows.map((row, index) => <div className="repeat-row" key={index}><span className="repeat-index">{index + 1}</span>{kind === 'ingredients' ? <><input aria-label={`Ingredient ${index + 1} name`} placeholder="Ingredient name" value={row.name} required onChange={e => change(index, 'name', e.target.value)} /><input aria-label={`Ingredient ${index + 1} commodity`} placeholder="Commodity, e.g. tomato" value={row.commodity} required onChange={e => change(index, 'commodity', e.target.value)} /><input aria-label={`Ingredient ${index + 1} mass in mg`} type="number" min="1" placeholder="Mass (mg)" required value={row.quantityMg || ''} onChange={e => change(index, 'quantityMg', Number(e.target.value))} /></> : kind === 'inputs' ? <><select aria-label={`Input ${index + 1} lot`} value={row.lotId} required onChange={e => change(index, 'lotId', e.target.value)}><option value="">Select lot</option>{options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select><input aria-label={`Input ${index + 1} ingredient index`} title="Ingredient index (0 is first ingredient)" type="number" min="0" required value={row.ingredientIndex} onChange={e => change(index, 'ingredientIndex', Number(e.target.value))} /><input aria-label={`Input ${index + 1} mass in mg`} type="number" min="1" placeholder="Mass (mg)" required value={row.quantityMg || ''} onChange={e => change(index, 'quantityMg', Number(e.target.value))} /></> : <textarea aria-label={`Step ${index + 1}`} placeholder="Exact preparation instruction" value={row.instruction} required onChange={e => change(index, 'instruction', e.target.value)} />}<button type="button" className="secondary" disabled={rows.length === 1} aria-label={`Remove ${kind} row ${index + 1}`} onClick={() => setRows(v => v.filter((_, i) => i !== index))}>Remove</button></div>)}<button type="button" className="secondary" onClick={() => setRows(v => [...v, template()])}>+ Add {kind === 'ingredients' ? 'ingredient' : kind === 'inputs' ? 'input' : 'step'}</button></div>;
}
