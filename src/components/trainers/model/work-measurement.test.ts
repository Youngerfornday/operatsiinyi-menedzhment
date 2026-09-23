import { describe, expect, it } from 'vitest';
import type { WorkMeasurementVariant } from '../../../engines/work-measurement';
import type { CalculationTask } from '../../../content/schemas/practical';
import { checkWorkMeasurementTask, findCalculationTask, toWorkMeasurementTaskChoices } from './work-measurement';

function variant(overrides: Partial<WorkMeasurementVariant> = {}): WorkMeasurementVariant {
  return {
    variantId: 'v1',
    method: 'time-standard',
    prompt: 'Тест',
    given: [],
    answers: [
      { id: 'pieceTime', label: 'Штучний час', unit: 'хв', expected: 4.18, tolerance: 0.02 },
      { id: 'pieceRateTime', label: 'Штучно-калькуляційний час', unit: 'хв', expected: 4.63, tolerance: 0.02 },
      { id: 'outputRate', label: 'Норма виробітку', unit: 'шт./зміну', expected: 103, tolerance: 0 },
    ],
    solution: ['крок 1'],
    ...overrides,
  };
}

describe('checkWorkMeasurementTask', () => {
  it('вирішено правильно в межах допуску за трьома полями', () => {
    const result = checkWorkMeasurementTask(variant(), { pieceTime: '4,18', pieceRateTime: '4,63', outputRate: '103' });
    expect(result).toMatchObject({ ok: true, value: { solved: true } });
  });

  it('неправильна норма виробітку: solved false', () => {
    const result = checkWorkMeasurementTask(variant(), { pieceTime: '4,18', pieceRateTime: '4,63', outputRate: '100' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.solved).toBe(false);
    expect(result.value.parts.map((part) => part.correct)).toEqual([true, true, false]);
  });

  it('порожнє поле — помилка з посиланням на поле', () => {
    const result = checkWorkMeasurementTask(variant(), { pieceTime: '', pieceRateTime: '4,63', outputRate: '103' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error[0]?.field).toBe('pieceTime');
  });
});

const REF = { source: 's', locator: 'l (WM-04)', checkedAt: '2026-09-23' };
const TASKS: readonly CalculationTask[] = [
  { id: 'center-of-gravity', method: 'center-of-gravity', title: 'Метод центру ваги', formula: 'f', ref: REF },
  { id: 'time-standard', method: 'time-standard', title: 'Нормування праці', formula: 'f', ref: REF },
];

describe('toWorkMeasurementTaskChoices', () => {
  it('бере лише задачі з методом time-standard, ігноруючи чужі', () => {
    expect(toWorkMeasurementTaskChoices(TASKS)).toEqual([{ method: 'time-standard' }]);
  });
});

describe('findCalculationTask', () => {
  it('знаходить задачу за методом', () => {
    expect(findCalculationTask(TASKS, { method: 'time-standard' })?.id).toBe('time-standard');
  });

  it('повертає undefined, якщо в пулі немає такого методу', () => {
    expect(findCalculationTask([], { method: 'time-standard' })).toBeUndefined();
  });
});
