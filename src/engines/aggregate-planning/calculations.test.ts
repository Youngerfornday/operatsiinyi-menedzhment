import { describe, expect, it } from 'vitest';
import { chaseStrategyWorkforce, evaluatePlan, levelStrategyWorkforce } from './calculations';

/**
 * Фікстури — вивірені числа з content/modules/m2/t06/lecture.mdx, WorkedExample code="AGG-01"
 * і code="AGG-02" («Агрегатний план на шість місяців»): той самий ряд попиту, продуктивність,
 * початкова чисельність персоналу й ставки, лише стратегія — інша.
 */
const DEMAND = [700, 900, 1100, 1300, 1100, 900];
const PRODUCTIVITY = 20;
const PARAMS = { productivityPerWorker: PRODUCTIVITY, regularWagePerWorker: 3000, hiringCostPerWorker: 2000, firingCostPerWorker: 4000, holdingCostPerUnit: 50, shortageCostPerUnit: 200 };

describe('chaseStrategyWorkforce (AGG-01)', () => {
  it('потрібна чисельність персоналу — попит періоду поділений на продуктивність робітника', () => {
    // Act
    const result = chaseStrategyWorkforce(DEMAND, PRODUCTIVITY);

    // Assert
    expect(result).toEqual({ ok: true, value: [35, 45, 55, 65, 55, 45] });
  });

  it('відхиляє порожній горизонт, від’ємний попит і невалідну продуктивність', () => {
    expect(chaseStrategyWorkforce([], PRODUCTIVITY)).toMatchObject({ ok: false, error: { code: 'empty-horizon' } });
    expect(chaseStrategyWorkforce([10, -5], PRODUCTIVITY)).toMatchObject({ ok: false, error: { code: 'negative-value' } });
    expect(chaseStrategyWorkforce(DEMAND, 0)).toMatchObject({ ok: false, error: { code: 'non-positive-productivity' } });
  });
});

describe('levelStrategyWorkforce (AGG-02)', () => {
  it('стала чисельність персоналу — середній попит за весь горизонт поділений на продуктивність', () => {
    // Act
    const result = levelStrategyWorkforce(DEMAND, PRODUCTIVITY);

    // Assert
    expect(result).toEqual({ ok: true, value: [50, 50, 50, 50, 50, 50] });
  });

  it('відхиляє порожній горизонт, від’ємний попит і невалідну продуктивність', () => {
    expect(levelStrategyWorkforce([], PRODUCTIVITY)).toMatchObject({ ok: false, error: { code: 'empty-horizon' } });
    expect(levelStrategyWorkforce([10, -5], PRODUCTIVITY)).toMatchObject({ ok: false, error: { code: 'negative-value' } });
    expect(levelStrategyWorkforce(DEMAND, 0)).toMatchObject({ ok: false, error: { code: 'non-positive-productivity' } });
  });
});

describe('evaluatePlan (AGG-03)', () => {
  it('стратегія погоні — 1 060 000 г.о., як у WorkedExample AGG-01 лекції', () => {
    // Arrange
    const workforce = chaseStrategyWorkforce(DEMAND, PRODUCTIVITY);
    if (!workforce.ok) throw new Error('unexpected error');

    // Act
    const result = evaluatePlan(DEMAND, workforce.value, 40, 0, PARAMS);

    // Assert
    expect(result).toEqual({
      ok: true,
      value: {
        workforce: [35, 45, 55, 65, 55, 45],
        production: [700, 900, 1100, 1300, 1100, 900],
        inventory: [0, 0, 0, 0, 0, 0],
        regularCost: 900_000,
        hiringCost: 60_000,
        firingCost: 100_000,
        holdingCost: 0,
        shortageCost: 0,
        totalCost: 1_060_000,
      },
    });
  });

  it('стратегія рівномірного виробництва — 995 000 г.о., як у WorkedExample AGG-02 лекції', () => {
    // Arrange
    const workforce = levelStrategyWorkforce(DEMAND, PRODUCTIVITY);
    if (!workforce.ok) throw new Error('unexpected error');

    // Act
    const result = evaluatePlan(DEMAND, workforce.value, 40, 100, PARAMS);

    // Assert
    expect(result).toEqual({
      ok: true,
      value: {
        workforce: [50, 50, 50, 50, 50, 50],
        production: [1000, 1000, 1000, 1000, 1000, 1000],
        inventory: [400, 500, 400, 100, 0, 100],
        regularCost: 900_000,
        hiringCost: 20_000,
        firingCost: 0,
        holdingCost: 75_000,
        shortageCost: 0,
        totalCost: 995_000,
      },
    });
  });

  it('дефіцит нараховується, коли запас іде в мінус', () => {
    // Arrange: постійний штат нижче за потрібний для одного періоду веде до дефіциту.
    const demand = [1000, 2000];
    const workforce = [50, 50];

    // Act
    const result = evaluatePlan(demand, workforce, 50, 0, PARAMS);

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.inventory).toEqual([0, -1000]);
    expect(result.value.shortageCost).toBe(200_000);
    expect(result.value.holdingCost).toBe(0);
  });

  it('відхиляє розбіжність довжин рядів попиту й персоналу', () => {
    expect(evaluatePlan([100, 100], [5], 40, 0, PARAMS)).toMatchObject({ ok: false, error: { code: 'length-mismatch' } });
  });

  it('відхиляє порожній горизонт і від’ємні значення попиту чи персоналу', () => {
    expect(evaluatePlan([], [], 40, 0, PARAMS)).toMatchObject({ ok: false, error: { code: 'empty-horizon' } });
    expect(evaluatePlan([-10], [5], 40, 0, PARAMS)).toMatchObject({ ok: false, error: { code: 'negative-value' } });
    expect(evaluatePlan([10], [-5], 40, 0, PARAMS)).toMatchObject({ ok: false, error: { code: 'negative-value' } });
  });

  it('відхиляє невалідну продуктивність і від’ємну ставку витрат', () => {
    expect(evaluatePlan([100], [5], 40, 0, { ...PARAMS, productivityPerWorker: 0 })).toMatchObject({ ok: false, error: { code: 'non-positive-productivity' } });
    expect(evaluatePlan([100], [5], 40, 0, { ...PARAMS, holdingCostPerUnit: -1 })).toMatchObject({ ok: false, error: { code: 'negative-cost' } });
  });
});
