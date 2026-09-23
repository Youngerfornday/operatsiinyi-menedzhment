import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '../shared/random';
import { centerOfGravity, factorRatingScore } from './calculations';
import { createFacilityLocationVariant, type FacilityLocationTaskChoice } from './generator';
import type { FacilityLocationMethod } from './types';

const ALL_METHODS: readonly FacilityLocationMethod[] = ['factor-rating', 'center-of-gravity'];
const ALL_TASKS: readonly FacilityLocationTaskChoice[] = ALL_METHODS.map((method) => ({ method }));

function extractGivenNumbers(items: readonly { readonly value: string }[]): number[] {
  return items.map((item) => Number(item.value.replace(/[^\d.,]/g, '').replace(',', '.')));
}

function unwrap<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false }): T {
  if (!result.ok) throw new Error('unexpected error result in test fixture');
  return result.value;
}

describe('createFacilityLocationVariant', () => {
  it('той самий seed дає той самий варіант', () => {
    const first = createFacilityLocationVariant(createSeededRandom('p04:1'), ALL_TASKS);
    const second = createFacilityLocationVariant(createSeededRandom('p04:1'), ALL_TASKS);
    expect(second).toEqual(first);
  });

  it('різні seed дають різні варіанти', () => {
    const first = createFacilityLocationVariant(createSeededRandom('p04:1'), ALL_TASKS);
    const second = createFacilityLocationVariant(createSeededRandom('p04:2'), ALL_TASKS);
    expect(second.variantId).not.toEqual(first.variantId);
  });

  it('обирає лише методи з переданого пулу', () => {
    const only: readonly FacilityLocationTaskChoice[] = [{ method: 'center-of-gravity' }];
    for (let seed = 0; seed < 20; seed += 1) {
      const variant = createFacilityLocationVariant(createSeededRandom(`only:${seed}`), only);
      expect(variant.method).toBe('center-of-gravity');
    }
  });

  it('кидає помилку на порожній пул задач', () => {
    expect(() => createFacilityLocationVariant(createSeededRandom('x'), [])).toThrow();
  });

  it('factor-rating: сумарний бал кожного майданчика узгоджений із LOC-01', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const variant = createFacilityLocationVariant(createSeededRandom(`fr:${seed}`), [{ method: 'factor-rating' }]);
      if (variant.method !== 'factor-rating') throw new Error('unexpected method');
      const weights = extractGivenNumbers(variant.given.slice(0, 3)).map((value) => Number(value.toFixed(2)));
      const scoresA = extractGivenNumbers(variant.given.slice(3, 6));
      const scoresB = extractGivenNumbers(variant.given.slice(6, 9));
      expect(variant.answers[0]!.expected).toBeCloseTo(unwrap(factorRatingScore(weights, scoresA)), 6);
      expect(variant.answers[1]!.expected).toBeCloseTo(unwrap(factorRatingScore(weights, scoresB)), 6);
    }
  });

  it('center-of-gravity: координати узгоджені з LOC-02', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const variant = createFacilityLocationVariant(createSeededRandom(`cog:${seed}`), [{ method: 'center-of-gravity' }]);
      if (variant.method !== 'center-of-gravity') throw new Error('unexpected method');
      const numbers = extractGivenNumbers(variant.given);
      const points = [0, 1, 2].map((index) => ({ x: numbers[index * 3]!, y: numbers[index * 3 + 1]!, weight: numbers[index * 3 + 2]! }));
      const expected = unwrap(centerOfGravity(points));
      expect(variant.answers[0]!.expected).toBeCloseTo(expected.x, 6);
      expect(variant.answers[1]!.expected).toBeCloseTo(expected.y, 6);
    }
  });
});
