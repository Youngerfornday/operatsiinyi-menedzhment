import { describe, expect, it } from 'vitest';
import type { MrpVariant } from '../../../engines/mrp';
import type { CalculationTask } from '../../../content/schemas/practical';
import { checkMrpTask, mrpFormulaTasks } from './mrp';

function variant(overrides: Partial<MrpVariant> = {}): MrpVariant {
  return {
    variantId: 'v1',
    method: 'bom-explosion',
    prompt: 'Тест',
    given: [],
    answers: [{ id: 'a-net', label: 'Нетто-потреба А', unit: 'шт.', expected: 90, tolerance: 0 }],
    solution: ['крок 1'],
    ...overrides,
  };
}

describe('checkMrpTask', () => {
  it('вирішено правильно', () => {
    const result = checkMrpTask(variant(), { 'a-net': '90' });
    expect(result).toMatchObject({ ok: true, value: { solved: true } });
  });

  it('неправильна відповідь: solved false, показано очікуване значення', () => {
    const result = checkMrpTask(variant(), { 'a-net': '80' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.solved).toBe(false);
    expect(result.value.parts[0]).toMatchObject({ correct: false });
  });

  it('порожнє чи нечислове поле — помилка з посиланням на поле', () => {
    const result = checkMrpTask(variant(), { 'a-net': '' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error[0]?.field).toBe('a-net');
  });

  it('перевіряє кілька полів варіанта одночасно (усі 11 полів варіанта)', () => {
    const manyFields = variant({
      answers: [
        { id: 'a-net', label: 'Нетто-потреба А', unit: 'шт.', expected: 90, tolerance: 0 },
        { id: 'a-release', label: 'Період запуску А', unit: 'тижд.', expected: 9, tolerance: 0 },
        { id: 'b-gross', label: 'Брутто-потреба B', unit: 'шт.', expected: 180, tolerance: 0 },
      ],
    });
    const result = checkMrpTask(manyFields, { 'a-net': '90', 'a-release': '9', 'b-gross': '999' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.solved).toBe(false);
    expect(result.value.parts.map((part) => part.correct)).toEqual([true, true, false]);
  });

  it('усе вирішено правильно — solved true для кількох полів', () => {
    const manyFields = variant({
      answers: [
        { id: 'a-net', label: 'Нетто-потреба А', unit: 'шт.', expected: 90, tolerance: 0 },
        { id: 'b-net', label: 'Нетто-потреба B', unit: 'шт.', expected: 150, tolerance: 0 },
      ],
    });
    const result = checkMrpTask(manyFields, { 'a-net': '90', 'b-net': '150' });
    expect(result).toMatchObject({ ok: true, value: { solved: true } });
  });

  it('декілька порожніх полів повертають помилки для кожного з них', () => {
    const manyFields = variant({
      answers: [
        { id: 'a-net', label: 'Нетто-потреба А', unit: 'шт.', expected: 90, tolerance: 0 },
        { id: 'b-net', label: 'Нетто-потреба B', unit: 'шт.', expected: 150, tolerance: 0 },
      ],
    });
    const result = checkMrpTask(manyFields, { 'a-net': '', 'b-net': '' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.map((issue) => issue.field)).toEqual(['a-net', 'b-net']);
  });
});

const SHARED_TASKS: readonly CalculationTask[] = [
  { id: 'eoq', method: 'eoq', title: 'EOQ', formula: 'f', ref: { source: 's', locator: 'l (EOQ-01)', checkedAt: '2026-09-23' } },
  { id: 'gross-requirement', method: 'gross-requirement', title: 'Брутто-потреба', formula: 'f', ref: { source: 's', locator: 'l (MRP-01)', checkedAt: '2026-09-23' } },
  { id: 'net-requirement', method: 'net-requirement', title: 'Нетто-потреба', formula: 'f', ref: { source: 's', locator: 'l (MRP-02)', checkedAt: '2026-09-23' } },
  { id: 'lot-for-lot', method: 'lot-for-lot', title: 'Партія за партією', formula: 'f', ref: { source: 's', locator: 'l (MRP-03)', checkedAt: '2026-09-23' } },
  { id: 'spt', method: 'spt', title: 'SPT', formula: 'f', ref: { source: 's', locator: 'l (SCH-01)', checkedAt: '2026-09-23' } },
];

describe('mrpFormulaTasks', () => {
  it('лишає лише три формули MRP зі спільного списку практичної', () => {
    expect(mrpFormulaTasks(SHARED_TASKS).map((task) => task.id)).toEqual(['gross-requirement', 'net-requirement', 'lot-for-lot']);
  });

  it('порожній результат, якщо жодна задача не належить MRP', () => {
    expect(mrpFormulaTasks([SHARED_TASKS[0]!, SHARED_TASKS[4]!])).toEqual([]);
  });
});
