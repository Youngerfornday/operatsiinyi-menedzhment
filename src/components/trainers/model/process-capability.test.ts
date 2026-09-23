import { describe, expect, it } from 'vitest';
import type { ProcessCapabilityVariant } from '../../../engines/process-capability';
import type { CalculationTask } from '../../../content/schemas/practical';
import { checkProcessCapabilityTask, findProcessCapabilityTask, toProcessCapabilityTaskChoices } from './process-capability';

function task(overrides: Partial<CalculationTask> = {}): CalculationTask {
  return {
    id: 'process-capability',
    method: 'process-capability',
    title: 'Придатність процесу',
    formula: 'Cp = (USL − LSL) / (6σ)',
    ref: { source: 'Heizer J., Render B., Munson C. Operations Management, 2016', locator: 'Supplement 6 (QC-04)', checkedAt: '2026-09-23' },
    ...overrides,
  };
}

function variant(overrides: Partial<ProcessCapabilityVariant> = {}): ProcessCapabilityVariant {
  return {
    variantId: 'v1',
    method: 'process-capability',
    prompt: 'Тест',
    given: [],
    answers: [
      { id: 'cp', label: 'Cp', unit: '', expected: 1.39, tolerance: 0.02 },
      { id: 'cpk', label: 'Cpk', unit: '', expected: 0.69, tolerance: 0.02 },
    ],
    solution: ['крок 1'],
    ...overrides,
  };
}

describe('toProcessCapabilityTaskChoices', () => {
  it('бере лише задачі з методом process-capability, ігноруючи сусідні тренажери', () => {
    const tasks = [task({ id: 'a', method: 'process-capability' }), task({ id: 'b', method: 'cpm-critical-path' })];
    expect(toProcessCapabilityTaskChoices(tasks)).toEqual([{ method: 'process-capability' }]);
  });
});

describe('checkProcessCapabilityTask', () => {
  it('вирішено правильно в межах допуску', () => {
    const result = checkProcessCapabilityTask(variant(), { cp: '1,39', cpk: '0,69' });
    expect(result).toMatchObject({ ok: true, value: { solved: true } });
  });

  it('неправильний Cpk — solved false', () => {
    const result = checkProcessCapabilityTask(variant(), { cp: '1,39', cpk: '1,39' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.solved).toBe(false);
  });
});

describe('findProcessCapabilityTask', () => {
  it('знаходить задачу контенту за методом варіанта', () => {
    expect(findProcessCapabilityTask([task()], variant())?.id).toBe('process-capability');
  });
});
