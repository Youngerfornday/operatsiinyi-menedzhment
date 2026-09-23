/**
 * Генератор варіантів тренажера прогнозування: для кожного методу з `content/practicals/p05.yaml`
 * (list `tasks`) будує один відтворюваний варіант — дані «охайні, але не очевидні» (значення ряду
 * підбираються так, щоб середнє чи зважена сума виходили точним числом, а не навпаки), і водночас саму
 * відповідь через рушій формул (`calculations.ts`), щоб очікуване значення завжди узгоджувалося
 * з тим, що бачить студент.
 */
import { pickOne, randomInt, type RandomSource } from '../shared/random';
import { formatNumber, roundTo } from '../shared/number-format';
import {
  exponentialSmoothingForecast,
  meanAbsoluteDeviation,
  meanAbsolutePercentageError,
  meanSquaredError,
  movingAverageForecast,
  weightedMovingAverageForecast,
} from './calculations';
import type { ForecastingAnswerField, ForecastingGivenItem, ForecastingMethod, ForecastingVariant } from './types';

function unwrap<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: unknown }): T {
  if (!result.ok) throw new Error('Генератор прогнозування зібрав невалідні дані для рушія формул');
  return result.value;
}

/**
 * Ряд з `count` значень і точно заданим середнім: середнє — кратне 10, відхилення від нього (теж
 * кратні 10) у сумі дають нуль, тож `sum(values) === count * average` без похибки округлення.
 */
function cleanSeriesWithAverage(random: RandomSource, count: number, averageTens: readonly [number, number], deviationTens: readonly [number, number]): { readonly values: number[]; readonly average: number } {
  const average = 10 * randomInt(random, averageTens[0], averageTens[1]);
  const deviations: number[] = [];
  for (let index = 0; index < count - 1; index += 1) {
    deviations.push(10 * randomInt(random, deviationTens[0], deviationTens[1]));
  }
  const last = -deviations.reduce((sum, value) => sum + value, 0);
  const values = [...deviations, last].map((deviation) => average + deviation);
  return { values, average };
}

const demandGiven = (value: number, period: number): ForecastingGivenItem => ({ label: `Попит, період ${period}`, value: `${formatNumber(value)} од.` });

function movingAverageVariant(random: RandomSource, variantId: string): ForecastingVariant {
  const windowSize = randomInt(random, 3, 4);
  const { values } = cleanSeriesWithAverage(random, windowSize, [12, 22], [-3, 3]);
  const expected = roundTo(unwrap(movingAverageForecast(values, windowSize)), 2);
  const given = values.map((value, index) => demandGiven(value, index + 1));
  const answers: ForecastingAnswerField[] = [{ id: 'forecast', label: `Прогноз на період ${windowSize + 1}`, unit: 'од./період', expected, tolerance: 0.05 }];
  const terms = values.map((value) => formatNumber(value)).join(' + ');
  const solution = [`Ft = (${terms}) / ${windowSize} = ${formatNumber(expected, { maximumFractionDigits: 2 })} од./період.`];
  return {
    variantId,
    method: 'forecast-moving-average',
    prompt: `Проста ковзна середня за останні ${windowSize} періоди (FC-01): розрахуйте прогноз на наступний період.`,
    given,
    answers,
    solution,
  };
}

const WMA_WEIGHT_SETS: readonly (readonly number[])[] = [
  [0.2, 0.3, 0.5],
  [0.1, 0.3, 0.6],
  [0.2, 0.2, 0.6],
  [0.1, 0.4, 0.5],
];

function weightedMovingAverageVariant(random: RandomSource, variantId: string): ForecastingVariant {
  const weights = pickOne(WMA_WEIGHT_SETS, random);
  const windowSize = weights.length;
  const { values } = cleanSeriesWithAverage(random, windowSize, [12, 22], [-3, 3]);
  const expected = roundTo(unwrap(weightedMovingAverageForecast(values, weights)), 2);
  const given: ForecastingGivenItem[] = [
    ...values.map((value, index) => demandGiven(value, index + 1)),
    ...weights.map((weight, index) => ({ label: `Вага періоду ${index + 1}`, value: formatNumber(weight, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) })),
  ];
  const answers: ForecastingAnswerField[] = [{ id: 'forecast', label: `Прогноз на період ${windowSize + 1}`, unit: 'од./період', expected, tolerance: 0.05 }];
  const terms = values.map((value, index) => `${formatNumber(weights[index]!, { maximumFractionDigits: 1 })}·${formatNumber(value)}`).join(' + ');
  const solution = [`Ft = ${terms} = ${formatNumber(expected, { maximumFractionDigits: 2 })} од./період.`];
  return {
    variantId,
    method: 'forecast-weighted-moving-average',
    prompt: `Зважена ковзна середня за ${windowSize} періоди (FC-02): розрахуйте прогноз на наступний період, де більша вага належить ближчому періоду.`,
    given,
    answers,
    solution,
  };
}

const ALPHA_SET = [0.1, 0.2, 0.3, 0.4] as const;

