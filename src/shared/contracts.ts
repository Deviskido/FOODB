import { createHash } from 'node:crypto';
export const roles = ['owner', 'quality', 'robotics', 'chef', 'kitchen', 'commercial', 'delivery', 'safety', 'viewer'] as const;
export type Role = typeof roles[number];
export type Mode = 'operational' | 'simulation';
export interface Actor {
  id: string;
  orgId: string;
  roles: Role[];
  platformAdmin: boolean;
  name: string;
}
export interface RecordRow {
  id: string;
  org_id: string;
  created_at: string;
  revision: number;
  name: string;
  status: string;
  body: string;
  [key: string]: unknown;
}
export const attributes = ['ssc_brix', 'sugar', 'ph', 'titratable_acidity', 'mass', 'dimension', 'color', 'firmness', 'ripeness'] as const;
export const units: Record<string, string[]> = {
  ssc_brix: ['°Bx'],
  sugar: ['g/100g'],
  ph: ['pH'],
  titratable_acidity: ['g/100g'],
  mass: ['mg', 'g', 'kg'],
  dimension: ['mm'],
  color: ['category'],
  firmness: ['N'],
  ripeness: ['category']
};
export class AppError extends Error {
  public code: string;
  public status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export function requireThat(condition: unknown, message: string, status = 422, code = 'CONSTRAINT'): asserts condition {
  if (!condition) throw new AppError(status, code, message);
}
export function text(value: unknown, field: string, max = 500): string {
  requireThat(typeof value === 'string' && value.trim().length > 0 && value.length <= max, `${field} is required (maximum ${max} characters).`, 400);
  return value.trim();
}
export function number(value: unknown, field: string, min = -Infinity): number {
  requireThat(typeof value === 'number' && Number.isFinite(value) && value >= min, `${field} must be a finite number >= ${min}.`, 400);
  return value;
}
export function mass(value: unknown): number {
  const n = number(value, 'Mass in mg', 1);
  requireThat(Number.isSafeInteger(n), 'Mass must be an integer in milligrams.', 400);
  return n;
}
export function date(value: unknown, field: string): string {
  const s = text(value, field);
  requireThat(Number.isFinite(Date.parse(s)), `${field} must be a valid timestamp.`, 400);
  return new Date(s).toISOString();
}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical((value as Record<string, unknown>)[k])).join(',') + '}';
  return JSON.stringify(value) ?? 'null';
}
export function hash(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}
