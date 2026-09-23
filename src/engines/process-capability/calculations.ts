import { ok } from '../shared/result';
import { fail, type ProcessCapabilityResult } from './errors';

/**
 * Придатність процесу (docs/research/formula-baseline.md, розділ 8): Cp зіставляє поле допуску з
 * розкидом процесу, Cpk додатково враховує зміщення середнього.
 */

/** QC-04: Cp = (USL − LSL) / (6σ). */
export function processCapabilityCp(upperLimit: number, lowerLimit: number, sigma: number): ProcessCapabilityResult<number> {
  if (upperLimit <= lowerLimit) return fail('invalid-tolerance-field');
  if (!(sigma > 0)) return fail('non-positive-sigma');
  return ok((upperLimit - lowerLimit) / (6 * sigma));
}

/** QC-05: Cpk = min[(USL − μ)/(3σ); (μ − LSL)/(3σ)]. */
export function processCapabilityCpk(upperLimit: number, lowerLimit: number, mean: number, sigma: number): ProcessCapabilityResult<number> {
  if (upperLimit <= lowerLimit) return fail('invalid-tolerance-field');
  if (!(sigma > 0)) return fail('non-positive-sigma');
  return ok(Math.min((upperLimit - mean) / (3 * sigma), (mean - lowerLimit) / (3 * sigma)));
}
