/**
 * Генератор варіантів тренажера агрегатного планування: горизонт із шести періодів попиту (охайні,
 * але не очевидні дані — чисельність персоналу задається наперед клінова, а попит виводиться з неї
 * множенням на продуктивність, тож обидві стратегії дають рівно цілі значення), дві стратегії виконання
 * плану (AGG-01, AGG-02) і порівняння їхніх сумарних витрат (AGG-03) через рушій формул
 * (`calculations.ts`) — тим самим методом, що й WorkedExample AGG-01/AGG-02 лекції теми 6.
 */
import { pickOne, randomInt, type RandomSource } from '../shared/random';
import { formatMoney, formatNumber, roundTo } from '../shared/number-format';
import { chaseStrategyWorkforce, evaluatePlan, levelStrategyWorkforce, type AggregatePlanCostParams } from './calculations';
import type { AggregatePlanningAnswerField, AggregatePlanningGivenItem, AggregatePlanningVariant } from './types';

const HORIZON = 6;
const WORKFORCE_STEP = 5;

function unwrap<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: unknown }): T {
  if (!result.ok) throw new Error('Генератор агрегатного планування зібрав невалідні дані для рушія формул');
  return result.value;
}

/**
 * Потрібна чисельність персоналу за стратегією погоні з точно заданим середнім (кратне `WORKFORCE_STEP`,
 * відхилення від нього — теж кратні кроку й у сумі дають нуль), звідки стратегія рівномірного
 * виробництва отримує рівно цілу сталу чисельність.
 */
function cleanWorkforceSeries(random: RandomSource): number[] {
  const average = WORKFORCE_STEP * randomInt(random, 12, 20);
  const deviations: number[] = [];
  for (let index = 0; index < HORIZON - 1; index += 1) {
    deviations.push(WORKFORCE_STEP * randomInt(random, -2, 2));
  }
  const last = -deviations.reduce((sum, value) => sum + value, 0);
  return [...deviations, last].map((deviation) => average + deviation);
}

const PRODUCTIVITY_SET = [15, 20, 25] as const;
const WAGE_SET = [2500, 3000, 3500, 4000] as const;
const HIRING_COST_SET = [1500, 2000, 2500] as const;
const FIRING_PREMIUM_SET = [1000, 1500, 2000] as const;
const HOLDING_COST_SET = [20, 30, 40, 50] as const;
const SHORTAGE_COST_SET = [80, 100, 120, 150] as const;

function randomCostParams(random: RandomSource): AggregatePlanCostParams {
  const hiringCostPerWorker = pickOne(HIRING_COST_SET, random);
  return {
    productivityPerWorker: pickOne(PRODUCTIVITY_SET, random),
    regularWagePerWorker: pickOne(WAGE_SET, random),
    hiringCostPerWorker,
    // Звільнення дорожче за найм (вихідна допомога) — той самий порядок, що й у лекції.
    firingCostPerWorker: hiringCostPerWorker + pickOne(FIRING_PREMIUM_SET, random),
    holdingCostPerUnit: pickOne(HOLDING_COST_SET, random),
    shortageCostPerUnit: pickOne(SHORTAGE_COST_SET, random),
  };
}

function costGiven(params: AggregatePlanCostParams): AggregatePlanningGivenItem[] {
  return [
    { label: 'Продуктивність одного робітника за період', value: `${formatNumber(params.productivityPerWorker)} од./робітника` },
    { label: 'Регулярна оплата праці одного робітника за період', value: formatMoney(params.regularWagePerWorker) },
    { label: 'Витрати найму одного робітника', value: formatMoney(params.hiringCostPerWorker) },
    { label: 'Витрати звільнення одного робітника', value: formatMoney(params.firingCostPerWorker) },
    { label: 'Витрати зберігання одиниці запасу за період', value: formatMoney(params.holdingCostPerUnit) },
    { label: 'Витрати дефіциту за одиницю за період', value: formatMoney(params.shortageCostPerUnit) },
  ];
}