function exponentialSmoothingVariant(random: RandomSource, variantId: string): ForecastingVariant {
  const alpha = pickOne(ALPHA_SET, random);
  const previousForecast = 10 * randomInt(random, 10, 20);
  const previousActual = previousForecast + 10 * randomInt(random, -3, 3);
  const expected = roundTo(unwrap(exponentialSmoothingForecast(previousForecast, previousActual, alpha)), 2);
  const given: ForecastingGivenItem[] = [
    { label: 'Прогноз попереднього періоду (Ft−1)', value: `${formatNumber(previousForecast)} од.` },
    { label: 'Фактичний попит попереднього періоду (Dt−1)', value: `${formatNumber(previousActual)} од.` },
    { label: 'Константа згладжування α', value: formatNumber(alpha, { maximumFractionDigits: 1 }) },
  ];
  const answers: ForecastingAnswerField[] = [{ id: 'forecast', label: 'Прогноз на наступний період', unit: 'од./період', expected, tolerance: 0.05 }];
  const solution = [
    `Ft = ${formatNumber(previousForecast)} + ${formatNumber(alpha, { maximumFractionDigits: 1 })} · (${formatNumber(previousActual)} − ${formatNumber(previousForecast)}) = ${formatNumber(expected, { maximumFractionDigits: 2 })} од./період.`,
  ];
  return { variantId, method: 'forecast-exponential-smoothing', prompt: 'Експоненційне згладжування (FC-03): розрахуйте прогноз на наступний період.', given, answers, solution };
}

/** П’ять пар «факт / прогноз» для оцінювання точності: відхилення завжди ненульове хоча б в одному періоді. */
function historyPairs(random: RandomSource, count: number): { readonly actuals: number[]; readonly forecasts: number[] } {
  const actuals: number[] = [];
  const forecasts: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const actual = 10 * randomInt(random, 10, 25);
    const deviation = 5 * randomInt(random, -4, 4) || 5;
    actuals.push(actual);
    forecasts.push(actual - deviation);
  }
  return { actuals, forecasts };
}

const HISTORY_LENGTH = 5;

function historyGiven(actuals: readonly number[], forecasts: readonly number[]): ForecastingGivenItem[] {
  return actuals.map((actual, index) => ({ label: `Період ${index + 1}: факт / прогноз`, value: `${formatNumber(actual)} / ${formatNumber(forecasts[index]!)} од.` }));
}

function madVariant(random: RandomSource, variantId: string): ForecastingVariant {
  const { actuals, forecasts } = historyPairs(random, HISTORY_LENGTH);
  const expected = roundTo(unwrap(meanAbsoluteDeviation(actuals, forecasts)), 2);
  const answers: ForecastingAnswerField[] = [{ id: 'mad', label: 'Середнє абсолютне відхилення (MAD)', unit: 'од.', expected, tolerance: 0.05 }];
  const terms = actuals.map((actual, index) => `|${formatNumber(actual)} − ${formatNumber(forecasts[index]!)}|`).join(' + ');
  const solution = [`MAD = (${terms}) / ${actuals.length} = ${formatNumber(expected, { maximumFractionDigits: 2 })} од.`];
  return { variantId, method: 'forecast-mad', prompt: `Середнє абсолютне відхилення прогнозу (FC-04) за ${HISTORY_LENGTH} періодів.`, given: historyGiven(actuals, forecasts), answers, solution };
}

function mseVariant(random: RandomSource, variantId: string): ForecastingVariant {
  const { actuals, forecasts } = historyPairs(random, HISTORY_LENGTH);
  const expected = roundTo(unwrap(meanSquaredError(actuals, forecasts)), 2);
  const answers: ForecastingAnswerField[] = [{ id: 'mse', label: 'Середньоквадратична похибка (MSE)', unit: 'од.²', expected, tolerance: 0.5 }];
  const terms = actuals.map((actual, index) => `(${formatNumber(actual)} − ${formatNumber(forecasts[index]!)})²`).join(' + ');
  const solution = [`MSE = (${terms}) / ${actuals.length} = ${formatNumber(expected, { maximumFractionDigits: 2 })} од.²`];
  return { variantId, method: 'forecast-mse', prompt: `Середньоквадратична похибка прогнозу (FC-05) за ${HISTORY_LENGTH} періодів.`, given: historyGiven(actuals, forecasts), answers, solution };
}

function mapeVariant(random: RandomSource, variantId: string): ForecastingVariant {
  const { actuals, forecasts } = historyPairs(random, HISTORY_LENGTH);
  const expected = roundTo(unwrap(meanAbsolutePercentageError(actuals, forecasts)), 2);
  const answers: ForecastingAnswerField[] = [{ id: 'mape', label: 'Середня абсолютна похибка у відсотках (MAPE)', unit: '%', expected, tolerance: 0.05 }];
  const terms = actuals.map((actual, index) => `|${formatNumber(actual)} − ${formatNumber(forecasts[index]!)}| / ${formatNumber(actual)}`).join(' + ');
  const solution = [`MAPE = 100 % · (${terms}) / ${actuals.length} = ${formatNumber(expected, { maximumFractionDigits: 2 })} %.`];
  return { variantId, method: 'forecast-mape', prompt: `Середня абсолютна похибка прогнозу у відсотках (FC-06) за ${HISTORY_LENGTH} періодів.`, given: historyGiven(actuals, forecasts), answers, solution };
}

const GENERATORS: Readonly<Record<ForecastingMethod, (random: RandomSource, variantId: string) => ForecastingVariant>> = {
  'forecast-moving-average': movingAverageVariant,
  'forecast-weighted-moving-average': weightedMovingAverageVariant,
  'forecast-exponential-smoothing': exponentialSmoothingVariant,
  'forecast-mad': madVariant,
  'forecast-mse': mseVariant,
  'forecast-mape': mapeVariant,
};

export interface ForecastingTaskChoice {
  readonly method: ForecastingMethod;
}

/** Один випадковий варіант з переданого пулу методів (`content/practicals/p05.yaml` → `trainer.tasks`). */
export function createForecastingVariant(random: RandomSource, tasks: readonly ForecastingTaskChoice[]): ForecastingVariant {
  if (tasks.length === 0) throw new Error('Пул задач тренажера прогнозування порожній');
  const variantId = `fv-${Math.floor(random.next() * 1e9).toString(36)}`;
  const choice = pickOne(tasks, random);
  return GENERATORS[choice.method](random, variantId);
}
