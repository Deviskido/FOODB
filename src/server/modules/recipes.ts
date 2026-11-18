import { Store } from '../db';
import { Inventory } from './inventory';
import { Quality } from './quality';
import { type Actor, requireThat, text, mass, number } from '../../shared/contracts';
import { permit, readRecipes } from '../../shared/permissions';
export class Recipes {
  public quality: Quality;
  public inv: Inventory;
  public s: Store;
  constructor(s: Store, inv: Inventory, quality: Quality) {
    this.s = s;
    this.inv = inv;
    this.quality = quality;
  }
  validate(b: any) {
    text(b.name, 'Recipe name');
    requireThat(Array.isArray(b.ingredients) && b.ingredients.length, 'Ingredients are required.', 400);
    for (const i of b.ingredients) {
      text(i.name, 'Ingredient');
      mass(i.quantityMg);
      if (i.commodity !== undefined) text(i.commodity, 'Ingredient commodity');
    }
    requireThat(Array.isArray(b.steps) && b.steps.length, 'Steps are required.', 400);
    for (const step of b.steps) {
      text(step.instruction, 'Instruction', 2000);
      if (step.seconds !== undefined) number(step.seconds, 'Duration', 0);
      if (step.temperatureC !== undefined) number(step.temperatureC, 'Temperature');
    }
    mass(b.yieldMg);
    requireThat(b.yieldMg <= b.ingredients.reduce((total: number, i: any) => total + i.quantityMg, 0), 'Expected yield cannot exceed declared input mass.');
    requireThat(Array.isArray(b.allergens), 'Declare allergens, including an empty list when applicable.', 400);
    text(b.validatedDomain, 'Validated domain (use unvalidated when unknown)');
    for (const rule of b.rules ?? []) {
      text(rule.attribute, 'Policy attribute');
      text(rule.unit, 'Policy unit');
      text(rule.basis, 'Policy basis');
      for (const key of ['slope', 'reference', 'inputMin', 'inputMax', 'outputMin', 'outputMax']) number(rule[key], key);
      requireThat(rule.inputMin <= rule.inputMax && rule.outputMin <= rule.outputMax, 'Policy bounds are inverted.', 400);
      requireThat(Number.isInteger(rule.index) && rule.index >= 0, 'Policy target index must be a nonnegative integer.', 400);
      requireThat(rule.target === 'ingredient' || rule.target === 'step', 'Unknown policy target.', 400);
      if (rule.target === 'ingredient') {
        requireThat(rule.index < b.ingredients.length && rule.outputMin > 0, 'Invalid ingredient policy target.', 400);
      } else {
        requireThat(rule.index < b.steps.length && ['seconds', 'temperatureC'].includes(rule.field), 'Invalid step policy target.', 400);
        number(b.steps[rule.index][rule.field], 'Initial step value');
      }
    }
  }
  create(a: Actor, b: any) {
    permit(a, 'chef');
    this.validate(b);
    const recipe = b.recipeId ? this.s.get('recipes', a.orgId, b.recipeId) : this.s.add('recipes', a, {
      name: b.name
    }, 'private');
    return this.s.add('recipe_versions', a, {
      ...b,
      recipeId: recipe.id,
      simulation: this.s.mode === 'simulation'
    }, 'draft');
  }
  approve(a: Actor, id: string, b: any) {
    permit(a, 'chef');
    const v = this.s.get('recipe_versions', a.orgId, id);
    requireThat(v.status === 'draft', 'Only draft versions can be approved.');
    text(b.reason, 'Approval reason');
    return this.s.update('recipe_versions', a, id, b.expectedRevision, {
      reason: b.reason,
      approvedBy: a.id
    }, 'approved');
  }
  entitled(a: Actor, ref: any) {
    requireThat(readRecipes(a), 'Private recipe access is restricted.', 403);
    if (ref.kind === 'private') {
      return this.s.get('recipe_versions', a.orgId, ref.versionId);
    }
    requireThat(ref.kind === 'catalog', 'Invalid recipe reference.', 400);
    const v = this.s.one('SELECT * FROM catalog_recipe_versions WHERE id=?', ref.versionId);
    requireThat(v, 'Recipe not found.', 404);
    const now = this.s.now();
    const license = this.s.list('licenses', a.orgId).find(l => l.catalogVersionId === ref.versionId && l.status === 'active' && l.startsAt <= now && l.expiresAt > now && l.production === true);
    requireThat(license, 'An active production entitlement is required.', 403);
    return {
      ...JSON.parse(v.body),
      id: v.id,
      status: v.status,
      licenseId: license.id
    };
  }
  inputQuality(a: Actor, lotId: string, decisionId?: string) {
    const latest = this.s.list('quality_decisions', a.orgId).find(d => d.lotId === lotId && d.scope === 'lot');
    const decision = decisionId ? this.s.get('quality_decisions', a.orgId, decisionId) : latest;
    if (decisionId) requireThat(latest?.id === decisionId, '품질 판정이 변경되었습니다. 준비된 생산을 취소하고 최신 판정으로 다시 준비하세요.', 409);
    requireThat(decision && decision.lotId === lotId && decision.status === 'suitable', 'A suitable lot-scoped quality decision is required.');
    const spec = this.s.get('specification_versions', a.orgId, decision.specificationVersionId);
    requireThat(spec.status === 'approved', 'The input specification is no longer approved.');
    const current = this.s.list('observations', a.orgId);
    for (const o of decision.inputs) {
      const rule = spec.rules.find((r: any) => r.attribute === o.attribute);
      requireThat(this.quality.usable(a, o, rule.maxAgeHours) === 'valid' && !current.some(x => x.supersedesId === o.id), 'Input quality evidence expired or was superseded.');
    }
    return decision.id;
  }
  propose(a: Actor, b: any) {
    permit(a, 'chef');
    const recipe = this.entitled(a, b.recipeRef);
    requireThat(recipe.status === 'approved', 'An approved recipe is required.');
    requireThat(Array.isArray(b.inputs) && b.inputs.length, 'Select input lots.', 400);
    requireThat(new Set(b.inputs.map((i: any) => i.lotId)).size === b.inputs.length, 'Duplicate input lot.', 400);
    const inputs = b.inputs.map((input: any) => ({
      ...input,
      ingredientIndex: input.ingredientIndex ?? (recipe.ingredients.length === 1 ? 0 : undefined)
    }));
    const snapshot = inputs.map((i: any) => {
      mass(i.quantityMg);
      requireThat(Number.isInteger(i.ingredientIndex) && recipe.ingredients[i.ingredientIndex], 'Map every input to an approved ingredient.', 400);
      this.inv.eligible(a, i.lotId);
      const lot = this.s.get('lots', a.orgId, i.lotId);
      const ingredient = recipe.ingredients[i.ingredientIndex];
      requireThat(lot.commodity.toLowerCase() === (ingredient.commodity ?? ingredient.name).toLowerCase(), 'Input commodity does not match the approved ingredient.');
      return {
        ...i,
        revision: lot.revision,
        decisionId: this.inputQuality(a, lot.id)
      };
    });
    for (let i = 0; i < recipe.ingredients.length; i++) requireThat(snapshot.filter((x: any) => x.ingredientIndex === i).reduce((sum: number, x: any) => sum + x.quantityMg, 0) === recipe.ingredients[i].quantityMg, 'Input mass must match each approved recipe ingredient.');
    const instructions = structuredClone(recipe),
      reasons: string[] = [],
      observations: any[] = [];
    const adjustments = new Map<string, {
      target: any;
      field: string;
      delta: number;
      rules: any[];
    }>();
    for (const rule of recipe.rules ?? []) {
      const inputIndex = rule.inputIndex ?? (snapshot.length === 1 ? 0 : undefined);
      const input = snapshot[inputIndex];
      if (!input) {
        reasons.push(`${rule.attribute}: policy must identify its decisive input lot`);
        continue;
      }
      const candidates = this.s.list('observations', a.orgId).filter(o => o.lotId === input.lotId);
      const superseded = new Set(candidates.map(o => o.supersedesId));
      const o = candidates.find(o => !superseded.has(o.id) && o.attribute === rule.attribute && o.scope === 'lot');
      if (!o || this.quality.usable(a, o, rule.maxAgeHours ?? 24) !== 'valid' || !o.uncertainty || o.unit !== rule.unit || o.basis !== rule.basis || o.uncertainty.lower < rule.inputMin || o.uncertainty.upper > rule.inputMax) {
        reasons.push(`${rule.attribute}: evidence missing, uncertain or outside policy bounds`);
        continue;
      }
      observations.push({
        ...o,
        policyMaxAgeHours: rule.maxAgeHours ?? 24
      });
      const target = rule.target === 'ingredient' ? instructions.ingredients[rule.index] : instructions.steps[rule.index];
      const field = rule.target === 'ingredient' ? 'quantityMg' : rule.field;
      const key = rule.target + ':' + rule.index + ':' + field;
      const accumulated = adjustments.get(key) ?? {
        target,
        field,
        delta: 0,
        rules: []
      };
      accumulated.delta += rule.slope * (o.value - rule.reference);
      accumulated.rules.push(rule);
      adjustments.set(key, accumulated);
    }
    for (const {
      target,
      field,
      delta,
      rules
    } of adjustments.values()) {
      const output = target[field] + delta;
      if (!Number.isFinite(output) || rules.some(r => output < r.outputMin || output > r.outputMax)) {
        reasons.push('Combined adjustment exceeds approved output bounds');
        continue;
      }
      target[field] = Math.round(output);
    }
    for (let i = 0; i < instructions.ingredients.length; i++) {
      const group = snapshot.filter((x: any) => x.ingredientIndex === i);
      const desired = instructions.ingredients[i].quantityMg,
        original = recipe.ingredients[i].quantityMg;
      let assigned = 0;
      group.forEach((input: any, index: number) => {
        input.quantityMg = index === group.length - 1 ? desired - assigned : Math.floor(input.quantityMg * desired / original);
        assigned += input.quantityMg;
        if (input.quantityMg <= 0 || this.inv.stock(a, input.lotId).availableMg < input.quantityMg) reasons.push('Adapted input quantity is unavailable');
      });
    }
    return this.s.add('adaptations', a, {
      name: recipe.name,
      recipeRef: b.recipeRef,
      recipeRevision: recipe.revision ?? 1,
      inputs: snapshot,
      instructions,
      observations,
      reasons,
      origin: this.s.mode
    }, reasons.length ? 'unavailable' : 'proposed');
  }
  approveAdaptation(a: Actor, id: string, b: any) {
    permit(a, 'chef');
    const p = this.s.get('adaptations', a.orgId, id);
    requireThat(p.status === 'proposed', 'Only feasible proposals can be approved.');
    requireThat(p.revision === b.expectedRevision, 'Refresh this proposal.', 409);
    this.recheck(a, p);
    for (const i of p.inputs) this.inv.reserve(a, i.lotId, id, i.quantityMg);
    return this.s.update('adaptations', a, id, p.revision, {
      approvedBy: a.id
    }, 'approved');
  }
  recheck(a: Actor, p: any) {
    const recipe = this.entitled(a, p.recipeRef);
    requireThat(recipe.status === 'approved', 'Recipe is no longer approved.');
    for (const input of p.inputs) {
      const lot = this.s.get('lots', a.orgId, input.lotId);
      requireThat(lot.revision === input.revision, 'Inventory changed. Cancel this proposal and regenerate.', 409);
      this.inv.eligible(a, lot.id);
      this.inputQuality(a, lot.id, input.decisionId);
    }
    for (const o of p.observations) {
      requireThat(this.quality.usable(a, o, o.policyMaxAgeHours) === 'valid', 'Decisive evidence is no longer usable.');
      requireThat(!this.s.list('observations', a.orgId).some(x => x.supersedesId === o.id), 'Decisive evidence was superseded.');
    }
  }
}
