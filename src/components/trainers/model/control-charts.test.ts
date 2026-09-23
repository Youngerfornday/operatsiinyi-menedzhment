import { describe, expect, it } from 'vitest';
import type { ControlChartVariant } from '../../../engines/control-charts';
import type { CalculationTask } from '../../../content/schemas/practical';
import { checkControlChartTask, EMPTY_CONTROL_CHART_ANSWER, findControlChartTask, toControlChartTaskChoices } from './control-charts';

function task(overrides: Partial<CalculationTask> = {}): CalculationTask {
  return {
    id: 'xbar-r-chart',
    method: 'xbar-r-chart',
    title: 'Контрольна карта x̄-R',
    formula: 'UCLx̄ = X̿ + A2·R̄',
    ref: { source: 'Heizer J., Render B., Munson C. Operations Management, 2016', locator: 'Supplement 6 (QC-01)', checkedAt: '2026-09-23' },
    ...overrides,
  };
}

function variant(overrides: Partial<ControlChartVariant> = {}): ControlChartVariant {
  return {
    variantId: 'v1',
    method: 'xbar-r-chart',
    prompt: 'Тест',
    given: [],
    answers: [
      { id: 'uclx', label: 'UCLx̄', unit: 'мм', expected: 102.308, tolerance: 0.02 },
      { id: 'lclx', label: 'LCLx̄', unit: 'мм', expected: 97.692, tolerance: 0.02 },
    ],
    signal: { id: 'signal', label: 'Сигнал розладнання', expected: true },
    solution: ['крок 1'],
    ...overrides,
  };
}

describe('toControlChartTaskChoices', () => {
  it('бере лише методи xbar-r-chart і p-chart, ігноруючи сусідні тренажери', () => {
    const tasks = [task({ id: 'a', method: 'xbar-r-chart' }), task({ id: 'b', method: 'p-chart' }), task({ id: 'c', method: 'process-capability' })];
    expect(toControlChartTaskChoices(tasks)).toEqual([{ method: 'xbar-r-chart' }, { method: 'p-chart' }]);
  });
});

describe('EMPTY_CONTROL_CHART_ANSWER', () => {
  it('містить порожню відповідь на питання про сигнал', () => {
    expect(EMPTY_CONTROL_CHART_ANSWER['signal']).toBe('');
  });
});

describe('checkControlChartTask', () => {
  it('вирішено правильно: числові межі й сигнал «так» збігаються', () => {
    const result = checkControlChartTask(variant(), { uclx: '102,308', lclx: '97,692', signal: 'yes' });
    expect(result).toMatchObject({ ok: true, value: { solved: true } });
  });

  it('неправильний сигнал — solved false, хоча числа правильні', () => {
    const result = checkControlChartTask(variant(), { uclx: '102,308', lclx: '97,692', signal: 'no' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.solved).toBe(false);
  });

  it('не обрано сигнал — помилка з посиланням на поле signal', () => {
    const result = checkControlChartTask(variant(), { uclx: '102,308', lclx: '97,692', signal: '' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.some((issue) => issue.field === 'signal')).toBe(true);
  });
});

describe('findControlChartTask', () => {
  it('знаходить задачу контенту за методом варіанта', () => {
    const tasks = [task({ id: 'a', method: 'xbar-r-chart' }), task({ id: 'b', method: 'p-chart' })];
    expect(findControlChartTask(tasks, variant())?.id).toBe('a');
  });
});
