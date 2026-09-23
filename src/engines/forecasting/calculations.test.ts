import { describe, expect, it } from 'vitest';
import {
  exponentialSmoothingForecast,
  exponentialSmoothingSeries,
  meanAbsoluteDeviation,
  meanAbsolutePercentageError,
  meanSquaredError,
  movingAverageForecast,
  weightedMovingAverageForecast,
} from './calculations';

describe('movingAverageForecast (FC-01)', () => {
  it('рахує просте середнє останніх n значень ряду', () => {
    // Arrange
    const actuals = [100, 120, 140];

    // Act
    const result = movingAverageForecast(actuals, 3);

    // Assert
    expect(result).toEqual({ ok: true, value: 120 });
  });

  it('бере лише останнє вікно, якщо ряд довший за вікно', () => {
    // Arrange
    const actuals = [10, 10, 100, 120, 140];

    // Act
    const result = movingAverageForecast(actuals, 3);

    // Assert
    expect(result).toEqual({ ok: true, value: 120 });
  });

  it('відхиляє вікно більше за ряд, нецілий і невалідний розмір вікна', () => {
    // Arrange
    const actuals = [100, 120, 140];

    // Act / Assert
    expect(movingAverageForecast(actuals, 4)).toMatchObject({ ok: false, error: { code: 'invalid-window' } });
    expect(movingAverageForecast(actuals, 2.5)).toMatchObject({ ok: false, error: { code: 'invalid-window' } });
    expect(movingAverageForecast(actuals, 0)).toMatchObject({ ok: false, error: { code: 'invalid-window' } });
  });
});

describe('weightedMovingAverageForecast (FC-02)', () => {
  it('рахує зважену суму, коли ваги в сумі дають 1', () => {
    // Arrange
    const actuals = [100, 120, 140];
    const weights = [0.2, 0.3, 0.5];

    // Act
    const result = weightedMovingAverageForecast(actuals, weights);

    // Assert
    expect(result.ok && result.value).toBeCloseTo(126, 9);
  });

  it('відхиляє порожній ряд, розбіжність довжин і суму ваг не 1', () => {
    // Act / Assert
    expect(weightedMovingAverageForecast([], [])).toMatchObject({ ok: false, error: { code: 'empty-series' } });
    expect(weightedMovingAverageForecast([100, 120], [1])).toMatchObject({ ok: false, error: { code: 'invalid-weights' } });
    expect(weightedMovingAverageForecast([100, 120], [0.2, 0.3])).toMatchObject({ ok: false, error: { code: 'invalid-weights' } });
  });

  it('відхиляє нульову й від’ємну вагу', () => {
    // Act / Assert
    expect(weightedMovingAverageForecast([100, 120], [0, 1])).toMatchObject({ ok: false, error: { code: 'invalid-weights' } });
    expect(weightedMovingAverageForecast([100, 120], [-0.1, 1.1])).toMatchObject({ ok: false, error: { code: 'invalid-weights' } });
  });
});

describe('exponentialSmoothingForecast (FC-03)', () => {
  it('рахує наступний прогноз за попереднім прогнозом і фактом', () => {
    // Act
    const result = exponentialSmoothingForecast(100, 120, 0.3);

    // Assert
    expect(result).toEqual({ ok: true, value: 106 });
  });

  it('відхиляє константу згладжування поза межами (0, 1)', () => {
    // Act / Assert
    expect(exponentialSmoothingForecast(100, 120, 0)).toMatchObject({ ok: false, error: { code: 'invalid-alpha' } });
    expect(exponentialSmoothingForecast(100, 120, 1)).toMatchObject({ ok: false, error: { code: 'invalid-alpha' } });
    expect(exponentialSmoothingForecast(100, 120, -0.1)).toMatchObject({ ok: false, error: { code: 'invalid-alpha' } });
    expect(exponentialSmoothingForecast(100, 120, 1.2)).toMatchObject({ ok: false, error: { code: 'invalid-alpha' } });
  });
});

describe('exponentialSmoothingSeries', () => {
  it('генерує прогноз для кожного періоду поспіль від початкового прогнозу', () => {
    // Arrange
    const actuals = [120, 130, 125];

    // Act
    const result = exponentialSmoothingSeries(actuals, 0.3, 100);

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value[0]).toBeCloseTo(100, 9);
    expect(result.value[1]).toBeCloseTo(106, 9);
    expect(result.value[2]).toBeCloseTo(113.2, 9);
  });

  it('відхиляє порожній ряд і невалідну константу згладжування', () => {
    // Act / Assert
    expect(exponentialSmoothingSeries([], 0.3, 100)).toMatchObject({ ok: false, error: { code: 'empty-series' } });
    expect(exponentialSmoothingSeries([100], 0, 100)).toMatchObject({ ok: false, error: { code: 'invalid-alpha' } });
  });
});

describe('похибки прогнозу (FC-04, FC-05, FC-06)', () => {
  const actuals = [120, 130, 125];
  const forecasts = [100, 106, 113.2];

  it('MAD — середнє абсолютне відхилення', () => {
    // Act
    const result = meanAbsoluteDeviation(actuals, forecasts);

    // Assert
    expect(result.ok && result.value).toBeCloseTo(18.6, 9);
  });

  it('MSE — середньоквадратична похибка', () => {
    // Act
    const result = meanSquaredError(actuals, forecasts);

    // Assert
    expect(result.ok && result.value).toBeCloseTo(371.7467, 3);
  });

  it('MAPE — середня абсолютна похибка у відсотках', () => {
    // Act
    const result = meanAbsolutePercentageError(actuals, forecasts);

    // Assert
    expect(result.ok && result.value).toBeCloseTo(14.856, 3);
  });

  it('відхиляють розбіжність довжин і порожній ряд', () => {
    // Act / Assert
    expect(meanAbsoluteDeviation([1, 2], [1])).toMatchObject({ ok: false, error: { code: 'length-mismatch' } });
    expect(meanSquaredError([], [])).toMatchObject({ ok: false, error: { code: 'empty-series' } });
    expect(meanAbsolutePercentageError([1, 2], [1])).toMatchObject({ ok: false, error: { code: 'length-mismatch' } });
  });

  it('MAPE відхиляє нульове фактичне значення', () => {
    // Act
    const result = meanAbsolutePercentageError([0, 100], [1, 100]);

    // Assert
    expect(result).toMatchObject({ ok: false, error: { code: 'zero-actual' } });
  });
});
