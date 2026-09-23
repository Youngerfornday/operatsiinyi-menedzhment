import { ok } from '../shared/result';
import { fail, isFinitePositive, type ProductivityResult } from './errors';

/**
 * Формули продуктивності операційної системи (docs/research/formula-baseline.md, розділ 3).
 * Чисельник і знаменник мають бути за той самий період і в порівнянних одиницях — цю умову
 * перевіряє контент і генератор варіантів, рушій лише захищається від нульового чи від’ємного знаменника.
 */

/** PROD-01: Продуктивність = Обсяг випуску / Обсяг одного виду витрачених ресурсів. */
export function partialProductivity(output: number, resourceInput: number): ProductivityResult<number> {
  if (output < 0) return fail('negative-value');
  if (!isFinitePositive(resourceInput)) return fail('non-positive-denominator');
  return ok(output / resourceInput);
}

/**
 * PROD-02: Продуктивність = Обсяг випуску / Σ витрат ресурсів.
 * `perCostUnit` — на скільки одиниць витрат виражати результат (1 — «на гривню», 1000 — «на 1 000 грн»,
 * як у лекції); формула від цього не змінюється, лише зручність читання результату.
 */
export function multifactorProductivity(output: number, resourceCosts: readonly number[], perCostUnit = 1): ProductivityResult<number> {
  if (output < 0) return fail('negative-value');
  if (resourceCosts.length === 0) return fail('empty-resources');
  if (resourceCosts.some((cost) => cost < 0)) return fail('negative-value');
  if (!isFinitePositive(perCostUnit)) return fail('non-positive-denominator');
  const total = resourceCosts.reduce((sum, cost) => sum + cost, 0);
  if (!isFinitePositive(total)) return fail('non-positive-denominator');
  return ok((output * perCostUnit) / total);
}

/** PROD-03: I = Продуктивність поточного періоду / Продуктивність базового періоду · 100 %. */
export function productivityIndex(currentProductivity: number, baseProductivity: number): ProductivityResult<number> {
  if (currentProductivity < 0) return fail('negative-value');
  if (!isFinitePositive(baseProductivity)) return fail('non-positive-denominator');
  return ok((currentProductivity / baseProductivity) * 100);
}

export interface MultifactorPeriod {
  readonly output: number;
  readonly resourceCosts: readonly number[];
}

export interface ProductivityChange {
  readonly currentProductivity: number;
  readonly baseProductivity: number;
  /** PROD-03 за щойно порахованими багатофакторними продуктивностями обох періодів. */
  readonly index: number;
}

/**
 * Багатофакторна продуктивність двох періодів і індекс її зміни (PROD-02 + PROD-03) в одному виклику.
 * Періоди мають описувати однакові види ресурсів, інакше порівняння безглузде — це `period-mismatch`,
 * а не тиха помилка округлення.
 */
export function multifactorProductivityChange(current: MultifactorPeriod, base: MultifactorPeriod, perCostUnit = 1): ProductivityResult<ProductivityChange> {
  if (current.resourceCosts.length !== base.resourceCosts.length) return fail('period-mismatch');
  const baseProductivity = multifactorProductivity(base.output, base.resourceCosts, perCostUnit);
  if (!baseProductivity.ok) return baseProductivity;
  const currentProductivity = multifactorProductivity(current.output, current.resourceCosts, perCostUnit);
  if (!currentProductivity.ok) return currentProductivity;
  const index = productivityIndex(currentProductivity.value, baseProductivity.value);
  if (!index.ok) return index;
  return ok({ currentProductivity: currentProductivity.value, baseProductivity: baseProductivity.value, index: index.value });
}

/** Спільна форма CAP-01 і CAP-02: Фактичний випуск / (проєктна чи ефективна) потужність · 100 %. */
function capacityRatio(actualOutput: number, capacity: number): ProductivityResult<number> {
  if (actualOutput < 0) return fail('negative-value');
  if (!isFinitePositive(capacity)) return fail('non-positive-denominator');
  return ok((actualOutput / capacity) * 100);
}

/** CAP-01: Використання = Фактичний випуск / Проєктна потужність · 100 %. */
export function capacityUsage(actualOutput: number, designCapacity: number): ProductivityResult<number> {
  return capacityRatio(actualOutput, designCapacity);
}

/** CAP-02: Ефективність = Фактичний випуск / Ефективна потужність · 100 %. */
export function capacityEfficiency(actualOutput: number, effectiveCapacity: number): ProductivityResult<number> {
  return capacityRatio(actualOutput, effectiveCapacity);
}
