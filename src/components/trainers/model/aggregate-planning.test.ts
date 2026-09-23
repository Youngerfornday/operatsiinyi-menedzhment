import { describe, expect, it } from 'vitest';
import type { AggregatePlanningVariant } from '../../../engines/aggregate-planning';
import type { CalculationTask } from '../../../content/schemas/practical';
import { AGGREGATE_PLANNING_METHODS, checkAggregatePlanningTask, findAggregatePlanningTask, toAggregatePlanningTaskChoices } from './aggregate-planning';

function variant(overrides: Partial<AggregatePlanningVariant> = {}): AggregatePlanningVariant {
  return {
    variantId: 'v1',
    method: 'aggregate-plan-costs',
    prompt: 'Тест',
    given: [],
    answers: [
      { id: 'chase-cost', label: 'Погоня за попитом', unit: 'грн', expected: 2800, tolerance: 0.5 },
      { id: 'level-cost', label: 'Рівномірне виробництво', unit: 'грн', expected: 2600, tolerance: 0.5 },
    ],
    solution: ['крок 1'],
    ...overrides,
  };
}

describe('checkAggregatePlanningTask', () => {
  it('вирішено правильно в межах допуску', () => {
    const result = checkAggregatePlanningTask(variant(), { 'chase-cost': '2800', 'level-cost': '2600' });
    expect(result).toMatchObject({ ok: true, value: { solved: true } });
  });

  it('неправильна відповідь по одній зі стратегій: solved false', () => {
    const result = checkAggregatePlanningTask(variant(), { 'chase-cost': '2800', 'level-cost': '2000' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.solved).toBe(false);
    expect(result.value.parts.map((part) => part.correct)).toEqual([true, false]);
  });

  it('порожнє чи нечислове поле — помилка з посиланням на поле', () => {
    const result = checkAggregatePlanningTask(variant(), { 'chase-cost': '', 'level-cost': '2600' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error[0]?.field).toBe('chase-cost');
  });
});

const REF = { source: 's', locator: 'l (AGG-03)', checkedAt: '2026-09-23' };
const TASKS: readonly CalculationTask[] = [
  { id: 'moving-average', method: 'forecast-moving-average', title: 'Проста ковзна середня', formula: 'f', ref: REF },
  { id: 'plan-costs', method: 'aggregate-plan-costs', title: 'Агрегатний план', formula: 'f', ref: REF },
];

describe('findAggregatePlanningTask', () => {
  it('знаходить задачу контенту за методом', () => {
    expect(findAggregatePlanningTask(TASKS, { method: 'aggregate-plan-costs' })?.id).toBe('plan-costs');
  });
});

describe('toAggregatePlanningTaskChoices', () => {
  it('переносить лише методи рушія агрегатного планування з пулу практичної', () => {
    expect(toAggregatePlanningTaskChoices(TASKS)).toEqual([{ method: 'aggregate-plan-costs' }]);
  });

  it('тихо пропускає метод, що належить іншому тренажеру практичної (прогнозування)', () => {
    expect(toAggregatePlanningTaskChoices(TASKS).some((choice) => (choice.method as string) === 'forecast-moving-average')).toBe(false);
  });

  it('перелік відомих методів рушія відповідає AggregatePlanningMethod', () => {
    expect(AGGREGATE_PLANNING_METHODS).toEqual(['aggregate-plan-costs']);
  });
});
