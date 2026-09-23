import { ok } from '../shared/result';
import { fail, type FacilityLocationResult } from './errors';

/**
 * Формули вибору місця розташування (docs/research/formula-baseline.md, LOC-01, LOC-02).
 */

export interface WeightedPoint {
  readonly x: number;
  readonly y: number;
  /** Обсяг перевезень до/від точки (Qi) — вага точки в розрахунку центру ваги. */
  readonly weight: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** LOC-01: Бал варіанта = Σ (вага фактора × оцінка варіанта за фактором). */
export function factorRatingScore(weights: readonly number[], scores: readonly number[]): FacilityLocationResult<number> {
  if (weights.length === 0 || scores.length === 0) return fail('empty-factors');
  if (weights.length !== scores.length) return fail('length-mismatch');
  if (weights.some((weight) => !Number.isFinite(weight)) || scores.some((score) => !Number.isFinite(score))) return fail('non-finite-value');
  if (weights.some((weight) => weight < 0) || scores.some((score) => score < 0)) return fail('negative-value');
  const total = weights.reduce((sum, weight, index) => sum + weight * (scores[index] as number), 0);
  return ok(total);
}

/** LOC-02: x* = Σ(Qᵢ·xᵢ) / ΣQᵢ; y* = Σ(Qᵢ·yᵢ) / ΣQᵢ. */
export function centerOfGravity(points: readonly WeightedPoint[]): FacilityLocationResult<Point> {
  if (points.length === 0) return fail('empty-points');
  if (points.some((point) => point.weight < 0)) return fail('negative-value');
  const totalWeight = points.reduce((sum, point) => sum + point.weight, 0);
  if (!(totalWeight > 0)) return fail('non-positive-weight');
  const x = points.reduce((sum, point) => sum + point.weight * point.x, 0) / totalWeight;
  const y = points.reduce((sum, point) => sum + point.weight * point.y, 0) / totalWeight;
  return ok({ x, y });
}
