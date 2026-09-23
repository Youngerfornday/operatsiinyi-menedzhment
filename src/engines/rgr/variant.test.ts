import { describe, expect, it } from 'vitest';
import { computeCpm } from './network';
import { createRgrVariant, createRgrVariantForDigits } from './variant';

function assertSolvable(variant: ReturnType<typeof createRgrVariantForDigits>): void {
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

/** JSON усіх чотирьох етапів — для порівняння самих даних варіанта, а не лише ярлика. */
function stageDataPayload(variant: ReturnType<typeof createRgrVariantForDigits>): string {
  const { stage1, stage2, stage3, stage4 } = variant;
  return JSON.stringify({ stage1, stage2, stage3, stage4 });
}

describe('createRgrVariantForDigits', () => {
  it('той самий номер дає той самий варіант (детермінізм)', () => {
    const first = createRgrVariantForDigits('20401267');
    const second = createRgrVariantForDigits('20401267');

    expect(second).toEqual(first);
  });

  it('різні номери дають різні варіанти', () => {
    const first = createRgrVariantForDigits('20401267');
    const second = createRgrVariantForDigits('20401268');

    expect(second).not.toEqual(first);
  });

  it('номери з однаковими двома останніми цифрами дають різні варіанти (весь номер визначає дані)', () => {
    const first = createRgrVariantForDigits('1112345');
    const second = createRgrVariantForDigits('9998745');

    expect(first).not.toEqual(second);
  });

  it('ведучі нулі не впливають на дані варіанта', () => {
    const withLeadingZeros = createRgrVariantForDigits('0020401267');
    const withoutLeadingZeros = createRgrVariantForDigits('20401267');

    expect(withLeadingZeros).toEqual(withoutLeadingZeros);
  });
});

describe('createRgrVariant', () => {
  it('номер залікової книжки → Result з варіантом, детермінованим за УСІМ номером', () => {
    const result = createRgrVariant('20401267');

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual(createRgrVariantForDigits('20401267'));
  });

  it('розбивка пробілами/дефісами не змінює отриманий варіант', () => {
    const withSeparators = createRgrVariant('20-40 1267');
    const withoutSeparators = createRgrVariant('20401267');

    expect(withSeparators).toEqual(withoutSeparators);
  });

  it('некоректний номер — Result з помилкою, варіант не рахується', () => {
    const result = createRgrVariant('абвг');

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

  it('1000 номерів з однаковими двома останніми цифрами дають переважно різні дані варіанта (раніше — завжди однакові)', () => {
    const variants = Array.from({ length: 1000 }, (_, index) => createRgrVariant(`${1_000_000 + index * 41}67`));
    const distinctPayloads = new Set(variants.map((result) => (result.ok ? stageDataPayload(result.value) : null)));

    expect(distinctPayloads.size).toBeGreaterThan(950);
  });
});
