import { describe, expect, it } from 'vitest';
import {
  capacityEfficiency,
  capacityUsage,
  multifactorProductivity,
  multifactorProductivityChange,
  partialProductivity,
  productivityIndex,
} from './calculations';

/**
 * Фікстури — вивірені числа з content/modules/m1/t01/lecture.mdx:
 * - таблиця «Продуктивність операційної системи» (PROD-01, PROD-02): цех за квартал I і II;
 * - WorkedExample code="CAP-01" (використання й ефективність потужності цеху в кварталі I).
 * PROD-03 у лекції окремим прикладом не подано, тому фікстура для productivityIndex — той самий
 * вивірений результат PROD-02 (6,00 і 5,75), а не нове неперевірене число.
 */
describe('partialProductivity (PROD-01)', () => {
  it('за працею: 2,5 у кварталі I, 3,0 у кварталі II', () => {
    expect(partialProductivity(12_000, 4_800)).toEqual({ ok: true, value: 2.5 });
    expect(partialProductivity(13_800, 4_600)).toEqual({ ok: true, value: 3 });
  });

  it('за матеріалами: 1,5 без змін між кварталами', () => {
    expect(partialProductivity(12_000, 8_000)).toEqual({ ok: true, value: 1.5 });
    expect(partialProductivity(13_800, 9_200)).toEqual({ ok: true, value: 1.5 });
  });

  it('за енергією: падіння з 0,3 до 0,2', () => {
    expect(partialProductivity(12_000, 40_000)).toEqual({ ok: true, value: 0.3 });
    expect(partialProductivity(13_800, 69_000)).toEqual({ ok: true, value: 0.2 });
  });

  it('відхиляє від’ємний випуск і невалідний знаменник', () => {
    expect(partialProductivity(-1, 10)).toMatchObject({ ok: false, error: { code: 'negative-value' } });
    expect(partialProductivity(10, 0)).toMatchObject({ ok: false, error: { code: 'non-positive-denominator' } });
    expect(partialProductivity(10, -5)).toMatchObject({ ok: false, error: { code: 'non-positive-denominator' } });
  });
});

describe('multifactorProductivity (PROD-02)', () => {
  it('6,00 виробу на 1 000 грн у кварталі I, 5,75 у кварталі II', () => {
    const q1 = multifactorProductivity(12_000, [720_000, 720_000, 160_000, 400_000], 1_000);
    const q2 = multifactorProductivity(13_800, [690_000, 828_000, 276_000, 606_000], 1_000);
    expect(q1.ok && q1.value).toBeCloseTo(6, 9);
    expect(q2.ok && q2.value).toBeCloseTo(5.75, 9);
  });

  it('за замовчуванням рахує на одиницю витрат (perCostUnit = 1)', () => {
    const result = multifactorProductivity(12_000, [2_000_000]);
    expect(result).toEqual({ ok: true, value: 0.006 });
  });

  it('відхиляє порожній список ресурсів і від’ємну статтю витрат', () => {
    expect(multifactorProductivity(100, [])).toMatchObject({ ok: false, error: { code: 'empty-resources' } });
    expect(multifactorProductivity(100, [10, -5])).toMatchObject({ ok: false, error: { code: 'negative-value' } });
  });

  it('відхиляє нульову суму витрат', () => {
    expect(multifactorProductivity(100, [0, 0])).toMatchObject({ ok: false, error: { code: 'non-positive-denominator' } });
  });

  it('відхиляє від’ємний випуск і невалідну одиницю витрат', () => {
    expect(multifactorProductivity(-1, [10])).toMatchObject({ ok: false, error: { code: 'negative-value' } });
    expect(multifactorProductivity(100, [10], 0)).toMatchObject({ ok: false, error: { code: 'non-positive-denominator' } });
  });
});

describe('productivityIndex (PROD-03)', () => {
  it('95,83 % — падіння багатофакторної продуктивності між кварталами лекції', () => {
    const result = productivityIndex(5.75, 6);
    expect(result.ok && result.value).toBeCloseTo(95.83, 2);
  });

  it('100 % за однакової продуктивності обох періодів', () => {
    expect(productivityIndex(1.5, 1.5)).toEqual({ ok: true, value: 100 });
  });

  it('відхиляє невалідну базову продуктивність і від’ємну поточну', () => {
    expect(productivityIndex(1, 0)).toMatchObject({ ok: false, error: { code: 'non-positive-denominator' } });
    expect(productivityIndex(-1, 1)).toMatchObject({ ok: false, error: { code: 'negative-value' } });
  });
});

describe('multifactorProductivityChange', () => {
  const base = { output: 12_000, resourceCosts: [720_000, 720_000, 160_000, 400_000] };
  const current = { output: 13_800, resourceCosts: [690_000, 828_000, 276_000, 606_000] };

  it('рахує обидві продуктивності й індекс зміни за один виклик', () => {
    const result = multifactorProductivityChange(current, base, 1_000);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.baseProductivity).toBeCloseTo(6, 9);
    expect(result.value.currentProductivity).toBeCloseTo(5.75, 9);
    expect(result.value.index).toBeCloseTo(95.83, 2);
  });

  it('period-mismatch, якщо кількість видів ресурсів різна', () => {
    const mismatched = { output: 100, resourceCosts: [10, 20] };
    expect(multifactorProductivityChange(mismatched, base, 1_000)).toMatchObject({ ok: false, error: { code: 'period-mismatch' } });
  });

  it('поширює помилку базового чи поточного періоду, не рахуючи індекс на невалідних даних', () => {
    const zeroCosts = { output: 100, resourceCosts: [0, 0] };
    const validPeriod = { output: 100, resourceCosts: [10, 20] };
    expect(multifactorProductivityChange(validPeriod, zeroCosts)).toMatchObject({ ok: false, error: { code: 'non-positive-denominator' } });
    expect(multifactorProductivityChange(zeroCosts, validPeriod)).toMatchObject({ ok: false, error: { code: 'non-positive-denominator' } });
  });

  it('поширює помилку PROD-03, якщо обидві продуктивності пораховано, але базова — нульова', () => {
    const zeroOutput = { output: 0, resourceCosts: [10, 20] };
    const validPeriod = { output: 100, resourceCosts: [10, 20] };
    expect(multifactorProductivityChange(validPeriod, zeroOutput)).toMatchObject({ ok: false, error: { code: 'non-positive-denominator' } });
  });
});

describe('capacityUsage / capacityEfficiency (CAP-01, CAP-02)', () => {
  it('80,0 % використання проєктної потужності', () => {
    const result = capacityUsage(12_000, 15_000);
    expect(result.ok && result.value).toBeCloseTo(80, 9);
  });

  it('92,3 % ефективності використання ефективної потужності', () => {
    const result = capacityEfficiency(12_000, 13_000);
    expect(result.ok && result.value).toBeCloseTo(92.3, 1);
  });

  it('відхиляє нульову й від’ємну потужність та від’ємний випуск', () => {
    expect(capacityUsage(10, 0)).toMatchObject({ ok: false, error: { code: 'non-positive-denominator' } });
    expect(capacityUsage(10, -5)).toMatchObject({ ok: false, error: { code: 'non-positive-denominator' } });
    expect(capacityEfficiency(-1, 10)).toMatchObject({ ok: false, error: { code: 'negative-value' } });
  });
});
