import { ok } from '../shared/result';
import { fail, type AggregatePlanningErrorCode, type AggregatePlanningResult } from './errors';

/**
 * Формули агрегатного планування (docs/research/formula-baseline.md, розділ 12, коди AGG-01…AGG-03).
 * Переведення випуску в чисельність персоналу (workforce = випуск / продуктивність одного робітника)
 * і роздільні ставки найму й звільнення — не окремий код бази, а метод обох WorkedExample AGG-01/AGG-02
 * лекції теми 6 (`content/modules/m2/t06/lecture.mdx`): рушій рахує так само, щоб студент бачив той самий
 * механізм, яким розібрано приклад лекції, а не інше число з тим самим кодом формули.
 */

/** AGG-01: Виробництво_t = Попит_t → потрібна чисельність персоналу = Попит_t / продуктивність одного робітника. */
export function chaseStrategyWorkforce(demand: readonly number[], productivityPerWorker: number): AggregatePlanningResult<readonly number[]> {
  if (demand.length === 0) return fail('empty-horizon');
  if (demand.some((value) => value < 0)) return fail('negative-value');
  if (!(productivityPerWorker > 0)) return fail('non-positive-productivity');
  return ok(demand.map((value) => value / productivityPerWorker));
}

/** AGG-02: Виробництво = Σ Попит_t / n → стала чисельність персоналу на весь горизонт. */
export function levelStrategyWorkforce(demand: readonly number[], productivityPerWorker: number): AggregatePlanningResult<readonly number[]> {
  if (demand.length === 0) return fail('empty-horizon');
  if (demand.some((value) => value < 0)) return fail('negative-value');
  if (!(productivityPerWorker > 0)) return fail('non-positive-productivity');
  const averageDemand = demand.reduce((sum, value) => sum + value, 0) / demand.length;
  const workforce = averageDemand / productivityPerWorker;
  return ok(demand.map(() => workforce));
}

export interface AggregatePlanCostParams {
  /** Виробів на одного робітника за період — та сама продуктивність для обох стратегій, що порівнюються. */
  readonly productivityPerWorker: number;
  /** Регулярна оплата праці одного робітника за період. */
  readonly regularWagePerWorker: number;
  /** Витрати найму одного робітника. */
  readonly hiringCostPerWorker: number;
  /** Витрати звільнення одного робітника (зазвичай дорожче за найм — вихідна допомога). */
  readonly firingCostPerWorker: number;
  /** Витрати зберігання одиниці запасу на кінець періоду. */
  readonly holdingCostPerUnit: number;
  /** Витрати дефіциту (незадоволеного попиту) на кінець періоду. */
  readonly shortageCostPerUnit: number;
}

export interface AggregatePlanResult {
  readonly workforce: readonly number[];
  readonly production: readonly number[];
  /** Залишок запасу на кінець кожного періоду; від’ємне значення — дефіцит (незадоволений попит). */
  readonly inventory: readonly number[];
  readonly regularCost: number;
  readonly hiringCost: number;
  readonly firingCost: number;
  readonly holdingCost: number;
  readonly shortageCost: number;
  readonly totalCost: number;
}

function costParamsIssue(params: AggregatePlanCostParams): AggregatePlanningErrorCode | null {
  if (!(params.productivityPerWorker > 0)) return 'non-positive-productivity';
  const rates = [params.regularWagePerWorker, params.hiringCostPerWorker, params.firingCostPerWorker, params.holdingCostPerUnit, params.shortageCostPerUnit];
  return rates.some((value) => value < 0) ? 'negative-cost' : null;
}

/**
 * AGG-03: Витрати = Регулярний час + Найм + Звільнення + Зберігання запасу + Дефіцит, за весь горизонт
 * планування одного плану персоналу. Понаднормового часу немає в жодній із двох порівнюваних стратегій
 * (рівномірна тримає постійний штат, погоня підлаштовує штат під попит без обмеження потужності), тому
 * цієї статті серед доданків немає.
 * ponytail: без понаднормового часу й субпідряду рушій рахує лише дві крайні стратегії; змішаний план
 * (базовий рівномірний темп + понаднормові в пікові періоди) потребує ставки понаднормової години й межі
 * регулярної потужності — тоді додати їх у AggregatePlanCostParams і доданок «Понаднормовий час» тут.
 * `initialWorkforce` і `initialInventory` — чисельність персоналу й запас періоду, що передував
 * горизонту: від них рахується перша зміна штату й перший залишок запасу.
 */
export function evaluatePlan(
  demand: readonly number[],
  workforce: readonly number[],
  initialWorkforce: number,
  initialInventory: number,
  params: AggregatePlanCostParams,
): AggregatePlanningResult<AggregatePlanResult> {
  if (demand.length === 0) return fail('empty-horizon');
  if (demand.length !== workforce.length) return fail('length-mismatch');
  if (demand.some((value) => value < 0) || workforce.some((value) => value < 0)) return fail('negative-value');
  const costIssue = costParamsIssue(params);
  if (costIssue) return fail(costIssue);

  const production = workforce.map((value) => value * params.productivityPerWorker);
  const inventory: number[] = [];
  let runningInventory = initialInventory;
  for (let period = 0; period < demand.length; period += 1) {
    runningInventory = runningInventory + production[period]! - demand[period]!;
    inventory.push(runningInventory);
  }

  const regularCost = workforce.reduce((sum, value) => sum + value * params.regularWagePerWorker, 0);
  const previousLevels = [initialWorkforce, ...workforce.slice(0, -1)];
  const deltas = workforce.map((value, index) => value - previousLevels[index]!);
  const hiringCost = deltas.reduce((sum, delta) => sum + Math.max(delta, 0) * params.hiringCostPerWorker, 0);
  const firingCost = deltas.reduce((sum, delta) => sum + Math.max(-delta, 0) * params.firingCostPerWorker, 0);
  const holdingCost = inventory.reduce((sum, value) => sum + Math.max(value, 0) * params.holdingCostPerUnit, 0);
  const shortageCost = inventory.reduce((sum, value) => sum + Math.max(-value, 0) * params.shortageCostPerUnit, 0);
  const totalCost = regularCost + hiringCost + firingCost + holdingCost + shortageCost;

  return ok({ workforce: [...workforce], production, inventory, regularCost, hiringCost, firingCost, holdingCost, shortageCost, totalCost });
}
