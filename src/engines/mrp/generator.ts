/**
 * Генератор варіантів тренажера MRP: один фіксований шаблон триярусної специфікації (А → 2×B + 3×C
 * → B ще й 4×D), як у worked-прикладі лекції «Розгортання потреби за триярусною специфікацією виробу»
 * (MRP-01), але з випадковими нормами витрати, часом постачання, обсягом MPS і запасами — так, щоб
 * кожен варіант розв’язувався тим самим ланцюжком розрахунків (`explodeBom`), а не своєю окремою
 * логікою: генератор і рушій формул не можуть розійтися в числах.
 */
import { randomInt, type RandomSource } from '../shared/random';
import { formatNumber } from '../shared/number-format';
import { explodeBom } from './calculations';
import type { MrpAnswerField, MrpBomItem, MrpExplosionInput, MrpGivenItem, MrpVariant } from './types';

function unwrap<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: unknown }): T {
  if (!result.ok) throw new Error('Генератор MRP зібрав невалідні дані для рушія формул');
  return result.value;
}

/** 0/10/20/30 % від брутто-потреби — так нетто-потреба лишається додатною завжди, коли брутто > 0. */
function pickOnHand(random: RandomSource, gross: number): number {
  return Math.round(gross * (randomInt(random, 0, 3) / 10));
}

const TITLES: Readonly<Record<'a' | 'b' | 'c' | 'd', string>> = {
  a: 'Виріб А (готовий виріб)',
  b: 'Вузол B',
  c: 'Деталь C',
  d: 'Деталь D',
};

function itemGiven(label: string, item: MrpBomItem, withQuantity: boolean): readonly MrpGivenItem[] {
  const quantity: MrpGivenItem[] = withQuantity ? [{ label: `Норма витрати, ${label}`, value: `${formatNumber(item.quantityPerParent)} шт.` }] : [];
  return [
    ...quantity,
    { label: `Наявний запас, ${label}`, value: `${formatNumber(item.onHand)} шт.` },
    { label: `Час постачання, ${label}`, value: `${formatNumber(item.leadTime)} тижд.` },
  ];
}

function answerFor(id: string, label: string, expected: number): MrpAnswerField {
  return { id, label, unit: 'шт.', expected, tolerance: 0 };
}

function releaseAnswerFor(id: string, label: string, expected: number): MrpAnswerField {
  return { id, label, unit: 'тижд.', expected, tolerance: 0 };
}

