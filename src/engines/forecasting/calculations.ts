import { ok } from '../shared/result';
import { fail, type ForecastingErrorCode, type ForecastingResult } from './errors';

/**
 * Формули прогнозування попиту (docs/research/formula-baseline.md, розділ 2, коди FC-01…FC-06).
 * Чисельник і знаменник рахуються за той самий ряд періодів — цю умову перевіряє генератор варіантів,
 * рушій лише захищається від порожніх рядів, невалідного вікна, ваг і константи згладжування.
 */

const WEIGHT_SUM_TOLERANCE = 1e-9;

/** FC-01: Ft = (Dt−1 + Dt−2 + … + Dt−n) / n — просте середнє останніх n значень ряду попиту. */
export function movingAverageForecast(actuals: readonly number[], windowSize: number): ForecastingResult<number> {
  if (!Number.isInteger(windowSize) || windowSize < 1) return fail('invalid-window');
  if (actuals.length < windowSize) return fail('invalid-window');
  const window = actuals.slice(actuals.length - windowSize);
  const sum = window.reduce((total, value) => total + value, 0);
  return ok(sum / windowSize);
}

/**
 * FC-02: Ft = Σ (wi · Dt−i), Σwi = 1. `actuals` і `weights` упорядковані однаково — від найдавнішого
 * періоду вікна до найближчого до прогнозованого; вага останнього (найближчого) елемента — найбільша.
 */
export function weightedMovingAverageForecast(actuals: readonly number[], weights: readonly number[]): ForecastingResult<number> {
  if (actuals.length === 0 || weights.length === 0) return fail('empty-series');
  if (actuals.length !== weights.length) return fail('invalid-weights');
  if (weights.some((weight) => weight <= 0)) return fail('invalid-weights');
  const weightSum = weights.reduce((total, weight) => total + weight, 0);
  if (Math.abs(weightSum - 1) > WEIGHT_SUM_TOLERANCE) return fail('invalid-weights');
  const forecast = actuals.reduce((total, value, index) => total + value * (weights[index] ?? 0), 0);
  return ok(forecast);
}

/** FC-03: Ft = Ft−1 + α · (Dt−1 − Ft−1), 0 < α < 1. */
export function exponentialSmoothingForecast(previousForecast: number, previousActual: number, alpha: number): ForecastingResult<number> {
  if (!(alpha > 0 && alpha < 1)) return fail('invalid-alpha');
  return ok(previousForecast + alpha * (previousActual - previousForecast));
}

/**
 * Прогноз експоненційного згладжування (FC-03) для кожного періоду ряду поспіль: `forecasts[i]` —
 * прогноз періоду, фактичне значення якого — `actuals[i]` (та сама пара Dt/Ft, яку приймають FC-04…06).
 */
export function exponentialSmoothingSeries(actuals: readonly number[], alpha: number, initialForecast: number): ForecastingResult<readonly number[]> {
  if (actuals.length === 0) return fail('empty-series');
  if (!(alpha > 0 && alpha < 1)) return fail('invalid-alpha');
  const forecasts: number[] = [];
  let previousForecast = initialForecast;
  for (const actual of actuals) {
    forecasts.push(previousForecast);
    previousForecast = previousForecast + alpha * (actual - previousForecast);
  }
  return ok(forecasts);
}

function pairsIssue(actuals: readonly number[], forecasts: readonly number[]): ForecastingErrorCode | null {
  if (actuals.length === 0 || forecasts.length === 0) return 'empty-series';
  if (actuals.length !== forecasts.length) return 'length-mismatch';
  return null;
}

/** FC-04: MAD = (1/n) · Σ |Dt − Ft| — середнє абсолютне відхилення прогнозу від факту. */
export function meanAbsoluteDeviation(actuals: readonly number[], forecasts: readonly number[]): ForecastingResult<number> {
  const issue = pairsIssue(actuals, forecasts);
  if (issue) return fail(issue);
  const sum = actuals.reduce((total, actual, index) => total + Math.abs(actual - (forecasts[index] ?? 0)), 0);
  return ok(sum / actuals.length);
}

/** FC-05: MSE = (1/n) · Σ (Dt − Ft)² — середньоквадратична похибка прогнозу. */
export function meanSquaredError(actuals: readonly number[], forecasts: readonly number[]): ForecastingResult<number> {
  const issue = pairsIssue(actuals, forecasts);
  if (issue) return fail(issue);
  const sum = actuals.reduce((total, actual, index) => total + (actual - (forecasts[index] ?? 0)) ** 2, 0);
  return ok(sum / actuals.length);
}

/** FC-06: MAPE = (100/n) · Σ (|Dt − Ft| / Dt) — середня абсолютна похибка прогнозу у відсотках. */
export function meanAbsolutePercentageError(actuals: readonly number[], forecasts: readonly number[]): ForecastingResult<number> {
  const issue = pairsIssue(actuals, forecasts);
  if (issue) return fail(issue);
  if (actuals.some((actual) => actual === 0)) return fail('zero-actual');
  const sum = actuals.reduce((total, actual, index) => total + Math.abs(actual - (forecasts[index] ?? 0)) / actual, 0);
  return ok((100 * sum) / actuals.length);
}
