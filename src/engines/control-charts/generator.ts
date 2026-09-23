/**
 * Генератор варіантів рушія контрольних карт: x̄-R за кількісною ознакою і p-карта за альтернативною
 * (docs/research/formula-baseline.md, розділ 8, QC-01, QC-02). Дані підгруп — «охайні» випадкові числа;
 * межі рахує сам рушій (`calculations.ts`), тож очікувана відповідь завжди узгоджена з умовою.
 * Кожен варіант, крім меж карти, ставить одне питання «так/ні» — чи сигналізує задана підгрупа про
 * розладнання процесу, — щоб перевірити не лише розрахунок, а й тлумачення сигналу.
 */
import { pickOne, randomInt, type RandomSource } from '../shared/random';
import { formatNumber, formatPercent, roundTo } from '../shared/number-format';
import { pChartLimits, xbarRLimits } from './calculations';
import { MAX_SUBGROUP_SIZE, MIN_SUBGROUP_SIZE } from './constants';
import type { ControlChartAnswerField, ControlChartGivenItem, ControlChartMethod, ControlChartVariant } from './types';

function unwrap<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: unknown }): T {
  if (!result.ok) throw new Error('Генератор контрольних карт зібрав невалідні дані для рушія');
  return result.value;
}

const SUBGROUP_COUNT = 20;

function xbarRVariant(random: RandomSource, variantId: string): ControlChartVariant {
  const subgroupSize = randomInt(random, MIN_SUBGROUP_SIZE, MAX_SUBGROUP_SIZE);
  const grandMean = randomInt(random, 480, 520) / 10;
  const meanRange = randomInt(random, 5, 20) / 10;
  const limits = unwrap(xbarRLimits(grandMean, meanRange, subgroupSize));

  const halfWidth = limits.upperXbar - grandMean;
  const isOutOfControl = random.next() < 0.5;
  const probeMean = isOutOfControl
    ? roundTo(limits.upperXbar + Math.max(0.1, halfWidth) * (randomInt(random, 2, 6) / 10), 2)
    : roundTo(grandMean + halfWidth * (randomInt(random, -6, 6) / 10), 2);

  const given: ControlChartGivenItem[] = [
    { label: 'Розмір підгрупи n', value: `${formatNumber(subgroupSize)}` },
    { label: 'Кількість підгруп', value: `${formatNumber(SUBGROUP_COUNT)}` },
    { label: 'Середнє середніх підгруп X̿', value: `${formatNumber(grandMean, { maximumFractionDigits: 2 })} мм` },
    { label: 'Середній розмах R̄', value: `${formatNumber(meanRange, { maximumFractionDigits: 2 })} мм` },
    { label: `Середнє нової підгрупи №${SUBGROUP_COUNT + 1}`, value: `${formatNumber(probeMean, { maximumFractionDigits: 2 })} мм` },
  ];
  const answers: ControlChartAnswerField[] = [
    { id: 'uclx', label: 'Верхня контрольна межа карти середніх UCLx̄', unit: 'мм', expected: roundTo(limits.upperXbar, 3), tolerance: 0.02 },
    { id: 'lclx', label: 'Нижня контрольна межа карти середніх LCLx̄', unit: 'мм', expected: roundTo(limits.lowerXbar, 3), tolerance: 0.02 },
    { id: 'uclr', label: 'Верхня контрольна межа карти розмахів UCLR', unit: 'мм', expected: roundTo(limits.upperRange, 3), tolerance: 0.02 },
    { id: 'lclr', label: 'Нижня контрольна межа карти розмахів LCLR', unit: 'мм', expected: roundTo(limits.lowerRange, 3), tolerance: 0.02 },
  ];
  const solution = [
    `UCLx̄ = X̿ + A2·R̄ = ${formatNumber(grandMean)} + A2·${formatNumber(meanRange)} = ${formatNumber(limits.upperXbar, { maximumFractionDigits: 3 })} мм (QC-01).`,
    `LCLx̄ = X̿ − A2·R̄ = ${formatNumber(limits.lowerXbar, { maximumFractionDigits: 3 })} мм.`,
    `UCLR = D4·R̄ = ${formatNumber(limits.upperRange, { maximumFractionDigits: 3 })} мм; LCLR = D3·R̄ = ${formatNumber(limits.lowerRange, { maximumFractionDigits: 3 })} мм.`,
    `Підгрупа №${SUBGROUP_COUNT + 1}: X̄ = ${formatNumber(probeMean)} мм ${isOutOfControl ? 'вище UCLx̄' : 'у межах карти'} — ${isOutOfControl ? 'сигнал особливої причини' : 'сигналу немає'}.`,
  ];
  return {
    variantId,
    method: 'xbar-r-chart',
    prompt: 'Розрахуйте контрольні межі карт середніх і розмахів та визначте, чи сигналізує нова підгрупа про розладнання процесу (QC-01).',
    given,
    answers,
    signal: { id: 'signal', label: `Підгрупа №${SUBGROUP_COUNT + 1} сигналізує про розладнання процесу`, expected: isOutOfControl },
    solution,
  };
}

