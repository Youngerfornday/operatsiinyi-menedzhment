/**
 * Генератор варіантів тренажера закону Літтла: для кожного типу задачі з `content/practicals/p03.yaml`
 * (list `tasks`, `resource` — яку величину шукати) будує один відтворюваний варіант — «охайні, але не
 * очевидні» дані в реалістичному для сценарію (`CONTEXTS`) порядку величин, і саму відповідь через
 * рушій формул (`calculations.ts`), щоб очікуване значення завжди узгоджувалося з тим, що бачить
 * студент. Незавершене виробництво (L) завжди виходить цілим числом — див. `cleanTriple`.
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
 * («162 замовлення», «5 діб»). Масштаб (`scale`) різний для кожного сценарію: заводський цех працює
 * сотнями замовлень, а приймальне відділення — одиницями-десятками пацієнтів і потоком до ~20 за
 * годину (реалістичні порядки величин, а не той самий діапазон чисел під іншими словами).
 */
interface LittleLawContext {
  readonly place: string;
  readonly wipLabel: string;
  readonly wipUnit: string;
  readonly wipForms: UkPluralForms;
  readonly throughputLabel: string;
  /** Назва одиниці для статичного підпису поля відповіді («Пропускна здатність, пацієнтів за годину») — число там не стоїть поруч, тож форма фіксована. */
  readonly throughputUnit: string;
  /** «за добу» / «за годину» — додається після узгодженого з числом іменника (той самий іменник, що й у `wipForms`) там, де λ показано поруч із числом. */
  readonly throughputPeriod: string;
  readonly timeLabel: string;
  readonly timeUnit: string;
  readonly timeForms: UkPluralForms;
  readonly scale: LittleLawScale;
}

/**
 * `k` — спільний масштаб: пропускна здатність λ = k·a, час перебування W = b/k, тому незавершене
 * виробництво L = a·b завжди ціле незалежно від k (a і b — цілі з діапазонів нижче). `aRange` і
 * `bRange` — межі a і b, підібрані так, щоб λ і L відповідали реальному порядку величин сценарію.
 */
interface LittleLawScale {
  readonly k: number;
  readonly aRange: readonly [number, number];
  readonly bRange: readonly [number, number];
}

const CONTEXTS: readonly LittleLawContext[] = [
  {
    place: 'У цеху',
    wipLabel: 'Незавершене виробництво',
    wipUnit: 'замовлень',
    wipForms: { one: 'замовлення', few: 'замовлення', many: 'замовлень', other: 'замовлення' },
    throughputLabel: 'Пропускна здатність',
    throughputUnit: 'замовлень за добу',
    throughputPeriod: 'за добу',
    timeLabel: 'Середній час перебування в системі',
    timeUnit: 'доби',
    timeForms: { one: 'доба', few: 'доби', many: 'діб', other: 'доби' },
    // λ = 10·a ∈ [20; 100] замовлень за добу, W = b/10 ∈ [1,0; 10,0] доби, L = a·b ∈ [20; 1000] замовлень.
    scale: { k: 10, aRange: [2, 10], bRange: [10, 100] },
  },
  {
    place: 'У приймальному відділенні лікарні',
    wipLabel: 'Кількість пацієнтів у відділенні одночасно',
    wipUnit: 'пацієнтів',
    wipForms: { one: 'пацієнт', few: 'пацієнти', many: 'пацієнтів', other: 'пацієнта' },
    throughputLabel: 'Пропускна здатність',
    throughputUnit: 'пацієнтів за годину',
    throughputPeriod: 'за годину',
    timeLabel: 'Середній час перебування пацієнта',
    timeUnit: 'години',
    timeForms: { one: 'година', few: 'години', many: 'годин', other: 'години' },
    // λ = 2·a ∈ [4; 18] пацієнтів за годину (реалістичний потік приймального відділення, до ~20/год),
    // W = b/2 ∈ [1,0; 3,0] години, L = a·b ∈ [4; 54] пацієнтів — одиниці-десятки, а не сотні.
    scale: { k: 2, aRange: [2, 9], bRange: [2, 6] },
  },
];

const UNKNOWN_PROMPTS: Readonly<Record<LittleLawUnknown, string>> = {
  time: 'Визначте середній час перебування одиниці в системі за законом Літтла (CAP-04).',
  wip: 'Визначте середню кількість одиниць у системі (незавершене виробництво) за законом Літтла (CAP-04).',
  throughput: 'Визначте пропускну здатність системи за законом Літтла (CAP-04).',
};

interface CleanTriple {
  readonly throughput: number;
  readonly time: number;
  readonly wip: number;
}

/** λ = k·a, W = b/k, L = a·b — див. `LittleLawScale`. Ціле a·b, а не k·a · (b/k), рахує L: добуток
 * двох цілих не має похибки подвійної точності (наприклад, 30 · 1,7 дало б 50,99999999999999 у JS). */
function cleanTriple(random: RandomSource, scale: LittleLawScale): CleanTriple {
  const a = randomInt(random, scale.aRange[0], scale.aRange[1]);
  const b = randomInt(random, scale.bRange[0], scale.bRange[1]);
  const throughput = scale.k * a;
  const time = b / scale.k;
  const wip = a * b;
  return { throughput, time, wip };
}

/** «204 замовлення за добу» / «4 пацієнти за годину» — той самий іменник, що й у W, з узгодженим числівником. */
function throughputText(context: LittleLawContext, throughput: number): string {
  return `${pluralUk(throughput, context.wipForms)} ${context.throughputPeriod}`;
}

function buildVariant(unknown: LittleLawUnknown, context: LittleLawContext, values: CleanTriple, variantId: string): LittleLawVariant {
  const { throughput, time, wip } = values;
  const given: LittleLawGivenItem[] = [];
  const answers: LittleLawAnswerField[] = [];
  const solution: string[] = [];

  if (unknown === 'time') {
    given.push(
      { label: context.wipLabel, value: pluralUk(wip, context.wipForms) },
      { label: context.throughputLabel, value: throughputText(context, throughput) },
    );
    const expected = roundTo(unwrap(littleLawTime(wip, throughput)), 6);
    answers.push({ id: 'time', label: context.timeLabel, unit: context.timeUnit, unitForms: context.timeForms, expected, tolerance: 0.01 });
    solution.push(
      `${context.throughputLabel} λ = ${throughputText(context, throughput)}.`,
      `${context.wipLabel} L = ${pluralUk(wip, context.wipForms)}.`,
      `${context.timeLabel} W = L / λ = ${formatNumber(wip)} / ${formatNumber(throughput)} = ${pluralUk(expected, context.timeForms)}.`,
    );
  } else if (unknown === 'wip') {
    given.push(
      { label: context.throughputLabel, value: throughputText(context, throughput) },
      { label: context.timeLabel, value: pluralUk(time, context.timeForms) },
    );
    const expected = roundTo(unwrap(littleLawWip(throughput, time)), 6);
    answers.push({ id: 'wip', label: context.wipLabel, unit: context.wipUnit, unitForms: context.wipForms, expected, tolerance: 0.01 });
    solution.push(
      `${context.throughputLabel} λ = ${throughputText(context, throughput)}.`,
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
      `${context.throughputLabel} λ = L / W = ${formatNumber(wip)} / ${formatNumber(time)} = ${throughputText(context, expected)}.`,
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
  const values = cleanTriple(random, context.scale);
  return buildVariant(choice.unknown, context, values, variantId);
}
