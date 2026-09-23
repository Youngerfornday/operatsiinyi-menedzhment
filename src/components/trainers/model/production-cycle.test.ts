import { describe, expect, it } from 'vitest';
import type { ProductionCycleVariant } from '../../../engines/production-cycle';
import type { CalculationTask } from '../../../content/schemas/practical';
import { checkProductionCycleTask, findCalculationTask, toProductionCycleTaskChoices } from './production-cycle';

function variant(overrides: Partial<ProductionCycleVariant> = {}): ProductionCycleVariant {
  return {
    variantId: 'v1',
    method: 'production-cycle',
    prompt: 'Тест',
    given: [],
    answers: [
      { id: 'sequential', label: 'Tпосл', unit: 'хв', expected: 42, tolerance: 0.01 },
      { id: 'parallel', label: 'Tпар', unit: 'хв', expected: 30, tolerance: 0.01 },
      { id: 'mixed', label: 'Tзм', unit: 'хв', expected: 34, tolerance: 0.01 },
    ],
    solution: ['крок 1'],
    ...overrides,
  };
}

describe('checkProductionCycleTask', () => {
  it('усі три відповіді правильні в межах допуску', () => {
    const result = checkProductionCycleTask(variant(), { sequential: '42', parallel: '30', mixed: '34' });
    expect(result).toMatchObject({ ok: true, value: { solved: true } });
  });

  it('одна неправильна відповідь — solved false, лише вона позначена помилковою', () => {
    const result = checkProductionCycleTask(variant(), { sequential: '42', parallel: '99', mixed: '34' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.solved).toBe(false);
    expect(result.value.parts.map((part) => part.correct)).toEqual([true, false, true]);
  });

  it('порожнє чи нечислове поле — помилка з посиланням на поле', () => {
    const result = checkProductionCycleTask(variant(), { sequential: '', parallel: '30', mixed: '34' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error[0]?.field).toBe('sequential');
  });
});

const TASKS: readonly CalculationTask[] = [
  { id: 'production-cycle', method: 'production-cycle', title: 'Цикл', formula: 'f', ref: { source: 's', locator: 'l (PC-01, PC-02, PC-03)', checkedAt: '2026-09-23' } },
];

describe('findCalculationTask', () => {
  it('знаходить єдину задачу за методом', () => {
    expect(findCalculationTask(TASKS, { method: 'production-cycle' })?.id).toBe('production-cycle');
  });

  it('повертає undefined, якщо в пулі немає такого методу', () => {
    expect(findCalculationTask([], { method: 'production-cycle' })).toBeUndefined();
  });
});

describe('toProductionCycleTaskChoices', () => {
  it('переносить method з контенту в пул генератора', () => {
    expect(toProductionCycleTaskChoices(TASKS)).toEqual([{ method: 'production-cycle' }]);
  });

  it('кидає помилку на невідомий рушію метод', () => {
    const broken: readonly CalculationTask[] = [{ ...TASKS[0]!, method: 'little-law' }];
    expect(() => toProductionCycleTaskChoices(broken)).toThrow(/невідомий метод/);
  });
});
