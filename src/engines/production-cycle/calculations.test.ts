import { describe, expect, it } from 'vitest';
import { mixedCycleTime, parallelCycleTime, productionCycleTimes, sequentialCycleTime } from './calculations';
import type { CycleOperation } from './types';

/**
 * Фікстури — вивірені числа з content/modules/m1/t04/lecture.mdx, WorkedExample code="PC-01":
 * n = 6, три операції (токарна 2 хв, фрезерна 1 хв, шліфувальна 4 хв, по одному робочому місцю),
 * транспортна партія p = 2 → Tпосл = 42 хв, Tпар = 30 хв, Tзм = 34 хв. Другий приклад (code="PC-02")
 * дає граничні значення p = 1 → 27 хв і p = n = 6 → 42 хв (точно дорівнює Tпосл).
 */
const LECTURE_OPERATIONS: readonly CycleOperation[] = [
  { time: 2, workplaces: 1 },
  { time: 1, workplaces: 1 },
  { time: 4, workplaces: 1 },
];

describe('sequentialCycleTime (PC-01)', () => {
  it('42 хв для партії з 6 деталей і трьох операцій лекції', () => {
    expect(sequentialCycleTime(LECTURE_OPERATIONS, 6)).toEqual({ ok: true, value: 42 });
  });

  it('ділить норму часу на кількість робочих місць операції', () => {
    const twoWorkplaces: readonly CycleOperation[] = [{ time: 4, workplaces: 2 }, { time: 6, workplaces: 1 }];
    // Σ(ti/Ci) = 2 + 6 = 8; Tпосл = 3 · 8 = 24.
    expect(sequentialCycleTime(twoWorkplaces, 3)).toEqual({ ok: true, value: 24 });
  });

  it('відхиляє менше двох операцій, недодатні дані й нецілий розмір партії', () => {
    expect(sequentialCycleTime([LECTURE_OPERATIONS[0]!], 6)).toMatchObject({ ok: false, error: { code: 'too-few-operations' } });
    expect(sequentialCycleTime([{ time: 0, workplaces: 1 }, { time: 1, workplaces: 1 }], 6)).toMatchObject({ ok: false, error: { code: 'negative-value' } });
    expect(sequentialCycleTime(LECTURE_OPERATIONS, 6.5)).toMatchObject({ ok: false, error: { code: 'invalid-batch-size' } });
    expect(sequentialCycleTime(LECTURE_OPERATIONS, 0)).toMatchObject({ ok: false, error: { code: 'invalid-batch-size' } });
  });
});

describe('parallelCycleTime (PC-02)', () => {
  it('30 хв для транспортної партії p = 2', () => {
    expect(parallelCycleTime(LECTURE_OPERATIONS, 6, 2)).toEqual({ ok: true, value: 30 });
  });

  it('граничний випадок p = 1: 27 хв', () => {
    expect(parallelCycleTime(LECTURE_OPERATIONS, 6, 1)).toEqual({ ok: true, value: 27 });
  });

  it('граничний випадок p = n = 6: точно дорівнює Tпосл (42 хв)', () => {
    const result = parallelCycleTime(LECTURE_OPERATIONS, 6, 6);
    expect(result).toEqual({ ok: true, value: 42 });
    expect(result).toEqual(sequentialCycleTime(LECTURE_OPERATIONS, 6));
  });

  it('лінійний зв’язок: кожна одиниця p додає різницю Σ(ti/Ci) − max(ti/Ci) = 3 хв', () => {
    const p2 = parallelCycleTime(LECTURE_OPERATIONS, 6, 2);
    const p3 = parallelCycleTime(LECTURE_OPERATIONS, 6, 3);
    expect(p2.ok && p3.ok && p3.value - p2.value).toBe(3);
  });

  it('відхиляє транспортну партію, яка не ділить розмір партії, і партію поза межами 1..n', () => {
    expect(parallelCycleTime(LECTURE_OPERATIONS, 6, 4)).toMatchObject({ ok: false, error: { code: 'invalid-transfer-batch' } });
    expect(parallelCycleTime(LECTURE_OPERATIONS, 6, 0)).toMatchObject({ ok: false, error: { code: 'invalid-transfer-batch' } });
    expect(parallelCycleTime(LECTURE_OPERATIONS, 6, 7)).toMatchObject({ ok: false, error: { code: 'invalid-transfer-batch' } });
  });
});

describe('mixedCycleTime (PC-03)', () => {
  it('34 хв для транспортної партії p = 2', () => {
    expect(mixedCycleTime(LECTURE_OPERATIONS, 6, 2)).toEqual({ ok: true, value: 34 });
  });

  it('порядок Tпар ≤ Tзм ≤ Tпосл виконується для даних лекції', () => {
    const sequential = sequentialCycleTime(LECTURE_OPERATIONS, 6);
    const parallel = parallelCycleTime(LECTURE_OPERATIONS, 6, 2);
    const mixed = mixedCycleTime(LECTURE_OPERATIONS, 6, 2);
    expect(parallel.ok && mixed.ok && sequential.ok && parallel.value <= mixed.value && mixed.value <= sequential.value).toBe(true);
  });

  it('поширює помилку транспортної партії, не рахуючи суму мінімумів на невалідних даних', () => {
    expect(mixedCycleTime(LECTURE_OPERATIONS, 6, 4)).toMatchObject({ ok: false, error: { code: 'invalid-transfer-batch' } });
  });
});

describe('productionCycleTimes', () => {
  it('рахує всі три тривалості циклу за один виклик (42, 30, 34 хв)', () => {
    const result = productionCycleTimes(LECTURE_OPERATIONS, 6, 2);
    expect(result).toEqual({ ok: true, value: { sequential: 42, parallel: 30, mixed: 34 } });
  });

  it('поширює першу-ліпшу помилку, не рахуючи решту', () => {
    expect(productionCycleTimes(LECTURE_OPERATIONS, 6, 5)).toMatchObject({ ok: false, error: { code: 'invalid-transfer-batch' } });
    expect(productionCycleTimes([LECTURE_OPERATIONS[0]!], 6, 1)).toMatchObject({ ok: false, error: { code: 'too-few-operations' } });
  });
});
