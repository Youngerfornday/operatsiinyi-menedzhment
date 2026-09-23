import { describe, expect, it } from 'vitest';
import type { LineBalancingVariant } from '../../../engines/line-balancing';
import type { CalculationTask } from '../../../content/schemas/practical';
import { checkLineBalancingTask, findCalculationTask, toLineBalancingTaskChoices } from './line-balancing';

function variant(overrides: Partial<LineBalancingVariant> = {}): LineBalancingVariant {
  return {
    variantId: 'v1',
    method: 'line-balance',
    prompt: 'Тест',
    given: [],
    answers: [
      { id: 'takt', label: 'Такт лінії', unit: 'с', expected: 60, tolerance: 0.05 },
      { id: 'nmin', label: 'Мінімальна кількість станцій', unit: 'шт.', expected: 5, tolerance: 0 },
      { id: 'stations', label: 'Фактична кількість станцій', unit: 'шт.', expected: 6, tolerance: 0 },
      { id: 'efficiency', label: 'Ефективність', unit: '%', expected: 72.2, tolerance: 0.1 },
    ],
    solution: ['крок 1'],
    ...overrides,
  };
}

describe('checkLineBalancingTask', () => {
  it('вирішено правильно в межах допуску за всіма чотирма полями', () => {
    const result = checkLineBalancingTask(variant(), { takt: '60', nmin: '5', stations: '6', efficiency: '72,2' });
    expect(result).toMatchObject({ ok: true, value: { solved: true } });
  });

  it('неправильна фактична кількість станцій: solved false', () => {
    const result = checkLineBalancingTask(variant(), { takt: '60', nmin: '5', stations: '5', efficiency: '72,2' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.solved).toBe(false);
    expect(result.value.parts.map((part) => part.correct)).toEqual([true, true, false, true]);
  });

  it('порожнє поле — помилка з посиланням на поле', () => {
    const result = checkLineBalancingTask(variant(), { takt: '', nmin: '5', stations: '6', efficiency: '72,2' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error[0]?.field).toBe('takt');
  });
});

const REF = { source: 's', locator: 'l (LB-01)', checkedAt: '2026-09-23' };
const TASKS: readonly CalculationTask[] = [
  { id: 'factor-rating', method: 'factor-rating', title: 'Метод вагових коефіцієнтів', formula: 'f', ref: REF },
  { id: 'line-balance', method: 'line-balance', title: 'Балансування лінії', formula: 'f', ref: REF },
];

describe('toLineBalancingTaskChoices', () => {
  it('бере лише задачі з методом line-balance, ігноруючи чужі', () => {
    expect(toLineBalancingTaskChoices(TASKS)).toEqual([{ method: 'line-balance' }]);
  });
});

describe('findCalculationTask', () => {
  it('знаходить задачу за методом', () => {
    expect(findCalculationTask(TASKS, { method: 'line-balance' })?.id).toBe('line-balance');
  });

  it('повертає undefined, якщо в пулі немає такого методу', () => {
    expect(findCalculationTask([], { method: 'line-balance' })).toBeUndefined();
  });
});