function planCostsVariant(random: RandomSource, variantId: string): AggregatePlanningVariant {
  const chaseWorkforce = cleanWorkforceSeries(random);
  const params = randomCostParams(random);
  const demand = chaseWorkforce.map((workers) => workers * params.productivityPerWorker);
  const initialWorkforce = chaseWorkforce[0]! + WORKFORCE_STEP * randomInt(random, -2, 2);
  const initialInventory = 0;

  const chaseComputed = unwrap(chaseStrategyWorkforce(demand, params.productivityPerWorker));
  const levelComputed = unwrap(levelStrategyWorkforce(demand, params.productivityPerWorker));
  const chase = unwrap(evaluatePlan(demand, chaseComputed, initialWorkforce, initialInventory, params));
  const level = unwrap(evaluatePlan(demand, levelComputed, initialWorkforce, initialInventory, params));

  const chaseCost = roundTo(chase.totalCost, 2);
  const levelCost = roundTo(level.totalCost, 2);

  const given: AggregatePlanningGivenItem[] = [
    ...demand.map((value, index) => ({ label: `Попит, період ${index + 1}`, value: `${formatNumber(value)} од.` })),
    { label: 'Чисельність персоналу перед горизонтом', value: `${formatNumber(initialWorkforce)} робітників` },
    { label: 'Запас на початок горизонту', value: `${formatNumber(initialInventory)} од.` },
    ...costGiven(params),
  ];

  const answers: AggregatePlanningAnswerField[] = [
    { id: 'chase-cost', label: 'Сумарні витрати за стратегією погоні за попитом', unit: 'грн', expected: chaseCost, tolerance: 0.5 },
    { id: 'level-cost', label: 'Сумарні витрати за стратегією рівномірного виробництва', unit: 'грн', expected: levelCost, tolerance: 0.5 },
  ];

  const levelWorkforceValue = levelComputed[0]!;
  const solution = [
    `Стратегія погоні (AGG-01): потрібний штат = попит / продуктивність = ${chaseComputed.map((value) => formatNumber(value)).join(', ')} робітників за періодами.`,
    `Регулярна оплата: ${formatMoney(chase.regularCost)}. Найм: ${formatMoney(chase.hiringCost)}. Звільнення: ${formatMoney(chase.firingCost)}. Зберігання: ${formatMoney(chase.holdingCost)}. Дефіцит: ${formatMoney(chase.shortageCost)}. Разом (AGG-03) = ${formatMoney(chase.totalCost)}.`,
    `Стратегія рівномірного виробництва (AGG-02): сталий штат = Σ попиту / (${HORIZON} · продуктивність) = ${formatNumber(levelWorkforceValue)} робітників на весь горизонт.`,
    `Регулярна оплата: ${formatMoney(level.regularCost)}. Найм: ${formatMoney(level.hiringCost)}. Звільнення: ${formatMoney(level.firingCost)}. Зберігання: ${formatMoney(level.holdingCost)}. Дефіцит: ${formatMoney(level.shortageCost)}. Разом (AGG-03) = ${formatMoney(level.totalCost)}.`,
  ];

  return {
    variantId,
    method: 'aggregate-plan-costs',
    prompt: `Складіть агрегатний план на ${HORIZON} періодів за стратегією погоні за попитом (AGG-01) і за стратегією рівномірного виробництва (AGG-02) та порівняйте сумарні витрати виконання обох (AGG-03).`,
    given,
    answers,
    solution,
  };
}

export interface AggregatePlanningTaskChoice {
  readonly method: 'aggregate-plan-costs';
}

/** Єдиний метод рушія — порівняння сумарних витрат двох стратегій; пул із кількох елементів не потрібен. */
export function createAggregatePlanningVariant(random: RandomSource, tasks: readonly AggregatePlanningTaskChoice[]): AggregatePlanningVariant {
  if (tasks.length === 0) throw new Error('Пул задач тренажера агрегатного планування порожній');
  const variantId = `av-${Math.floor(random.next() * 1e9).toString(36)}`;
  return planCostsVariant(random, variantId);
}
