/**
 * Генератор варіантів тренажера тривалості виробничого циклу: один варіант — маршрут із 3–4 операцій
 * (норма часу й кількість робочих місць кожної), розмір партії n і транспортна партія p, що ділить n
 * без залишку («охайні, але не очевидні» дані — часи цілі, Ci здебільшого 1, зрідка 2). Відповідь —
 * усі три тривалості циклу (PC-01, PC-02, PC-03) за один виклик рушія формул (`calculations.ts`), як
 * у розібраному прикладі лекції (content/modules/m1/t04/lecture.mdx).
 *
 * Норми часу операцій завжди мають форму «яму» — спадають до внутрішньої (не крайньої) операції,
 * тоді зростають, як у прикладі лекції (2, 1, 4 хв): для такої форми Tпар < Tзм строго (доведення —
 * generator.test.ts), а не лише Tпар ≤ Tзм. Монотонна чи «горбом» послідовність давала б Tпар = Tзм
 * (немає різниці між рухами) майже в половині варіантів — така форма умисно виключена побудовою.
 */
import { randomInt, type RandomSource } from '../shared/random';
import { formatNumber } from '../shared/number-format';
import { productionCycleTimes } from './calculations';
import type { CycleOperation, ProductionCycleAnswerField, ProductionCycleGivenItem, ProductionCycleMethod, ProductionCycleVariant } from './types';

function unwrap<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: unknown }): T {
  if (!result.ok) throw new Error('Генератор тривалості циклу зібрав невалідні дані для рушія формул');
  return result.value;
}

const MIN_OPERATIONS = 3;
const MAX_OPERATIONS = 4;
const TWO_WORKPLACES_CHANCE = 4; // 1 шанс із 4
const VALLEY_MIN = 1;
const VALLEY_MAX = 2;
const SLOPE_STEP_MIN = 1;
const SLOPE_STEP_MAX = 3;

/**
 * Норми часу (ti/Ci) із суворою «ямою»: спадають до внутрішньої операції valleyIndex (не першої й не
 * останньої), тоді зростають. Гарантує min(rates[0], rates[last]) > rates[valleyIndex], а тому й
 * Tпар < Tзм для будь-якого розміру партії й транспортної партії (доведення в коментарі вище).
 */
function randomValleyRates(random: RandomSource, count: number): number[] {
  const valleyIndex = randomInt(random, 1, count - 2);
  const rates = new Array<number>(count);
  rates[valleyIndex] = randomInt(random, VALLEY_MIN, VALLEY_MAX);
  for (let index = valleyIndex - 1; index >= 0; index -= 1) {
    rates[index] = rates[index + 1]! + randomInt(random, SLOPE_STEP_MIN, SLOPE_STEP_MAX);
  }
  for (let index = valleyIndex + 1; index < count; index += 1) {
    rates[index] = rates[index - 1]! + randomInt(random, SLOPE_STEP_MIN, SLOPE_STEP_MAX);
  }
  return rates;
}

/** Втілює норму часу (ti/Ci) в операцію: зрідка два робочих місця (t = rate·2), інакше одне (t = rate). */
function operationFromRate(random: RandomSource, rate: number): CycleOperation {
  const twoWorkplaces = randomInt(random, 1, TWO_WORKPLACES_CHANCE) === 1;
  return twoWorkplaces ? { time: rate * 2, workplaces: 2 } : { time: rate, workplaces: 1 };
}

function randomOperations(random: RandomSource): CycleOperation[] {
  const count = randomInt(random, MIN_OPERATIONS, MAX_OPERATIONS);
  const rates = randomValleyRates(random, count);
  return rates.map((rate) => operationFromRate(random, rate));
}

const OPERATION_NAMES = ['перша', 'друга', 'третя', 'четверта'] as const;

function operationRateLabel(operation: CycleOperation): string {
  return `${formatNumber(operation.time)} хв${operation.workplaces > 1 ? `, ${operation.workplaces} робочих місця` : ''}`;
}

/** Доданок Σ(ti/Ci) у розв’язку: «8/2», якщо робочих місць кілька, інакше просто норма часу. */
function rateTerm(operation: CycleOperation): string {
  return operation.workplaces > 1 ? `${formatNumber(operation.time)}/${formatNumber(operation.workplaces)}` : formatNumber(operation.time);
}

