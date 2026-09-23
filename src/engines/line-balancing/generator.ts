/**
 * Генератор варіантів тренажера балансування лінії: доступний час і попит підібрано так, щоб такт
 * лінії (CAP-05) завжди виходив цілим числом секунд, а часи операцій — цілі секунди, менші за такт
 * (інакше операція фізично не влазить у жодну станцію). Розподіл за станціями й очікувані відповіді
 * рахує сам рушій формул (`calculations.ts`), як у WorkedExample code="LB-01"/"LB-02" лекції теми 5.
 */
import { pickOne, randomInt, type RandomSource } from '../shared/random';
import { formatNumber, roundTo } from '../shared/number-format';
import { assignStationsSequential, lineBalancingEfficiency, minimumStations, taktTime } from './calculations';
import type { LineBalancingAnswerField, LineBalancingGivenItem, LineBalancingMethod, LineBalancingVariant } from './types';

function unwrap<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: unknown }): T {
  if (!result.ok) throw new Error('Генератор балансування лінії зібрав невалідні дані для рушія формул');
  return result.value;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

const CYCLE_CHOICES = [45, 50, 55, 60, 65, 70, 75] as const;
const DEMAND_RANGE: readonly [number, number] = [300, 600];

/** Такт (секунди) і попит підібрано так, щоб `Такт · Попит` завжди ділилося на 60 без остачі — доступний час у хвилинах виходить цілим. */
function cleanTaktInputs(random: RandomSource): { readonly cycle: number; readonly demand: number; readonly availableMinutes: number } {
  const cycle = pickOne(CYCLE_CHOICES, random);
  const step = 60 / gcd(cycle, 60);
  const minMultiplier = Math.ceil(DEMAND_RANGE[0] / step);
  const maxMultiplier = Math.floor(DEMAND_RANGE[1] / step);
  const demand = step * randomInt(random, minMultiplier, maxMultiplier);
  const availableSeconds = cycle * demand;
  return { cycle, demand, availableMinutes: availableSeconds / 60 };
}

function operationTimes(random: RandomSource, cycle: number): number[] {
  const count = randomInt(random, 6, 9);
  const min = Math.max(5, Math.round(cycle * 0.25));
  const max = Math.max(min, Math.round(cycle * 0.85));
  return Array.from({ length: count }, () => randomInt(random, min, max));
}

function lineBalanceVariant(random: RandomSource, variantId: string): LineBalancingVariant {
  const { cycle, demand, availableMinutes } = cleanTaktInputs(random);
  const times = operationTimes(random, cycle);

  const takt = unwrap(taktTime(availableMinutes * 60, demand));
  const minStations = unwrap(minimumStations(times, cycle));
  const stations = unwrap(assignStationsSequential(times, cycle));
  const stationCount = stations.length;
  const efficiency = unwrap(lineBalancingEfficiency(times, stationCount, cycle));

  const given: LineBalancingGivenItem[] = [
    { label: 'Доступний час зміни, хв', value: formatNumber(availableMinutes) },
    { label: 'Попит, виробів за зміну', value: formatNumber(demand) },
    ...times.map((time, index) => ({ label: `Операція ${index + 1}, час, с`, value: formatNumber(time) })),
  ];

  const answers: LineBalancingAnswerField[] = [
    { id: 'takt', label: 'Такт лінії', unit: 'с', expected: takt, tolerance: 0.05 },
    { id: 'nmin', label: 'Мінімальна кількість станцій', unit: 'шт.', expected: minStations, tolerance: 0 },
    { id: 'stations', label: 'Фактична кількість станцій за правилом найбільшої кількості наступних завдань', unit: 'шт.', expected: stationCount, tolerance: 0 },
    { id: 'efficiency', label: 'Ефективність балансування лінії', unit: '%', expected: roundTo(efficiency, 1), tolerance: 0.1 },
  ];

  const total = times.reduce((sum, time) => sum + time, 0);
  let opIndex = 0;
  const assignmentLines = stations.map((station, index) => {
    const opNumbers = station.map((_, offset) => opIndex + offset + 1);
    opIndex += station.length;
    const stationSum = station.reduce((sum, time) => sum + time, 0);
    return `Станція ${index + 1} — операції ${opNumbers.join(', ')}: ${formatNumber(stationSum)} с (простій ${formatNumber(cycle - stationSum)} с).`;
  });

  const solution = [
    `Такт: ${formatNumber(availableMinutes)} хв · 60 с / ${formatNumber(demand)} виробів = ${formatNumber(availableMinutes * 60)} с / ${formatNumber(demand)} = ${formatNumber(takt)} с на виріб.`,
    `Сума часу операцій: ${times.map((time) => formatNumber(time)).join(' + ')} = ${formatNumber(total)} с.`,
    `Мінімальна кількість станцій: ⌈${formatNumber(total)} / ${formatNumber(takt)}⌉ = ${formatNumber(minStations)} станцій.`,
    `Закріплення операцій за правилом найбільшої кількості наступних завдань, без перевищення такту: ${assignmentLines.join(' ')}`,
    `Ефективність: ${formatNumber(total)} / (${formatNumber(stationCount)} · ${formatNumber(takt)}) · 100% = ${formatNumber(roundTo(efficiency, 1), { maximumFractionDigits: 1 })}%.`,
  ];

  return {
    variantId,
    method: 'line-balance',
    prompt: 'Збалансуйте потокову лінію під заданий такт: визначте такт, мінімальну й фактичну кількість станцій та ефективність (CAP-05, LB-01, LB-02, LB-05). Операції утворюють послідовний ланцюг: кожна починається лише після попередньої, тож закріплюйте їх за станціями в технологічному порядку, без перестановок.',
    given,
    answers,
    solution,
  };
}

const GENERATORS: Readonly<Record<LineBalancingMethod, (random: RandomSource, variantId: string) => LineBalancingVariant>> = {
  'line-balance': lineBalanceVariant,
};

export interface LineBalancingTaskChoice {
  readonly method: LineBalancingMethod;
}

/** Один випадковий варіант з переданого пулу методів (`content/practicals/p04.yaml` → `trainer.tasks`). */
export function createLineBalancingVariant(random: RandomSource, tasks: readonly LineBalancingTaskChoice[]): LineBalancingVariant {
  if (tasks.length === 0) throw new Error('Пул задач тренажера балансування лінії порожній');
  const variantId = `lbv-${Math.floor(random.next() * 1e9).toString(36)}`;
  const choice = pickOne(tasks, random);
  return GENERATORS[choice.method](random, variantId);
}
