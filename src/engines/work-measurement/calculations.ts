import { ok } from '../shared/result';
import { fail, type WorkMeasurementResult } from './errors';

/**
 * Формули нормування праці (docs/research/formula-baseline.md, WM-01..04).
 */

/** WM-01: Топ = То + Тд. */
export function operativeTime(mainTime: number, auxTime: number): WorkMeasurementResult<number> {
  if (mainTime < 0 || auxTime < 0) return fail('negative-value');
  return ok(mainTime + auxTime);
}

/**
 * WM-02: Тшт = Топ + Тобсл + Твідп. Тобсл і Твідп задають частками оперативного часу
 * (як у WorkedExample code="WM-04" лекції теми 5: 4% і 6% Топ).
 */
export function pieceTime(operativeTimeValue: number, serviceShare: number, restShare: number): WorkMeasurementResult<number> {
  if (!(operativeTimeValue > 0)) return fail('non-positive-value');
  if (serviceShare < 0 || restShare < 0) return fail('negative-value');
  if (serviceShare + restShare >= 1) return fail('share-too-large');
  return ok(operativeTimeValue * (1 + serviceShare + restShare));
}

/** WM-03: Тшт.к = Тшт + Тпз / n. */
export function pieceRateTime(pieceTimeValue: number, setupTime: number, batchSize: number): WorkMeasurementResult<number> {
  if (!Number.isFinite(pieceTimeValue) || !Number.isFinite(setupTime) || !Number.isFinite(batchSize)) return fail('non-finite-value');
  if (!(pieceTimeValue > 0)) return fail('non-positive-value');
  if (setupTime < 0) return fail('negative-value');
  if (!(batchSize > 0)) return fail('non-positive-denominator');
  return ok(pieceTimeValue + setupTime / batchSize);
}

/** Запас на похибку double: 450 / 6,250000000000001 = 71,999…, хоча точна частка — рівно 72. */
const FLOAT_SLACK = 1e-9;

/** WM-04: Нвир = Тзм / Тшт.к. Округлення вниз — дробового виробу наприкінці зміни не існує. */
export function outputRate(shiftFund: number, pieceRateTimeValue: number): WorkMeasurementResult<number> {
  if (!(shiftFund > 0)) return fail('non-positive-denominator');
  if (!(pieceRateTimeValue > 0)) return fail('non-positive-value');
  return ok(Math.floor(shiftFund / pieceRateTimeValue + FLOAT_SLACK));
}
