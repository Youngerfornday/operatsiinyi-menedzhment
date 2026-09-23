/**
 * Генератор варіантів тренажера закону Літтла: для кожного типу задачі з `content/practicals/p03.yaml`
 * (list `tasks`, `resource` — яку величину шукати) будує один відтворюваний варіант — «охайні, але не
 * очевидні» дані (пропускна здатність — кратна 10, час перебування — з одним десятковим знаком, тож
 * незавершене виробництво завжди виходить цілим числом), і саму відповідь через рушій формул
 * (`calculations.ts`), щоб очікуване значення завжди узгоджувалося з тим, що бачить студент.
 */
import { pickOne, randomInt, type RandomSource } from '../shared/random';
import { formatNumber, roundTo } from '../shared/number-format';
import { pluralUk, type UkPluralForms } from '../../lib/plural';
import { littleLawThroughput, littleLawTime, littleLawWip } from './calculations';
import type { LittleLawAnswerField, LittleLawGivenItem, LittleLawMethod, LittleLawUnknown, LittleLawVariant } from './types';

function unwrap<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: unknown }): T {
  if (!result.ok) throw new Error('Генератор закону Літтла зібрав невалідні дані для рушія формул');
  return result.value;
}

/**
 * Сценарій задачі: та сама формула L = λ · W описує і виробниче замовлення, і пацієнта в черзі.
 * `place` — обставина місця в місцевому відмінку; форми одиниць L і W узгоджуються з числом
 * («162 замовлення», «5 діб»); λ у генераторі завжди кратна 10, тож її одиниця — фіксований рядок.
 */
interface LittleLawContext {
  readonly place: string;
  readonly wipLabel: string;
  readonly wipUnit: string;
  readonly wipForms: UkPluralForms;
  readonly throughputLabel: string;
  readonly throughputUnit: string;
  readonly timeLabel: string;
  readonly timeUnit: string;
  readonly timeForms: UkPluralForms;
}

const CONTEXTS: readonly LittleLawContext[] = [
  {
    place: 'У цеху',
    wipLabel: 'Незавершене виробництво',
    wipUnit: 'замовлень',
    wipForms: { one: 'замовлення', few: 'замовлення', many: 'замовлень', other: 'замовлення' },
    throughputLabel: 'Пропускна здатність',
    throughputUnit: 'замовлень за добу',
    timeLabel: 'Середній час перебування в системі',
    timeUnit: 'доби',
    timeForms: { one: 'доба', few: 'доби', many: 'діб', other: 'доби' },
  },
  {
    place: 'У приймальному відділенні лікарні',
    wipLabel: 'Кількість пацієнтів у відділенні одночасно',
    wipUnit: 'пацієнтів',
    wipForms: { one: 'пацієнт', few: 'пацієнти', many: 'пацієнтів', other: 'пацієнта' },
    throughputLabel: 'Пропускна здатність',
    throughputUnit: 'пацієнтів за годину',
    timeLabel: 'Середній час перебування пацієнта',
    timeUnit: 'години',
    timeForms: { one: 'година', few: 'години', many: 'годин', other: 'години' },
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
      { label: context.wipLabel, value: pluralUk(wip, context.wipForms) },
      { label: context.throughputLabel, value: `${formatNumber(throughput)} ${context.throughputUnit}` },
    );
    const expected = roundTo(unwrap(littleLawTime(wip, throughput)), 6);
    answers.push({ id: 'time', label: context.timeLabel, unit: context.timeUnit, unitForms: context.timeForms, expected, tolerance: 0.01 });
    solution.push(
      `${context.throughputLabel} λ = ${formatNumber(throughput)} ${context.throughputUnit}.`,
      `${context.wipLabel} L = ${pluralUk(wip, context.wipForms)}.`,
      `${context.timeLabel} W = L / λ = ${formatNumber(wip)} / ${formatNumber(throughput)} = ${pluralUk(expected, context.timeForms)}.`,
    );
  } else if (unknown === 'wip') {
    given.push(
      { label: context.throughputLabel, value: `${formatNumber(throughput)} ${context.throughputUnit}` },
      { label: context.timeLabel, value: pluralUk(time, context.timeForms) },
    );
    const expected = roundTo(unwrap(littleLawWip(throughput, time)), 6);
    answers.push({ id: 'wip', label: context.wipLabel, unit: context.wipUnit, unitForms: context.wipForms, expected, tolerance: 0.01 });
    solution.push(
      `${context.throughputLabel} λ = ${formatNumber(throughput)} ${context.throughputUnit}.`,
      `${context.timeLabel} W = ${pluralUk(time, context.timeForms)}.`,
      `${context.wipLabel} L = λ · W = ${formatNumber(throughput)} · ${formatNumber(time)} = ${pluralUk(expected, context.wipForms)}.`,
    );
  } else {
    given.push(
      { label: context.wipLabel, value: pluralUk(wip, context.wipForms) },
      { label: context.timeLabel, value: pluralUk(time, context.timeForms) },
    );
    const expected = roundTo(unwrap(littleLawThroughput(wip, time)), 6);
    answers.push({ id: 'throughput', label: context.throughputLabel, unit: context.throughputUnit, expected, tolerance: 0.01 });
    solution.push(
      `${context.wipLabel} L = ${pluralUk(wip, context.wipForms)}.`,
      `${context.timeLabel} W = ${pluralUk(time, context.timeForms)}.`,
      `${context.throughputLabel} λ = L / W = ${formatNumber(wip)} / ${formatNumber(time)} = ${formatNumber(expected, { maximumFractionDigits: 2 })} ${context.throughputUnit}.`,
    );
  }

  return { variantId, method: 'little-law', unknown, prompt: `${UNKNOWN_PROMPTS[unknown]} ${context.place} в середньому:`, given, answers, solution };
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