export interface ProductionCycleTaskChoice {
  readonly method: ProductionCycleMethod;
}

/** Один випадковий варіант з переданого пулу методів (`content/practicals/p03.yaml` → `trainer.tasks`). */
export function createProductionCycleVariant(random: RandomSource, tasks: readonly ProductionCycleTaskChoice[]): ProductionCycleVariant {
  if (tasks.length === 0) throw new Error('Пул задач тренажера тривалості циклу порожній');
  const variantId = `pcv-${Math.floor(random.next() * 1e9).toString(36)}`;

  const operations = randomOperations(random);
  const transferBatch = randomInt(random, 1, 4);
  const multiplier = randomInt(random, 2, 5);
  const batchSize = transferBatch * multiplier;

  const times = unwrap(productionCycleTimes(operations, batchSize, transferBatch));
  const rates = operations.map((operation) => operation.time / operation.workplaces);
  const sum = rates.reduce((total, rate) => total + rate, 0);
  const max = Math.max(...rates);

  const given: ProductionCycleGivenItem[] = [
    ...operations.map((operation, index) => ({ label: `Норма часу, операція ${index + 1} (${OPERATION_NAMES[index] ?? `№${index + 1}`})`, value: operationRateLabel(operation) })),
    { label: 'Розмір партії, n', value: `${formatNumber(batchSize)} шт.` },
    { label: 'Транспортна (передавальна) партія, p', value: `${formatNumber(transferBatch)} шт.` },
  ];

  const answers: ProductionCycleAnswerField[] = [
    { id: 'sequential', label: 'Тривалість циклу — послідовний рух (Tпосл)', unit: 'хв', expected: times.sequential, tolerance: 0.01 },
    { id: 'parallel', label: 'Тривалість циклу — паралельний рух (Tпар)', unit: 'хв', expected: times.parallel, tolerance: 0.01 },
    { id: 'mixed', label: 'Тривалість циклу — паралельно-послідовний рух (Tзм)', unit: 'хв', expected: times.mixed, tolerance: 0.01 },
  ];

  const minSumSteps: string[] = [];
  let minTotal = 0;
  for (let index = 0; index < rates.length - 1; index += 1) {
    const pairMin = Math.min(rates[index]!, rates[index + 1]!);
    minSumSteps.push(`min(${formatNumber(rates[index]!)}; ${formatNumber(rates[index + 1]!)}) = ${formatNumber(pairMin)} хв`);
    minTotal += pairMin;
  }

  const solution = [
    `Сума норм часу операцій: Σ(ti/Ci) = ${operations.map(rateTerm).join(' + ')} = ${formatNumber(sum)} хв; найтриваліша операція max(ti/Ci) = ${formatNumber(max)} хв.`,
    `Послідовний рух (PC-01): Tпосл = n · Σ(ti/Ci) = ${formatNumber(batchSize)} · ${formatNumber(sum)} = ${formatNumber(times.sequential)} хв.`,
    `Паралельний рух (PC-02): Tпар = p · Σ(ti/Ci) + (n − p) · max(ti/Ci) = ${formatNumber(transferBatch)} · ${formatNumber(sum)} + ${formatNumber(batchSize - transferBatch)} · ${formatNumber(max)} = ${formatNumber(times.parallel)} хв.`,
    `Суми мінімумів суміжних операцій для PC-03: ${minSumSteps.join('; ')}; разом ${formatNumber(minTotal)} хв.`,
    `Паралельно-послідовний рух (PC-03): Tзм = Tпосл − (n − p) · Σ min(ti/Ci; ti+1/Ci+1) = ${formatNumber(times.sequential)} − ${formatNumber(batchSize - transferBatch)} · ${formatNumber(minTotal)} = ${formatNumber(times.mixed)} хв.`,
  ];

  return {
    variantId,
    method: 'production-cycle',
    prompt: 'Розрахуйте тривалість виробничого циклу партії деталей при послідовному, паралельному й паралельно-послідовному русі (PC-01, PC-02, PC-03).',
    given,
    answers,
    solution,
  };
}
