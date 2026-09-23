import { describe, expect, it } from 'vitest';
import type { ProductivityVariant } from '../../../engines/productivity';
import type { CalculationTask } from '../../../content/schemas/practical';
import { checkProductivityTask, findCalculationTask, toProductivityTaskChoices } from './productivity';

function variant(overrides: Partial<ProductivityVariant> = {}): ProductivityVariant {
  return {
    variantId: 'v1',
    method: 'partial-productivity',
    resource: 'labor',
    prompt: 'Тест',
    given: [],
    answers: [{ id: 'p1', label: 'Продуктивність', unit: 'виробів на людино-годину', expected: 2.5, tolerance: 0.01 }],
    solution: ['крок 1'],
    ...overrides,
  };
}

describe('checkProductivityTask', () => {
  it('вирішено правильно в межах допуску', () => {
    const result = checkProductivityTask(variant(), { p1: '2,5' });
    expect(result).toMatchObject({ ok: true, value: { solved: true } });
  });

  it('неправильна відповідь: solved false, показано очікуване значення', () => {
    const result = checkProductivityTask(variant(), { p1: '3' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.solved).toBe(false);
    expect(result.value.parts[0]).toMatchObject({ correct: false });
  });

  it('порожнє чи нечислове поле — помилка з посиланням на поле', () => {
    const result = checkProductivityTask(variant(), { p1: '' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error[0]?.field).toBe('p1');
  });

  it('перевіряє кілька полів варіанта одночасно (два квартали)', () => {
    const twoFields = variant({
      answers: [
        { id: 'p1', label: 'Квартал I', unit: 'од.', expected: 2.5, tolerance: 0.01 },
        { id: 'p2', label: 'Квартал II', unit: 'од.', expected: 3, tolerance: 0.01 },
      ],
    });
    const result = checkProductivityTask(twoFields, { p1: '2,5', p2: '2,9' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.solved).toBe(false);
    expect(result.value.parts.map((part) => part.correct)).toEqual([true, false]);
  });
});

const TASKS: readonly CalculationTask[] = [
  { id: 'partial-labor', method: 'partial-productivity', resource: 'labor', title: 'За працею', formula: 'f', ref: { source: 's', locator: 'l (PROD-01)', checkedAt: '2026-09-23' } },
  { id: 'partial-materials', method: 'partial-productivity', resource: 'materials', title: 'За матеріалами', formula: 'f', ref: { source: 's', locator: 'l (PROD-01)', checkedAt: '2026-09-23' } },
  { id: 'multifactor', method: 'multifactor-productivity', title: 'Багатофакторна', formula: 'f', ref: { source: 's', locator: 'l (PROD-02)', checkedAt: '2026-09-23' } },
];

describe('findCalculationTask', () => {
  it('розрізняє задачі з тим самим методом за resource', () => {
    expect(findCalculationTask(TASKS, { method: 'partial-productivity', resource: 'materials' })?.id).toBe('partial-materials');
    expect(findCalculationTask(TASKS, { method: 'partial-productivity', resource: 'labor' })?.id).toBe('partial-labor');
  });

  it('знаходить задачу без resource за самим методом', () => {
    expect(findCalculationTask(TASKS, { method: 'multifactor-productivity' })?.id).toBe('multifactor');
  });

  it('повертає undefined, якщо в пулі немає такого методу', () => {
    expect(findCalculationTask(TASKS, { method: 'capacity-usage' })).toBeUndefined();
  });
});

describe('toProductivityTaskChoices', () => {
  it('переносить method і resource з контенту в пул генератора', () => {
    expect(toProductivityTaskChoices(TASKS)).toEqual([
      { method: 'partial-productivity', resource: 'labor' },
      { method: 'partial-productivity', resource: 'materials' },
      { method: 'multifactor-productivity', resource: undefined },
    ]);
  });

  it('кидає помилку на невідомий рушію метод', () => {
    const broken: readonly CalculationTask[] = [{ ...TASKS[0]!, method: 'eoq-lot-size' }];
    expect(() => toProductivityTaskChoices(broken)).toThrow(/невідомий метод/);
  });
});
