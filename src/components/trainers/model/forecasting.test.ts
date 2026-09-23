import { describe, expect, it } from 'vitest';
import type { ForecastingVariant } from '../../../engines/forecasting';
import type { CalculationTask } from '../../../content/schemas/practical';
import { checkForecastingTask, findForecastingTask, FORECASTING_METHODS, toForecastingTaskChoices } from './forecasting';

function variant(overrides: Partial<ForecastingVariant> = {}): ForecastingVariant {
  return {
    variantId: 'v1',
    method: 'forecast-moving-average',
    prompt: 'Тест',
    given: [],
    answers: [{ id: 'forecast', label: 'Прогноз', unit: 'од./період', expected: 120, tolerance: 0.05 }],
    solution: ['крок 1'],
    ...overrides,
  };
}

describe('checkForecastingTask', () => {
  it('вирішено правильно в межах допуску', () => {
    const result = checkForecastingTask(variant(), { forecast: '120' });
    expect(result).toMatchObject({ ok: true, value: { solved: true } });
  });

  it('неправильна відповідь: solved false, показано очікуване значення', () => {
    const result = checkForecastingTask(variant(), { forecast: '100' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.solved).toBe(false);
    expect(result.value.parts[0]).toMatchObject({ correct: false });
  });

  it('порожнє чи нечислове поле — помилка з посиланням на поле', () => {
    const result = checkForecastingTask(variant(), { forecast: '' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error[0]?.field).toBe('forecast');
  });

  it('перевіряє кілька полів варіанта одночасно (MAD і допоміжне поле)', () => {
    const twoFields = variant({
      answers: [
        { id: 'a', label: 'Поле A', unit: 'од.', expected: 18.6, tolerance: 0.05 },
        { id: 'b', label: 'Поле B', unit: 'од.', expected: 10, tolerance: 0.05 },
      ],
    });
    const result = checkForecastingTask(twoFields, { a: '18,6', b: '5' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.solved).toBe(false);
    expect(result.value.parts.map((part) => part.correct)).toEqual([true, false]);
  });
});

const REF = { source: 's', locator: 'l (FC-01)', checkedAt: '2026-09-23' };
const TASKS: readonly CalculationTask[] = [
  { id: 'moving-average', method: 'forecast-moving-average', title: 'Проста ковзна середня', formula: 'f', ref: REF },
  { id: 'mad', method: 'forecast-mad', title: 'MAD', formula: 'f', ref: REF },
  { id: 'chase-level', method: 'aggregate-plan-costs', title: 'Агрегатний план', formula: 'f', ref: REF },
];

describe('findForecastingTask', () => {
  it('знаходить задачу контенту за методом', () => {
    expect(findForecastingTask(TASKS, { method: 'forecast-mad' })?.id).toBe('mad');
  });

  it('повертає undefined, якщо в пулі немає такого методу', () => {
    expect(findForecastingTask(TASKS, { method: 'forecast-mse' })).toBeUndefined();
  });
});

describe('toForecastingTaskChoices', () => {
  it('переносить лише методи рушія прогнозування з пулу практичної', () => {
    expect(toForecastingTaskChoices(TASKS)).toEqual([{ method: 'forecast-moving-average' }, { method: 'forecast-mad' }]);
  });

  it('тихо пропускає метод, що належить іншому тренажеру практичної (агрегатне планування)', () => {
    expect(toForecastingTaskChoices(TASKS).some((choice) => (choice.method as string) === 'aggregate-plan-costs')).toBe(false);
  });

  it('перелік відомих методів рушія відповідає ForecastingMethod', () => {
    expect(FORECASTING_METHODS).toEqual(['forecast-moving-average', 'forecast-weighted-moving-average', 'forecast-exponential-smoothing', 'forecast-mad', 'forecast-mse', 'forecast-mape']);
  });
});
