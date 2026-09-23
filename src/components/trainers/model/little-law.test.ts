import { describe, expect, it } from 'vitest';
import type { LittleLawVariant } from '../../../engines/little-law';
import type { CalculationTask } from '../../../content/schemas/practical';
import { checkLittleLawTask, findCalculationTask, toLittleLawTaskChoices } from './little-law';

function variant(overrides: Partial<LittleLawVariant> = {}): LittleLawVariant {
  return {
    variantId: 'v1',
    method: 'little-law',
    unknown: 'time',
    prompt: 'Тест',
    given: [],
    answers: [{ id: 'time', label: 'Середній час перебування в системі', unit: 'доби', expected: 2.5, tolerance: 0.01 }],
    solution: ['крок 1'],
    ...overrides,
  };
}

describe('checkLittleLawTask', () => {
  it('вирішено правильно в межах допуску', () => {
    const result = checkLittleLawTask(variant(), { time: '2,5' });
    expect(result).toMatchObject({ ok: true, value: { solved: true } });
  });

  it('неправильна відповідь: solved false, показано очікуване значення', () => {
    const result = checkLittleLawTask(variant(), { time: '3' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.solved).toBe(false);
    expect(result.value.parts[0]).toMatchObject({ correct: false });
  });

  it('порожнє чи нечислове поле — помилка з посиланням на поле', () => {
    const result = checkLittleLawTask(variant(), { time: '' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error[0]?.field).toBe('time');
  });
});

const TASKS: readonly CalculationTask[] = [
  { id: 'little-law-time', method: 'little-law', resource: 'time', title: 'W', formula: 'f', ref: { source: 's', locator: 'l (CAP-04)', checkedAt: '2026-09-23' } },
  { id: 'little-law-wip', method: 'little-law', resource: 'wip', title: 'L', formula: 'f', ref: { source: 's', locator: 'l (CAP-04)', checkedAt: '2026-09-23' } },
  { id: 'little-law-throughput', method: 'little-law', resource: 'throughput', title: 'λ', formula: 'f', ref: { source: 's', locator: 'l (CAP-04)', checkedAt: '2026-09-23' } },
];

describe('findCalculationTask', () => {
  it('розрізняє задачі з тим самим методом за шуканою величиною', () => {
    expect(findCalculationTask(TASKS, { method: 'little-law', unknown: 'wip' })?.id).toBe('little-law-wip');
    expect(findCalculationTask(TASKS, { method: 'little-law', unknown: 'throughput' })?.id).toBe('little-law-throughput');
  });

  it('повертає undefined, якщо в пулі немає такої шуканої величини', () => {
    const onlyTime: readonly CalculationTask[] = [TASKS[0]!];
    expect(findCalculationTask(onlyTime, { method: 'little-law', unknown: 'wip' })).toBeUndefined();
  });
});

describe('toLittleLawTaskChoices', () => {
  it('переносить method і resource з контенту в пул генератора', () => {
    expect(toLittleLawTaskChoices(TASKS)).toEqual([
      { method: 'little-law', unknown: 'time' },
      { method: 'little-law', unknown: 'wip' },
      { method: 'little-law', unknown: 'throughput' },
    ]);
  });

  it('відфільтровує задачі чужого тренажера (спільний trainer.tasks практичної p03)', () => {
    const mixed: readonly CalculationTask[] = [
      ...TASKS,
      { id: 'production-cycle', method: 'production-cycle', title: 'Цикл', formula: 'f', ref: { source: 's', locator: 'l (PC-01)', checkedAt: '2026-09-23' } },
    ];
    expect(toLittleLawTaskChoices(mixed)).toEqual([
      { method: 'little-law', unknown: 'time' },
      { method: 'little-law', unknown: 'wip' },
      { method: 'little-law', unknown: 'throughput' },
    ]);
  });

  it('відфільтровує задачу з невідомою шуканою величиною, не кидаючи помилку', () => {
    const broken: readonly CalculationTask[] = [{ ...TASKS[0]!, resource: 'unknown-thing' }];
    expect(toLittleLawTaskChoices(broken)).toEqual([]);
  });

  it('відфільтровує задачу без resource, не кидаючи помилку', () => {
    const { resource: _resource, ...withoutResource } = TASKS[0]!;
    expect(toLittleLawTaskChoices([withoutResource as CalculationTask])).toEqual([]);
  });
});
