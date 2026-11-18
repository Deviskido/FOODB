import { type Actor, requireThat } from '../../shared/contracts';
import { permit, readRecipes } from '../../shared/permissions';
import { Store } from '../db';
import { Inventory } from './inventory';
import { Recipes } from './recipes';
import { Production } from './production';

/** Minimal workflow: one produce ingredient, fixed private instructions, human approval. */
export class Mvp {
  private production: Production;
  private recipes: Recipes;
  private inventory: Inventory;
  private s: Store;
  constructor(s: Store, inventory: Inventory, recipes: Recipes, production: Production) {
    this.s = s;
    this.inventory = inventory;
    this.recipes = recipes;
    this.production = production;
  }
  summary(a: Actor) {
    const decisions = this.s.list('quality_decisions', a.orgId);
    const canCook = a.roles.some(r => r === 'chef' || r === 'kitchen');
    const events = canCook ? this.s.all('SELECT * FROM production_events WHERE org_id=? ORDER BY created_at,rowid', a.orgId) : [];
    return {
      retentionApproved: !!this.s.one('SELECT value FROM metadata WHERE key=?', 'retention:' + a.orgId),
      recoveryHeld: this.s.one("SELECT value FROM metadata WHERE key='recovery'")?.value === 'held',
      lots: this.s.list('lots', a.orgId).map(l => ({
        ...l,
        ...this.inventory.stock(a, l.id),
        holds: this.inventory.holds(a, l.id),
        lastDecision: decisions.find(d => d.lotId === l.id && d.scope === 'lot')?.status ?? 'unassessed'
      })),
      recipes: readRecipes(a) ? this.s.list('recipe_versions', a.orgId).filter(r => r.status === 'approved' && r.ingredients.length === 1 && !(r.rules ?? []).length) : [],
      batches: this.s.list('production_batches', a.orgId).map(batch => {
        let {
          instructions,
          ...summary
        } = batch;
        if (canCook && batch.status === 'approved') {
          try {
            const proposal = this.s.get('adaptations', a.orgId, batch.adaptationId);
            this.recipes.entitled(a, proposal.recipeRef);
            instructions = proposal.instructions;
          } catch {
            instructions = undefined;
          }
        }
        return canCook ? {
          ...summary,
          instructions,
          events: events.filter(e => e.batch_id === batch.id).map(e => ({
            ...JSON.parse(e.body),
            createdAt: e.created_at
          }))
        } : summary;
      })
    };
  }
  prepare(a: Actor, b: any) {
    permit(a, 'chef');
    permit(a, 'kitchen');
    const recipe = this.s.get('recipe_versions', a.orgId, b.recipeVersionId);
    requireThat(recipe.status === 'approved' && recipe.ingredients.length === 1 && !(recipe.rules ?? []).length, 'MVP 생산은 승인된 단일 원료 고정 레시피를 선택하세요.');
    requireThat(recipe.revision === b.recipeRevision, '레시피가 변경되었습니다. 새로고침 후 확인하세요.', 409);
    const lot = this.s.get('lots', a.orgId, b.lotId);
    requireThat(lot.revision === b.lotRevision, '재고가 변경되었습니다. 새로고침 후 확인하세요.', 409);
    const proposed = this.recipes.propose(a, {
      recipeRef: {
        kind: 'private',
        versionId: recipe.id
      },
      inputs: [{
        lotId: lot.id,
        ingredientIndex: 0,
        quantityMg: recipe.ingredients[0].quantityMg
      }]
    });
    const approved = this.recipes.approveAdaptation(a, proposed.id, {
      expectedRevision: proposed.revision
    });
    return this.production.plan(a, {
      adaptationId: approved.id,
      name: b.name ?? recipe.name
    });
  }
}
