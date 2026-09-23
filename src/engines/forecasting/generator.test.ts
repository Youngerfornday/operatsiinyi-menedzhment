import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '../shared/random';
import { meanAbsoluteDeviation, meanAbsolutePercentageError, meanSquaredError, movingAverageForecast, weightedMovingAverageForecast } from './calculations';
import { createForecastingVariant, type ForecastingTaskChoice } from './generator';
import type { ForecastingMethod } from './types';

const ALL_METHODS: readonly ForecastingMethod[] = [
  'forecast-moving-average',
  'forecast-weighted-moving-average',
  'forecast-exponential-smoothing',
  'forecast-mad',
  'forecast-mse',
  'forecast-mape',
];
const ALL_TASKS: readonly ForecastingTaskChoice[] = ALL_METHODS.map((method) => ({ method }));

function extractNumbers(items: readonly { readonly value: string }[]): number[] {
  return items.map((item) => Number(item.value.replace(/,/g, '.').match(/-?[\d.]+/)?.[0]));
}

function unwrap<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false }): T {
  if (!result.ok) throw new Error('unexpected error result in test fixture');
  return result.value;
}

describe('createForecastingVariant', () => {
  it('той самий seed дає той самий варіант', () => {
    // Arrange / Act
    const first = createForecastingVariant(createSeededRandom('p05:1'), ALL_TASKS);
    const second = createForecastingVariant(createSeededRandom('p05:1'), ALL_TASKS);

    // Assert
    expect(second).toEqual(first);
  });

  it('різні seed дають різні варіанти', () => {
    // Act
    const first = createForecastingVariant(createSeededRandom('p05:1'), ALL_TASKS);
    const second = createForecastingVariant(createSeededRandom('p05:2'), ALL_TASKS);

    // Assert
    expect(second.variantId).not.toEqual(first.variantId);
  });

  it('обирає лише методи з переданого пулу', () => {
    // Arrange
    const only: readonly ForecastingTaskChoice[] = [{ method: 'forecast-mad' }];

    // Act / Assert
    for (let seed = 0; seed < 20; seed += 1) {
      const variant = createForecastingVariant(createSeededRandom(`only:${seed}`), only);
      expect(variant.method).toBe('forecast-mad');
    }
  });

  it('кидає помилку на порожній пул задач', () => {
    expect(() => createForecastingVariant(createSeededRandom('x'), [])).toThrow();
  });

  it('forecast-moving-average: очікуване значення справді дає formula FC-01', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const variant = createForecastingVariant(createSeededRandom(`ma:${seed}`), [{ method: 'forecast-moving-average' }]);
      if (variant.method !== 'forecast-moving-average') throw new Error('unexpected method');
      const values = extractNumbers(variant.given);
      expect(variant.answers[0]!.expected).toBeCloseTo(unwrap(movingAverageForecast(values, values.length)), 6);
    }
  });

  it('forecast-weighted-moving-average: очікуване значення справді дає formula FC-02', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const variant = createForecastingVariant(createSeededRandom(`wma:${seed}`), [{ method: 'forecast-weighted-moving-average' }]);
      if (variant.method !== 'forecast-weighted-moving-average') throw new Error('unexpected method');
      const windowSize = variant.given.length / 2;
      const values = extractNumbers(variant.given.slice(0, windowSize));
      const weights = extractNumbers(variant.given.slice(windowSize));
      expect(variant.answers[0]!.expected).toBeCloseTo(unwrap(weightedMovingAverageForecast(values, weights)), 6);
    }
  });

  it('forecast-mad / forecast-mse / forecast-mape: очікувані значення справді дають FC-04, FC-05, FC-06', () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const mad = createForecastingVariant(createSeededRandom(`mad:${seed}`), [{ method: 'forecast-mad' }]);
      const mse = createForecastingVariant(createSeededRandom(`mse:${seed}`), [{ method: 'forecast-mse' }]);
      const mape = createForecastingVariant(createSeededRandom(`mape:${seed}`), [{ method: 'forecast-mape' }]);
      if (mad.method !== 'forecast-mad' || mse.method !== 'forecast-mse' || mape.method !== 'forecast-mape') throw new Error('unexpected method');

      for (const variant of [mad, mse, mape]) {
        const pairs = variant.given.map((item) => item.value.split('/').map((part) => Number(part.replace(/[^\d.-]/g, ''))) as [number, number]);
        const actuals = pairs.map(([actual]) => actual);
        const forecasts = pairs.map(([, forecast]) => forecast);
        expect(actuals).not.toEqual(forecasts);
      }

      expect(mad.answers[0]!.expected).toBeCloseTo(
        unwrap(meanAbsoluteDeviation(mad.given.map((item) => Number(item.value.split('/')[0]!.trim())), mad.given.map((item) => Number(item.value.split('/')[1]!.replace(/[^\d.-]/g, ''))))),
        6,
      );
      expect(mse.answers[0]!.expected).toBeCloseTo(
        unwrap(meanSquaredError(mse.given.map((item) => Number(item.value.split('/')[0]!.trim())), mse.given.map((item) => Number(item.value.split('/')[1]!.replace(/[^\d.-]/g, ''))))),
        1,
      );
      expect(mape.answers[0]!.expected).toBeCloseTo(
        unwrap(
          meanAbsolutePercentageError(mape.given.map((item) => Number(item.value.split('/')[0]!.trim())), mape.given.map((item) => Number(item.value.split('/')[1]!.replace(/[^\d.-]/g, '')))),
        ),
        2,
      );
    }
  });
});
