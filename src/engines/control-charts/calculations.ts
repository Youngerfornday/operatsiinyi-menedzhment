import { ok } from '../shared/result';
import { fail, type ControlChartResult } from './errors';
import { xbarRConstantsFor } from './constants';
import type { PChartLimits, XbarRLimits } from './types';

/**
 * Контрольні карти статистичного контролю процесу (docs/research/formula-baseline.md, розділ 8):
 * x̄-R за кількісною ознакою (QC-01) і p-карта за альтернативною ознакою (QC-02).
 */

/** QC-01: UCLx̄ = X̿ + A2·R̄; LCLx̄ = X̿ − A2·R̄; UCLR = D4·R̄; LCLR = D3·R̄. */
export function xbarRLimits(grandMean: number, meanRange: number, subgroupSize: number): ControlChartResult<XbarRLimits> {
  if (subgroupSize <= 0) return fail('non-positive-subgroup-size');
  if (meanRange < 0) return fail('negative-range');
  const constants = xbarRConstantsFor(subgroupSize);
  if (!constants) return fail('unsupported-subgroup-size');
  return ok({
    centerXbar: grandMean,
    upperXbar: grandMean + constants.a2 * meanRange,
    lowerXbar: grandMean - constants.a2 * meanRange,
    centerRange: meanRange,
    upperRange: constants.d4 * meanRange,
    lowerRange: constants.d3 * meanRange,
  });
}

/** QC-02: UCLp = p̄ + 3√(p̄(1 − p̄)/n); LCLp = p̄ − 3√(p̄(1 − p̄)/n), обрізана до 0. */
export function pChartLimits(meanProportion: number, subgroupSize: number): ControlChartResult<PChartLimits> {
  if (subgroupSize <= 0) return fail('non-positive-subgroup-size');
  if (meanProportion < 0 || meanProportion > 1) return fail('invalid-proportion');
  const spread = 3 * Math.sqrt((meanProportion * (1 - meanProportion)) / subgroupSize);
  return ok({ center: meanProportion, upper: meanProportion + spread, lower: Math.max(0, meanProportion - spread) });
}
