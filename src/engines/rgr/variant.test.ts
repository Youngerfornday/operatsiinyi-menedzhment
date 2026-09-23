import { describe, expect, it } from 'vitest';
import { computeCpm } from './network';
import { createRgrVariant, createRgrVariantForNumber } from './variant';

function assertSolvable(variant: ReturnType<typeof createRgrVariantForNumber>): void {
  expect(variant.stage1.baselineMonthlyDemand).toBeGreaterThan(0);
  expect(variant.stage2.demandHistory).toHaveLength(9);
  expect(variant.stage2.weightedWeights.reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1, 10);
  expect(variant.stage3.inventory.annualDemand).toBeGreaterThan(0);
  expect(variant.stage3.masterScheduleWeeks.every((value) => value > 0)).toBe(true);
  const { projectDuration } = computeCpm(variant.stage3.network);
  expect(projectDuration).toBeGreaterThan(0);
  expect(variant.stage4.controlChart.subgroups).toHaveLength(10);
  expect(variant.stage4.capability.lowerSpecLimit).toBeLessThan(variant.stage4.capability.upperSpecLimit);
}

describe('createRgrVariantForNumber', () => {
  it('той самий номер варіанта дає той самий варіант (детермінізм)', () => {
    const first = createRgrVariantForNumber(42);
    const second = createRgrVariantForNumber(42);

    expect(second).toEqual(first);
  });

  it('різні номери варіантів дають різні варіанти', () => {
    const first = createRgrVariantForNumber(1);
    const second = createRgrVariantForNumber(2);

    expect(second).not.toEqual(first);
  });

  it('усі 100 номерів варіантів (1..100) дають розв’язні узгоджені дані', () => {
    for (let variantNumber = 1; variantNumber <= 100; variantNumber += 1) {
      assertSolvable(createRgrVariantForNumber(variantNumber));
    }
  });
});

describe('createRgrVariant', () => {
  it('номер залікової книжки → Result з варіантом, узгодженим за останніми двома цифрами', () => {
    const result = createRgrVariant('20401267');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.variantNumber).toBe(67);
      expect(result.value).toEqual(createRgrVariantForNumber(67));
    }
  });

  it('некоректний номер — Result з помилкою, варіант не рахується', () => {
    const result = createRgrVariant('абв');

    expect(result).toEqual({ ok: false, error: { code: 'invalid-format', message: expect.any(String) } });
  });

  it('1000 довільних номерів залікової книжки завжди дають розв’язний варіант', () => {
    for (let index = 0; index < 1000; index += 1) {
      const gradebook = String(1_000_000 + index * 37).padStart(9, '0');
      const result = createRgrVariant(gradebook);

      expect(result.ok).toBe(true);
      if (result.ok) assertSolvable(result.value);
    }
  });
});
