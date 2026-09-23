/**
 * Генератор варіантів рушія придатності процесу: поле допуску, стандартне відхилення і зміщення
 * середнього — «охайні» випадкові числа; Cp і Cpk рахує сам рушій (`calculations.ts`), тож очікувана
 * відповідь завжди узгоджена з умовою (docs/research/formula-baseline.md, розділ 8, QC-04, QC-05).
 */
import { randomInt, type RandomSource } from '../shared/random';
import { formatNumber, roundTo } from '../shared/number-format';
import { processCapabilityCp, processCapabilityCpk } from './calculations';
import type { ProcessCapabilityAnswerField, ProcessCapabilityGivenItem, ProcessCapabilityMethod, ProcessCapabilityVariant } from './types';

function unwrap<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: unknown }): T {
  if (!result.ok) throw new Error('Генератор придатності процесу зібрав невалідні дані для рушія');
  return result.value;
}

/** Частка від половини поля допуску, на яку зміщено середнє: 0 — центровано, ближче до ±0,8 — сильне зміщення. */
const SHIFT_FRACTION_TENTHS: readonly [number, number] = [-8, 8];

export interface ProcessCapabilityTaskChoice {
  readonly method: ProcessCapabilityMethod;
}

/**
 * Один варіант з переданого пулу методів (`content/practicals/p07.yaml` → `trainer.tasks`). Метод у
 * цього рушія лише один (`process-capability`), але пул перевіряється так само, як в інших калькуляторів
 * курсу, — порожній пул є помилкою контенту, а не тихою відмовою.
 */
export function createProcessCapabilityVariant(random: RandomSource, tasks: readonly ProcessCapabilityTaskChoice[]): ProcessCapabilityVariant {
  if (tasks.length === 0) throw new Error('Пул задач тренажера придатності процесу порожній');
  const width = randomInt(random, 6, 16);
  const lowerLimit = randomInt(random, 400, 600);
  const upperLimit = lowerLimit + width;
  const sigma = randomInt(random, 8, 20) / 10;
  const halfWidth = width / 2;
  const midpoint = lowerLimit + halfWidth;
  const shiftFraction = randomInt(random, SHIFT_FRACTION_TENTHS[0], SHIFT_FRACTION_TENTHS[1]) / 10;
  const mean = roundTo(midpoint + shiftFraction * halfWidth, 2);

  const cp = unwrap(processCapabilityCp(upperLimit, lowerLimit, sigma));
  const cpk = unwrap(processCapabilityCpk(upperLimit, lowerLimit, mean, sigma));

  const given: ProcessCapabilityGivenItem[] = [
    { label: 'Нижня межа допуску LSL', value: `${formatNumber(lowerLimit)} г` },
    { label: 'Верхня межа допуску USL', value: `${formatNumber(upperLimit)} г` },
    { label: 'Середнє процесу μ', value: `${formatNumber(mean, { maximumFractionDigits: 2 })} г` },
    { label: 'Стандартне відхилення σ', value: `${formatNumber(sigma, { maximumFractionDigits: 2 })} г` },
  ];
  const answers: ProcessCapabilityAnswerField[] = [
    { id: 'cp', label: 'Індекс відтворюваності Cp', unit: '', expected: roundTo(cp, 2), tolerance: 0.02 },
    { id: 'cpk', label: 'Індекс придатності Cpk', unit: '', expected: roundTo(cpk, 2), tolerance: 0.02 },
  ];
  const solution = [
    `Ширина поля допуску: USL − LSL = ${formatNumber(upperLimit)} − ${formatNumber(lowerLimit)} = ${formatNumber(width)} г.`,
    `Cp = (USL − LSL) / (6σ) = ${formatNumber(width)} / (6 · ${formatNumber(sigma)}) ≈ ${formatNumber(cp, { maximumFractionDigits: 3 })} (QC-04).`,
    `Cpk = min[(USL − μ)/(3σ); (μ − LSL)/(3σ)] = min[${formatNumber((upperLimit - mean) / (3 * sigma), { maximumFractionDigits: 3 })}; ${formatNumber((mean - lowerLimit) / (3 * sigma), { maximumFractionDigits: 3 })}] ≈ ${formatNumber(cpk, { maximumFractionDigits: 3 })} (QC-05).`,
    `Cpk ${cpk < cp - 0.005 ? 'менший за Cp — середнє зсунуте від центру поля допуску' : 'дорівнює Cp — процес точно центрований'}.`,
  ];
  const variantId = `pcv-${Math.floor(random.next() * 1e9).toString(36)}`;
  return { variantId, method: 'process-capability', prompt: 'Розрахуйте індекси придатності процесу Cp і Cpk (QC-04, QC-05).', given, answers, solution };
}
