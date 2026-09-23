import { describe, expect, it } from 'vitest';
import type { CpmPertVariant } from '../../../engines/cpm-pert';
import type { CalculationTask } from '../../../content/schemas/practical';
import { checkCpmPertTask, findCpmPertTask, toCpmPertTaskChoices } from './cpm-pert';

function task(overrides: Partial<CalculationTask> = {}): CalculationTask {
  return {
    id: 'critical-path',
    method: 'cpm-critical-path',
    title: 'Критичний шлях',
    formula: 'ES = max(EF попередників)',
    ref: { source: 'Капінос Г.І., Бабій І.В. Операційний менеджмент, 2013', locator: 'розділ 10, п. 10.11 (PRJ-01)', checkedAt: '2026-09-23' },
    ...overrides,
  };
}

function variant(overrides: Partial<CpmPertVariant> = {}): CpmPertVariant {
  return {
    variantId: 'v1',
    method: 'cpm-critical-path',
    prompt: 'Тест',
    given: [],
    answers: [
      { id: 'duration', label: 'Тривалість проекту', unit: 'тижнів', expected: 18, tolerance: 0 },
      { id: 'float', label: 'Резерв роботи B', unit: 'тижнів', expected: 2, tolerance: 0 },
    ],
    solution: ['крок 1'],
    ...overrides,
  };
}

describe('toCpmPertTaskChoices', () => {
  it('бере лише задачі з методами рушія сітьового планування, ігноруючи сусідні тренажери', () => {
    const tasks = [task({ id: 'a', method: 'cpm-critical-path' }), task({ id: 'b', method: 'pert-probability' }), task({ id: 'c', method: 'process-capability' })];
    expect(toCpmPertTaskChoices(tasks)).toEqual([{ method: 'cpm-critical-path' }, { method: 'pert-probability' }]);
  });

  it('порожній результат, якщо немає жодної задачі цього рушія', () => {
    expect(toCpmPertTaskChoices([task({ method: 'p-chart' })])).toEqual([]);
  });
});

describe('checkCpmPertTask', () => {
  it('вирішено правильно, коли обидва поля в межах допуску', () => {
    const result = checkCpmPertTask(variant(), { duration: '18', float: '2' });
    expect(result).toMatchObject({ ok: true, value: { solved: true } });
  });

  it('неправильна тривалість проекту — solved false', () => {
    const result = checkCpmPertTask(variant(), { duration: '16', float: '2' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.solved).toBe(false);
  });

  it('порожнє поле — помилка з посиланням на конкретне поле', () => {
    const result = checkCpmPertTask(variant(), { duration: '', float: '2' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error[0]?.field).toBe('duration');
  });
});

describe('findCpmPertTask', () => {
  it('знаходить задачу контенту за методом варіанта', () => {
    const tasks = [task({ id: 'a', method: 'cpm-critical-path' }), task({ id: 'b', method: 'pert-probability' })];
    expect(findCpmPertTask(tasks, variant())?.id).toBe('a');
  });
});
