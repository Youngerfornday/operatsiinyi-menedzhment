import { describe, expect, it } from 'vitest';
import type { FacilityLocationVariant } from '../../../engines/facility-location';
import type { CalculationTask } from '../../../content/schemas/practical';
import { checkFacilityLocationTask, findCalculationTask, toFacilityLocationTaskChoices } from './facility-location';

function variant(overrides: Partial<FacilityLocationVariant> = {}): FacilityLocationVariant {
  return {
    variantId: 'v1',
    method: 'factor-rating',
    prompt: 'Тест',
    given: [],
    answers: [
      { id: 'siteA', label: 'Майданчик А', unit: 'бала', expected: 71.5, tolerance: 0.05 },
      { id: 'siteB', label: 'Майданчик Б', unit: 'бала', expected: 76.25, tolerance: 0.05 },
    ],
    solution: ['крок 1'],
    ...overrides,
  };
}

describe('checkFacilityLocationTask', () => {
  it('вирішено правильно в межах допуску', () => {
    const result = checkFacilityLocationTask(variant(), { siteA: '71,5', siteB: '76,25' });
    expect(result).toMatchObject({ ok: true, value: { solved: true } });
  });

  it('неправильна відповідь одного з майданчиків: solved false', () => {
    const result = checkFacilityLocationTask(variant(), { siteA: '71,5', siteB: '10' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.solved).toBe(false);
    expect(result.value.parts.map((part) => part.correct)).toEqual([true, false]);
  });

  it('порожнє чи нечислове поле — помилка з посиланням на поле', () => {
    const result = checkFacilityLocationTask(variant(), { siteA: '', siteB: '76,25' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error[0]?.field).toBe('siteA');
  });
});

const REF = { source: 's', locator: 'l (LOC-01)', checkedAt: '2026-09-23' };
const TASKS: readonly CalculationTask[] = [
  { id: 'factor-rating', method: 'factor-rating', title: 'Метод вагових коефіцієнтів', formula: 'f', ref: REF },
  { id: 'center-of-gravity', method: 'center-of-gravity', title: 'Метод центру ваги', formula: 'f', ref: REF },
  { id: 'line-balance', method: 'line-balance', title: 'Балансування лінії', formula: 'f', ref: REF },
  { id: 'time-standard', method: 'time-standard', title: 'Нормування праці', formula: 'f', ref: REF },
];

describe('toFacilityLocationTaskChoices', () => {
  it('бере лише задачі з відомими цьому рушію методами, ігноруючи чужі', () => {
    expect(toFacilityLocationTaskChoices(TASKS)).toEqual([{ method: 'factor-rating' }, { method: 'center-of-gravity' }]);
  });

  it('порожній результат, якщо жодна задача не належить цьому рушію', () => {
    expect(toFacilityLocationTaskChoices(TASKS.filter((task) => task.method === 'time-standard'))).toEqual([]);
  });
});

describe('findCalculationTask', () => {
  it('знаходить задачу за методом', () => {
    expect(findCalculationTask(TASKS, { method: 'center-of-gravity' })?.id).toBe('center-of-gravity');
  });

  it('повертає undefined, якщо в пулі немає такого методу', () => {
    expect(findCalculationTask([], { method: 'factor-rating' })).toBeUndefined();
  });
});
