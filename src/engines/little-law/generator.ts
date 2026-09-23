/**
 * Генератор варіантів тренажера закону Літтла: для кожного типу задачі з `content/practicals/p03.yaml`
 * (list `tasks`, `resource` — яку величину шукати) будує один відтворюваний варіант — «охайні, але не
 * очевидні» дані (пропускна здатність — кратна 10, час перебування — з одним десятковим знаком, тож
 * незавершене виробництво завжди виходить цілим числом), і саму відповідь через рушій формул
 * (`calculations.ts`), щоб очікуване значення завжди узгоджувалося з тим, що бачить студент.
 */
import { pickOne, randomInt, type RandomSource } from '../shared/random';
import { formatNumber, roundTo } from '../shared/number-format';
import { littleLawThroughput, littleLawTime, littleLawWip } from './calculations';
import type { LittleLawAnswerField, LittleLawGivenItem, LittleLawMethod, LittleLawUnknown, LittleLawVariant } from './types';

function unwrap<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: unknown }): T {
  if (!result.ok) throw new Error('Генератор закону Літтла зібрав невалідні дані для рушія формул');
  return result.value;
}

/** Сценарій задачі: та сама формула L = λ · W описує і виробниче замовлення, і пацієнта в черзі. */
interface LittleLawContext {
  readonly place: string;
  readonly wipLabel: string;
  readonly wipUnit: string;
  readonly throughputLabel: string;
  readonly throughputUnit: string;
  readonly timeLabel: string;
  readonly timeUnit: string;
}

const CONTEXTS: readonly LittleLawContext[] = [
  {
    place: 'цех',
    wipLabel: 'Незавершене виробництво',
    wipUnit: 'замовлень',
    throughputLabel: 'Пропускна здатність',
    throughputUnit: 'замовлень за добу',
    timeLabel: 'Середній час перебування в системі',
    timeUnit: 'доби',
  },
  {
    place: 'приймальне відділення лікарні',
    wipLabel: 'Кількість пацієнтів у відділенні одночасно',
    wipUnit: 'пацієнтів',
    throughputLabel: 'Пропускна здатність',
    throughputUnit: 'пацієнтів за годину',
    timeLabel: 'Середній час перебування пацієнта',
    timeUnit: 'години',
  },
];

const UNKNOWN_PROMPTS: Readonly<Record<LittleLawUnknown, string>> = {
  time: 'Визначте середній час перебування одиниці в системі за законом Літтла (CAP-04).',
  wip: 'Визначте середню кількість одиниць у системі (незавершене виробництво) за законом Літтла (CAP-04).',
  throughput: 'Визначте пропускну здатність системи за законом Літтла (CAP-04).',
};

/** a — десяток пропускної здатності (10..100), b — десята частка часу перебування (1,0..10,0). */
interface CleanTriple {
  readonly throughput: number;
  readonly time: number;
  readonly wip: number;
}

function cleanTriple(random: RandomSource): CleanTriple {
  const a = randomInt(random, 2, 10);
  const b = randomInt(random, 10, 100);
  const throughput = 10 * a;
  const time = b / 10;
  // a·b — точний цілий добуток двох цілих чисел: throughput · time (10·a · b/10) міг би дати похибку
  // подвійної точності (наприклад, 30 · 1,7 = 50,99999999999999 у JS).
  const wip = a * b;
  return { throughput, time, wip };
}

function buildVariant(unknown: LittleLawUnknown, context: LittleLawContext, values: CleanTriple, variantId: string): LittleLawVariant {
  const { throughput, time, wip } = values;
  const given: LittleLawGivenItem[] = [];
  const answers: LittleLawAnswerField[] = [];
  const solution: string[] = [];

  if (unknown === 'time') {
    given.push(
      { label: context.wipLabel, value: `${formatNumber(wip)} ${context.wipUnit}` },
      { label: context.throughputLabel, value: `${formatNumber(throughput)} ${context.throughputUnit}` },
    );
    const expected = roundTo(unwrap(littleLawTime(wip, throughput)), 6);
    answers.push({ id: 'time', label: context.timeLabel, unit: context.timeUnit, expected, tolerance: 0.01 });
    solution.push(
      `${context.throughputLabel} λ = ${formatNumber(throughput)} ${context.throughputUnit}.`,
      `${context.wipLabel} L = ${formatNumber(wip)} ${context.wipUnit}.`,
      `${context.timeLabel} W = L / λ = ${formatNumber(wip)} / ${formatNumber(throughput)} = ${formatNumber(expected, { maximumFractionDigits: 2 })} ${context.timeUnit}.`,
    );
  } else if (unknown === 'wip') {
    given.push(
      { label: context.throughputLabel, value: `${formatNumber(throughput)} ${context.throughputUnit}` },
      { label: context.timeLabel, value: `${formatNumber(time)} ${context.timeUnit}` },
    );
    const expected = roundTo(unwrap(littleLawWip(throughput, time)), 6);
    answers.push({ id: 'wip', label: context.wipLabel, unit: context.wipUnit, expected, tolerance: 0.01 });
    solution.push(
      `${context.throughputLabel} λ = ${formatNumber(throughput)} ${context.throughputUnit}.`,
      `${context.timeLabel} W = ${formatNumber(time)} ${context.timeUnit}.`,
      `${context.wipLabel} L = λ · W = ${formatNumber(throughput)} · ${formatNumber(time)} = ${formatNumber(expected)} ${context.wipUnit}.`,
    );
  } else {
    given.push(
      { label: context.wipLabel, value: `${formatNumber(wip)} ${context.wipUnit}` },
      { label: context.timeLabel, value: `${formatNumber(time)} ${context.timeUnit}` },
    );
    const expected = roundTo(unwrap(littleLawThroughput(wip, time)), 6);
    answers.push({ id: 'throughput', label: context.throughputLabel, unit: context.throughputUnit, expected, tolerance: 0.01 });
    solution.push(
      `${context.wipLabel} L = ${formatNumber(wip)} ${context.wipUnit}.`,
      `${context.timeLabel} W = ${formatNumber(time)} ${context.timeUnit}.`,
      `${context.throughputLabel} λ = L / W = ${formatNumber(wip)} / ${formatNumber(time)} = ${formatNumber(expected, { maximumFractionDigits: 2 })} ${context.throughputUnit}.`,
    );
  }

  return { variantId, method: 'little-law', unknown, prompt: `${UNKNOWN_PROMPTS[unknown]} У ${context.place === 'цех' ? 'цеху' : context.place} в середньому:`, given, answers, solution };
}

export interface LittleLawTaskChoice {
  readonly method: LittleLawMethod;
  readonly unknown: LittleLawUnknown;
}

/** Один випадковий варіант з переданого пулу методів (`content/practicals/p03.yaml` → `trainer.tasks`). */
export function createLittleLawVariant(random: RandomSource, tasks: readonly LittleLawTaskChoice[]): LittleLawVariant {
  if (tasks.length === 0) throw new Error('Пул задач тренажера закону Літтла порожній');
  const variantId = `llv-${Math.floor(random.next() * 1e9).toString(36)}`;
  const choice = pickOne(tasks, random);
  const context = pickOne(CONTEXTS, random);
  const values = cleanTriple(random);
  return buildVariant(choice.unknown, context, values, variantId);
}
