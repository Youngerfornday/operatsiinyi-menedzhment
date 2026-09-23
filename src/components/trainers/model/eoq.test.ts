import { describe, expect, it } from 'vitest';
import type { EoqVariant } from '../../../engines/eoq';
import type { CalculationTask } from '../../../content/schemas/practical';
import { checkEoqTask, findCalculationTask, toEoqTaskChoices } from './eoq';

function variant(overrides: Partial<EoqVariant> = {}): EoqVariant {
  return {
    variantId: 'v1',
    method: 'eoq',
    prompt: 'Тест',
    given: [],
    answers: [{ id: 'eoq', label: 'Оптимальний розмір замовлення (EOQ)', unit: 'шт.', expected: 600, tolerance: 6 }],
    solution: ['крок 1'],
    ...overrides,
  };
}

describe('checkEoqTask', () => {
  it('вирішено правильно в межах допуску', () => {
    const result = checkEoqTask(variant(), { eoq: '600' });
    expect(result).toMatchObject({ ok: true, value: { solved: true } });
  });

  it('неправильна відповідь: solved false, показано очікуване значення', () => {
    const result = checkEoqTask(variant(), { eoq: '900' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.solved).toBe(false);
    expect(result.value.parts[0]).toMatchObject({ correct: false });
  });

  it('порожнє чи нечислове поле — помилка з посиланням на поле', () => {
    const result = checkEoqTask(variant(), { eoq: '' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error[0]?.field).toBe('eoq');
  });

  it('перевіряє кілька полів варіанта одночасно (страховий запас і точка замовлення)', () => {
    const twoFields = variant({
      method: 'reorder-point',
      answers: [
        { id: 'safety-stock', label: 'Страховий запас', unit: 'шт.', expected: 33, tolerance: 1 },
        { id: 'reorder-point', label: 'Точка замовлення зі страховим запасом', unit: 'шт.', expected: 177, tolerance: 1 },
      ],
    });
    const result = checkEoqTask(twoFields, { 'safety-stock': '33', 'reorder-point': '170' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.solved).toBe(false);
    expect(result.value.parts.map((part) => part.correct)).toEqual([true, false]);
  });
});

const TASKS: readonly CalculationTask[] = [
  { id: 'eoq', method: 'eoq', title: 'Оптимальний розмір замовлення (EOQ)', formula: 'Q* = √(2DS / H)', ref: { source: 's', locator: 'l (EOQ-01)', checkedAt: '2026-09-23' } },
  {
    id: 'reorder-point',
    method: 'reorder-point',
    title: 'Точка замовлення зі страховим запасом',
    formula: 'ROP = d̄ · L; SS = z · σ_dLT',
    ref: { source: 's', locator: 'l (EOQ-03, EOQ-04)', checkedAt: '2026-09-23' },
  },
  {
    id: 'cost-sensitivity',
    method: 'cost-sensitivity',
    title: 'Чутливість сумарних витрат до розміру замовлення',
    formula: 'Витрати(Q) = (D/Q)·S + (Q/2)·H',
    ref: { source: 's', locator: 'l (EOQ-01)', checkedAt: '2026-09-23' },
  },
  // задачі сусідніх тренажерів практичної (MRP, черговість) — той самий спільний список, isEoqMethod має їх ігнорувати
  { id: 'gross-requirement', method: 'gross-requirement', title: 'Брутто-потреба', formula: 'f', ref: { source: 's', locator: 'l (MRP-01)', checkedAt: '2026-09-23' } },
  { id: 'spt', method: 'spt', title: 'SPT', formula: 'f', ref: { source: 's', locator: 'l (SCH-01)', checkedAt: '2026-09-23' } },
];

describe('findCalculationTask', () => {
  it('знаходить задачу за методом', () => {
    expect(findCalculationTask(TASKS, 'eoq')?.id).toBe('eoq');
    expect(findCalculationTask(TASKS, 'reorder-point')?.id).toBe('reorder-point');
  });

  it('повертає undefined, якщо в пулі немає такого методу', () => {
    expect(findCalculationTask(TASKS, 'unknown-method')).toBeUndefined();
  });
});

describe('toEoqTaskChoices', () => {
  it('переносить method з контенту в пул генератора', () => {
    expect(toEoqTaskChoices(TASKS)).toEqual([{ method: 'eoq' }, { method: 'reorder-point' }, { method: 'cost-sensitivity' }]);
  });

  it('фільтрує задачі сусідніх тренажерів практичної, не кидаючи помилку', () => {
    expect(toEoqTaskChoices(TASKS)).not.toContainEqual({ method: 'gross-requirement' });
    expect(toEoqTaskChoices(TASKS)).not.toContainEqual({ method: 'spt' });
  });
});
