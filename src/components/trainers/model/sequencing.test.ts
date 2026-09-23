import { describe, expect, it } from 'vitest';
import type { SequencingVariant } from '../../../engines/sequencing';
import type { CalculationTask } from '../../../content/schemas/practical';
import { checkSequencingTask, EMPTY_SEQUENCING_ANSWER, findCalculationTask, sequencePositionIds, toSequencingTaskChoices, type SequencingAnswer } from './sequencing';

function variant(overrides: Partial<SequencingVariant> = {}): SequencingVariant {
  return {
    variantId: 'v1',
    method: 'spt',
    prompt: 'Тест',
    jobs: [
      { id: 'a', label: 'Робота A', processingTime: 4, dueDate: 10 },
      { id: 'b', label: 'Робота B', processingTime: 2, dueDate: 8 },
      { id: 'c', label: 'Робота C', processingTime: 6, dueDate: 20 },
    ],
    expectedOrder: ['b', 'a', 'c'],
    answers: [
      { id: 'avg-flow', label: 'Середній час проходження', unit: 'дн.', expected: 5, tolerance: 0.15 },
      { id: 'avg-lateness', label: 'Середнє запізнення', unit: 'дн.', expected: 2, tolerance: 0.15 },
    ],
    solution: ['крок 1'],
    ...overrides,
  };
}

function answerWithOrder(order: readonly string[], avgFlow = '5', avgLateness = '2'): SequencingAnswer {
  const orderMap = Object.fromEntries(order.map((id, index) => [`position-${index}`, id]));
  return { order: orderMap, avgFlow, avgLateness };
}

describe('checkSequencingTask', () => {
  it('правильний порядок і правильні числа — solved true', () => {
    const result = checkSequencingTask(variant(), answerWithOrder(['b', 'a', 'c']));
    expect(result).toMatchObject({ ok: true, value: { solved: true } });
  });

  it('усі позиції заповнені, але порядок неправильний — solved false, частина «order» некоректна', () => {
    const result = checkSequencingTask(variant(), answerWithOrder(['a', 'b', 'c']));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.solved).toBe(false);
    const orderPart = result.value.parts.find((part) => part.id === 'order');
    expect(orderPart).toMatchObject({ correct: false });
  });

  it('порядок правильний, але одне число поза допуском — solved false', () => {
    const result = checkSequencingTask(variant(), answerWithOrder(['b', 'a', 'c'], '5', '10'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.solved).toBe(false);
    const latenessPart = result.value.parts.find((part) => part.id === 'avg-lateness');
    expect(latenessPart).toMatchObject({ correct: false });
  });

  it('відсутні позиції черги — Result err із field відповідних позицій', () => {
    const answer: SequencingAnswer = { order: { 'position-0': 'b' }, avgFlow: '5', avgLateness: '2' };
    const result = checkSequencingTask(variant(), answer);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.map((issue) => issue.field)).toEqual(['position-1', 'position-2']);
  });

  it('порожня відповідь (EMPTY_SEQUENCING_ANSWER) — усі позиції відсутні', () => {
    const result = checkSequencingTask(variant(), EMPTY_SEQUENCING_ANSWER);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toHaveLength(3);
  });
});

describe('sequencePositionIds', () => {
  it('будує id позицій у порядку 0..n-1', () => {
    expect(sequencePositionIds(3)).toEqual(['position-0', 'position-1', 'position-2']);
    expect(sequencePositionIds(0)).toEqual([]);
  });
});

const TASKS: readonly CalculationTask[] = [
  { id: 'spt', method: 'spt', title: 'SPT', formula: 'f', ref: { source: 's', locator: 'l (SCH-01)', checkedAt: '2026-09-23' } },
  { id: 'edd', method: 'edd', title: 'EDD', formula: 'f', ref: { source: 's', locator: 'l (SCH-02)', checkedAt: '2026-09-23' } },
  // задачі сусідніх тренажерів практичної (EOQ, MRP) — той самий спільний список, isSequencingMethod має їх ігнорувати
  { id: 'eoq', method: 'eoq', title: 'EOQ', formula: 'f', ref: { source: 's', locator: 'l (EOQ-01)', checkedAt: '2026-09-23' } },
];

describe('toSequencingTaskChoices', () => {
  it('переносить method з контенту в пул генератора', () => {
    expect(toSequencingTaskChoices(TASKS)).toEqual([{ method: 'spt' }, { method: 'edd' }]);
  });

  it('фільтрує задачі сусідніх тренажерів практичної (включно з fcfs), не кидаючи помилку', () => {
    const withFcfs: readonly CalculationTask[] = [...TASKS, { ...TASKS[0]!, id: 'fcfs', method: 'fcfs' }];
    expect(toSequencingTaskChoices(withFcfs)).toEqual([{ method: 'spt' }, { method: 'edd' }]);
  });
});

describe('findCalculationTask', () => {
  it('знаходить задачу за методом', () => {
    expect(findCalculationTask(TASKS, 'edd')?.id).toBe('edd');
  });

  it('повертає undefined, якщо в пулі немає такого методу', () => {
    expect(findCalculationTask(TASKS, 'fcfs')).toBeUndefined();
  });
});