/** Один відтворюваний варіант «Розгортання специфікації» (MRP-01, MRP-02, MRP-03). */
export function createMrpVariant(random: RandomSource): MrpVariant {
  const variantId = `mrpv-${Math.floor(random.next() * 1e9).toString(36)}`;

  const quantityBA = randomInt(random, 2, 4);
  const quantityCA = randomInt(random, 2, 4);
  const quantityDB = randomInt(random, 2, 5);
  const leadTimeA = randomInt(random, 1, 3);
  const leadTimeB = randomInt(random, 1, 3);
  const leadTimeC = randomInt(random, 1, 3);
  const leadTimeD = randomInt(random, 1, 3);
  const mpsQuantity = 10 * randomInt(random, 5, 20);
  const duePeriod = leadTimeA + Math.max(leadTimeB + leadTimeD, leadTimeC) + randomInt(random, 2, 6);

  // Прохід 1: онHand = 0 усюди, щоб дізнатися «сирі» брутто-потреби зверху вниз (при нульовому запасі
  // планове замовлення дорівнює брутто-потребі на кожному рівні, тож цей прохід і дає ці числа).
  const zeroItem = (id: MrpBomItem['id'], title: string, quantityPerParent: number, leadTime: number): MrpBomItem => ({
    id,
    title,
    quantityPerParent,
    leadTime,
    onHand: 0,
  });
  const rawInput: MrpExplosionInput = {
    a: zeroItem('a', TITLES.a, 1, leadTimeA),
    b: zeroItem('b', TITLES.b, quantityBA, leadTimeB),
    c: zeroItem('c', TITLES.c, quantityCA, leadTimeC),
    d: zeroItem('d', TITLES.d, quantityDB, leadTimeD),
    mpsQuantity,
    duePeriod,
  };
  const raw = unwrap(explodeBom(rawInput));
  const [rawA, rawB, rawC, rawD] = raw;

  // Прохід 2: обраний запас із «сирої» брутто-потреби кожного рівня, потім канонічний розрахунок.
  const onHandA = pickOnHand(random, rawA!.grossRequirement);
  const onHandB = pickOnHand(random, rawB!.grossRequirement);
  const onHandC = pickOnHand(random, rawC!.grossRequirement);
  const onHandD = pickOnHand(random, rawD!.grossRequirement);

  const input: MrpExplosionInput = {
    a: { id: 'a', title: TITLES.a, quantityPerParent: 1, leadTime: leadTimeA, onHand: onHandA },
    b: { id: 'b', title: TITLES.b, quantityPerParent: quantityBA, leadTime: leadTimeB, onHand: onHandB },
    c: { id: 'c', title: TITLES.c, quantityPerParent: quantityCA, leadTime: leadTimeC, onHand: onHandC },
    d: { id: 'd', title: TITLES.d, quantityPerParent: quantityDB, leadTime: leadTimeD, onHand: onHandD },
    mpsQuantity,
    duePeriod,
  };
  const [resultA, resultB, resultC, resultD] = unwrap(explodeBom(input));

  const given: MrpGivenItem[] = [
    { label: 'Потреба в А за MPS', value: `${formatNumber(mpsQuantity)} шт.` },
    { label: 'Тиждень потреби (А)', value: `${formatNumber(duePeriod)} тижд.` },
    ...itemGiven('А', input.a, false),
    ...itemGiven('B (на 1 од. А)', input.b, true),
    ...itemGiven('C (на 1 од. А)', input.c, true),
    ...itemGiven('D (на 1 од. B)', input.d, true),
    { label: 'Розмір партії', value: 'на всіх рівнях — «партія за партією» (MRP-03)' },
  ];

  const answers: readonly MrpAnswerField[] = [
    answerFor('a-net', 'Нетто-потреба А', resultA!.netRequirement),
    releaseAnswerFor('a-release', 'Період запуску замовлення А', resultA!.releasePeriod),
    answerFor('b-gross', 'Брутто-потреба B', resultB!.grossRequirement),
    answerFor('b-net', 'Нетто-потреба B', resultB!.netRequirement),
    releaseAnswerFor('b-release', 'Період запуску замовлення B', resultB!.releasePeriod),
    answerFor('c-gross', 'Брутто-потреба C', resultC!.grossRequirement),
    answerFor('c-net', 'Нетто-потреба C', resultC!.netRequirement),
    releaseAnswerFor('c-release', 'Період запуску замовлення C', resultC!.releasePeriod),
    answerFor('d-gross', 'Брутто-потреба D', resultD!.grossRequirement),
    answerFor('d-net', 'Нетто-потреба D', resultD!.netRequirement),
    releaseAnswerFor('d-release', 'Період запуску замовлення D', resultD!.releasePeriod),
  ];

  const solution: readonly string[] = [
    `Рівень 0 (А): брутто-потреба = MPS = ${formatNumber(mpsQuantity)} шт. Нетто = ${formatNumber(mpsQuantity)} − ${formatNumber(resultA!.onHand)} = ${formatNumber(resultA!.netRequirement)} шт. Планове замовлення А = ${formatNumber(resultA!.plannedOrder)} шт. Запуск: ${formatNumber(duePeriod)} − ${formatNumber(resultA!.leadTime)} = ${formatNumber(resultA!.releasePeriod)} тижд.`,
    `Рівень 1 (B): брутто-потреба = планове замовлення А × норма B/А = ${formatNumber(resultA!.plannedOrder)} × ${formatNumber(quantityBA)} = ${formatNumber(resultB!.grossRequirement)} шт. Нетто = ${formatNumber(resultB!.grossRequirement)} − ${formatNumber(resultB!.onHand)} = ${formatNumber(resultB!.netRequirement)} шт. Планове замовлення B = ${formatNumber(resultB!.plannedOrder)} шт. Запуск: ${formatNumber(resultA!.releasePeriod)} − ${formatNumber(resultB!.leadTime)} = ${formatNumber(resultB!.releasePeriod)} тижд.`,
    `Рівень 1 (C): брутто-потреба = планове замовлення А × норма C/А = ${formatNumber(resultA!.plannedOrder)} × ${formatNumber(quantityCA)} = ${formatNumber(resultC!.grossRequirement)} шт. Нетто = ${formatNumber(resultC!.grossRequirement)} − ${formatNumber(resultC!.onHand)} = ${formatNumber(resultC!.netRequirement)} шт. Планове замовлення C = ${formatNumber(resultC!.plannedOrder)} шт. Запуск: ${formatNumber(resultA!.releasePeriod)} − ${formatNumber(resultC!.leadTime)} = ${formatNumber(resultC!.releasePeriod)} тижд.`,
    `Рівень 2 (D, дочірній вузла B): брутто-потреба = планове замовлення B × норма D/B = ${formatNumber(resultB!.plannedOrder)} × ${formatNumber(quantityDB)} = ${formatNumber(resultD!.grossRequirement)} шт. Нетто = ${formatNumber(resultD!.grossRequirement)} − ${formatNumber(resultD!.onHand)} = ${formatNumber(resultD!.netRequirement)} шт. Планове замовлення D = ${formatNumber(resultD!.plannedOrder)} шт. Запуск: ${formatNumber(resultB!.releasePeriod)} − ${formatNumber(resultD!.leadTime)} = ${formatNumber(resultD!.releasePeriod)} тижд.`,
  ];

  return {
    variantId,
    method: 'bom-explosion',
    prompt: 'Виконайте розвертання специфікації виробу: визначте брутто- і нетто-потребу на кожному рівні та період запуску кожного замовлення (MRP-01, MRP-02, MRP-03).',
    given,
    answers,
    solution,
  };
}
