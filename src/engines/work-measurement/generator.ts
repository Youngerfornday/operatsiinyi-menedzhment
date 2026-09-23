/**
 * Генератор варіантів тренажера нормування праці: основний і допоміжний час — десяті частки
 * хвилини, частки на обслуговування й відпочинок — відсотки оперативного часу, як у
 * WorkedExample code="WM-04" лекції теми 5. Очікувані відповіді рахує сам рушій формул
 * (`calculations.ts`) ланцюжком WM-01 → WM-02 → WM-03 → WM-04.
 */
import { pickOne, randomInt, type RandomSource } from '../shared/random';
import { formatNumber } from '../shared/number-format';
import { operativeTime, outputRate, pieceRateTime, pieceTime } from './calculations';
import type { WorkMeasurementAnswerField, WorkMeasurementGivenItem, WorkMeasurementMethod, WorkMeasurementVariant } from './types';

function unwrap<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: unknown }): T {
  if (!result.ok) throw new Error('Генератор нормування праці зібрав невалідні дані для рушія формул');
  return result.value;
}

const SHIFT_FUND_CHOICES = [420, 450, 480] as const;
const min3 = (value: number): string => formatNumber(value, { maximumFractionDigits: 3 });

function timeStandardVariant(random: RandomSource, variantId: string): WorkMeasurementVariant {
  const mainTime = randomInt(random, 20, 60) / 10;
  const auxTime = randomInt(random, 2, 15) / 10;
  const servicePercent = randomInt(random, 2, 6);
  const restPercent = randomInt(random, 4, 10);
  const serviceShare = servicePercent / 100;
  const restShare = restPercent / 100;
  const setupTime = randomInt(random, 2, 6) * 5;
  const batchSize = randomInt(random, 2, 8) * 10;
  const shiftFund = pickOne(SHIFT_FUND_CHOICES, random);

  const operative = unwrap(operativeTime(mainTime, auxTime));
  const piece = unwrap(pieceTime(operative, serviceShare, restShare));
  const pieceRate = unwrap(pieceRateTime(piece, setupTime, batchSize));
  const output = unwrap(outputRate(shiftFund, pieceRate));

  const given: WorkMeasurementGivenItem[] = [
    { label: 'Основний (технологічний) час, хв', value: min3(mainTime) },
    { label: 'Допоміжний час, хв', value: min3(auxTime) },
    { label: 'Час обслуговування робочого місця, % оперативного часу', value: formatNumber(servicePercent) },
    { label: 'Час на відпочинок і особисті потреби, % оперативного часу', value: formatNumber(restPercent) },
    { label: 'Підготовчо-завершальний час на партію, хв', value: formatNumber(setupTime) },
    { label: 'Розмір партії, шт.', value: formatNumber(batchSize) },
    { label: 'Змінний фонд робочого часу, хв', value: formatNumber(shiftFund) },
  ];

  const answers: WorkMeasurementAnswerField[] = [
    { id: 'pieceTime', label: 'Штучний час', unit: 'хв', expected: piece, tolerance: 0.02 },
    { id: 'pieceRateTime', label: 'Штучно-калькуляційний час', unit: 'хв', expected: pieceRate, tolerance: 0.02 },
    { id: 'outputRate', label: 'Норма виробітку за зміну', unit: 'шт./зміну', expected: output, tolerance: 0 },
  ];

  const serviceMinutes = operative * serviceShare;
  const restMinutes = operative * restShare;
  const solution = [
    `Оперативний час: Топ = ${min3(mainTime)} + ${min3(auxTime)} = ${min3(operative)} хв.`,
    `Час обслуговування: ${min3(operative)} · ${formatNumber(servicePercent)}% = ${min3(serviceMinutes)} хв. Час на відпочинок: ${min3(operative)} · ${formatNumber(restPercent)}% = ${min3(restMinutes)} хв.`,
    `Штучний час: Тшт = ${min3(operative)} + ${min3(serviceMinutes)} + ${min3(restMinutes)} = ${min3(piece)} хв.`,
    `Штучно-калькуляційний час: Тшт.к = ${min3(piece)} + ${formatNumber(setupTime)} / ${formatNumber(batchSize)} = ${min3(pieceRate)} хв.`,
    `Норма виробітку за зміну: Нвир = ${formatNumber(shiftFund)} / ${min3(pieceRate)} ≈ ${formatNumber(shiftFund / pieceRate, { maximumFractionDigits: 1 })}, округлено вниз до ${formatNumber(output)} придатних виробів.`,
  ];

  return {
    variantId,
    method: 'time-standard',
    prompt: 'За хронометражними даними розрахуйте штучний час, штучно-калькуляційний час і норму виробітку (WM-01..04).',
    given,
    answers,
    solution,
  };
}

const GENERATORS: Readonly<Record<WorkMeasurementMethod, (random: RandomSource, variantId: string) => WorkMeasurementVariant>> = {
  'time-standard': timeStandardVariant,
};

export interface WorkMeasurementTaskChoice {
  readonly method: WorkMeasurementMethod;
}

/** Один випадковий варіант з переданого пулу методів (`content/practicals/p04.yaml` → `trainer.tasks`). */
export function createWorkMeasurementVariant(random: RandomSource, tasks: readonly WorkMeasurementTaskChoice[]): WorkMeasurementVariant {
  if (tasks.length === 0) throw new Error('Пул задач тренажера нормування праці порожній');
  const variantId = `wmv-${Math.floor(random.next() * 1e9).toString(36)}`;
  const choice = pickOne(tasks, random);
  return GENERATORS[choice.method](random, variantId);
}