function pChartVariant(random: RandomSource, variantId: string): ControlChartVariant {
  const subgroupSize = 100;
  const defectiveTotal = randomInt(random, 60, 240);
  const totalInspected = subgroupSize * SUBGROUP_COUNT;
  const meanProportion = defectiveTotal / totalInspected;
  const limits = unwrap(pChartLimits(meanProportion, subgroupSize));

  const isOutOfControl = random.next() < 0.5;
  const upperCount = Math.ceil(limits.upper * subgroupSize);
  const probeDefectives = isOutOfControl ? Math.min(subgroupSize, upperCount + randomInt(random, 1, 3)) : Math.max(0, Math.round(meanProportion * subgroupSize));
  const probeProportion = probeDefectives / subgroupSize;

  const given: ControlChartGivenItem[] = [
    { label: 'Обсяг підгрупи n', value: `${formatNumber(subgroupSize)}` },
    { label: `Перевірено одиниць за ${SUBGROUP_COUNT} підгрупами`, value: `${formatNumber(totalInspected)}` },
    { label: 'Дефектних одиниць за всіма підгрупами', value: `${formatNumber(defectiveTotal)}` },
    { label: `Дефектних у новій підгрупі №${SUBGROUP_COUNT + 1}`, value: `${formatNumber(probeDefectives)}` },
  ];
  const answers: ControlChartAnswerField[] = [
    { id: 'uclp', label: 'Верхня контрольна межа UCLp', unit: '%', expected: roundTo(limits.upper * 100, 2), tolerance: 0.1 },
    { id: 'lclp', label: 'Нижня контрольна межа LCLp', unit: '%', expected: roundTo(limits.lower * 100, 2), tolerance: 0.1 },
  ];
  const solution = [
    `p̄ = ${formatNumber(defectiveTotal)} / ${formatNumber(totalInspected)} = ${formatPercent(meanProportion)}.`,
    `UCLp = p̄ + 3√(p̄(1 − p̄)/n) = ${formatPercent(limits.upper)} (QC-02).`,
    `LCLp = p̄ − 3√(p̄(1 − p̄)/n) = ${formatPercent(limits.lower)}${limits.lower === 0 ? ' (обрізано до 0, бо частка не може бути від’ємною)' : ''}.`,
    `Підгрупа №${SUBGROUP_COUNT + 1}: частка дефектних ${formatPercent(probeProportion)} ${isOutOfControl ? 'вище UCLp' : 'у межах карти'} — ${isOutOfControl ? 'сигнал особливої причини' : 'сигналу немає'}.`,
  ];
  return {
    variantId,
    method: 'p-chart',
    prompt: 'Розрахуйте контрольні межі p-карти і визначте, чи сигналізує нова підгрупа про розладнання процесу (QC-02).',
    given,
    answers,
    signal: { id: 'signal', label: `Підгрупа №${SUBGROUP_COUNT + 1} сигналізує про розладнання процесу`, expected: isOutOfControl },
    solution,
  };
}

const GENERATORS: Readonly<Record<ControlChartMethod, (random: RandomSource, variantId: string) => ControlChartVariant>> = {
  'xbar-r-chart': xbarRVariant,
  'p-chart': pChartVariant,
};

export interface ControlChartTaskChoice {
  readonly method: ControlChartMethod;
}

/** Один випадковий варіант з переданого пулу методів (`content/practicals/p07.yaml` → `trainer.tasks`). */
export function createControlChartVariant(random: RandomSource, tasks: readonly ControlChartTaskChoice[]): ControlChartVariant {
  if (tasks.length === 0) throw new Error('Пул задач тренажера контрольних карт порожній');
  const variantId = `ccv-${Math.floor(random.next() * 1e9).toString(36)}`;
  const choice = pickOne(tasks, random);
  return GENERATORS[choice.method](random, variantId);
}
