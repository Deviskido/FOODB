import { type Actor, type Role, requireThat } from './contracts';
export function permit(actor: Actor, ...allowed: Role[]) {
  requireThat(actor.roles.some(r => allowed.includes(r)), 'Your role cannot perform this action.', 403, 'FORBIDDEN');
}
export const readRecipes = (a: Actor) => a.roles.some(r => ['chef', 'kitchen', 'commercial'].includes(r));
