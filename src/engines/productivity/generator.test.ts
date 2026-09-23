import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '../shared/random';
import { capacityEfficiency, capacityUsage, multifactorProductivity, partialProductivity, productivityIndex } from './calculations';
import { createProductivityVariant, type ProductivityTaskChoice } from './generator';
import type { ProductivityMethod } from './types';

const ALL_METHODS: readonly ProductivityMethod[] = [
  'partial-productivity',
  'multifactor-productivity',
  'productivity-index',
  'capacity-usage',
  'capacity-efficiency',
];
const ALL_TASKS: readonly ProductivityTaskChoice[] = ALL_METHODS.map((method) => ({ method }));

describe('createProductivityVariant', () => {
  it('той самий seed дає той самий варіант', () => {
    const first = createProductivityVariant(createSeededRandom('p01:1'), ALL_TASKS);
    const second = createProductivityVariant(createSeededRandom('p01:1'), ALL_TASKS);
    expect(second).toEqual(first);
  });

  it('різні seed дають різні варіанти', () => {
    const first = createProductivityVariant(createSeededRandom('p01:1'), ALL_TASKS);
    const second = createProductivityVariant(createSeededRandom('p01:2'), ALL_TASKS);
    expect(second.variantId).not.toEqual(first.variantId);
  });

  it('обирає лише методи з переданого пулу', () => {
    const only: readonly ProductivityTaskChoice[] = [{ method: 'capacity-usage' }];
    for (let seed = 0; seed < 20; seed += 1) {
      const variant = createProductivityVariant(createSeededRandom(`only:${seed}`), only);
      expect(variant.method).toBe('capacity-usage');
    }
  });

  it('кидає помилку на порожній пул задач', () => {
    expect(() => createProductivityVariant(createSeededRandom('x'), [])).toThrow();
  });

  it('partial-productivity: очікувані значення справді дає formula PROD-01', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const variant = createProductivityVariant(createSeededRandom(`partial:${seed}`), [{ method: 'partial-productivity', resource: 'materials' }]);
      if (variant.method !== 'partial-productivity') throw new Error('unexpected method');
      const [output1, input1] = extractGivenNumbers(variant.given.slice(0, 2)) as [number, number];
      const [output2, input2] = extractGivenNumbers(variant.given.slice(2, 4)) as [number, number];
      expect(variant.answers[0]!.expected).toBeCloseTo(unwrap(partialProductivity(output1, input1)), 9);
      expect(variant.answers[1]!.expected).toBeCloseTo(unwrap(partialProductivity(output2, input2)), 9);
    }
  });

  it('multifactor-productivity: сума статей витрат дорівнює «Разом ресурсів»', () => {
    const variant = createProductivityVariant(createSeededRandom('mf:1'), [{ method: 'multifactor-productivity' }]);
    if (variant.method !== 'multifactor-productivity') throw new Error('unexpected method');
    const total1 = Number(variant.given.find((item) => item.label === 'Разом ресурсів, квартал I')!.value.replace(/[^\d.,]/g, '').replace(',', '.'));
    const costs1 = variant.given.filter((item) => item.label.endsWith(', квартал I') && item.label !== 'Разом ресурсів, квартал I' && item.label !== 'Випуск, квартал I');
    const sum1 = costs1.reduce((sum, item) => sum + Number(item.value.replace(/[^\d.,]/g, '').replace(',', '.')), 0);
    expect(Math.round(sum1)).toBe(Math.round(total1));
    const output1 = extractGivenNumbers(variant.given.filter((item) => item.label === 'Випуск, квартал I'))[0]!;
    expect(variant.answers[0]!.expected).toBeCloseTo(unwrap(multifactorProductivity(output1, costs1.map((item) => Number(item.value.replace(/[^\d.,]/g, '').replace(',', '.'))), 1_000)), 6);
  });

  it('productivity-index: очікуване значення — PROD-03 із базовим і поточним показником', () => {
    const variant = createProductivityVariant(createSeededRandom('idx:1'), [{ method: 'productivity-index' }]);
    if (variant.method !== 'productivity-index') throw new Error('unexpected method');
    const base = extractGivenNumbers(variant.given.slice(0, 1))[0]!;
    const current = extractGivenNumbers(variant.given.slice(1, 2))[0]!;
    expect(variant.answers[0]!.expected).toBeCloseTo(unwrap(productivityIndex(current, base)), 1);
  });

  it('capacity-usage / capacity-efficiency: очікуване значення — CAP-01 / CAP-02', () => {
    const usage = createProductivityVariant(createSeededRandom('cap:1'), [{ method: 'capacity-usage' }]);
    const efficiency = createProductivityVariant(createSeededRandom('cap:2'), [{ method: 'capacity-efficiency' }]);
    if (usage.method !== 'capacity-usage' || efficiency.method !== 'capacity-efficiency') throw new Error('unexpected method');
    const [actual1, capacity1] = extractGivenNumbers(usage.given) as [number, number];
    expect(usage.answers[0]!.expected).toBeCloseTo(unwrap(capacityUsage(actual1, capacity1)), 1);
    const [actual2, capacity2] = extractGivenNumbers(efficiency.given) as [number, number];
    expect(efficiency.answers[0]!.expected).toBeCloseTo(unwrap(capacityEfficiency(actual2, capacity2)), 1);
  });
});

function extractGivenNumbers(items: readonly { readonly value: string }[]): number[] {
  return items.map((item) => Number(item.value.replace(/[^\d.,]/g, '').replace(',', '.')));
}

function unwrap<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false }): T {
  if (!result.ok) throw new Error('unexpected error result in test fixture');
  return result.value;
}
