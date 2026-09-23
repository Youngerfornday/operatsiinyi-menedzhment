import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '../shared/random';
import { littleLawThroughput, littleLawTime, littleLawWip } from './calculations';
import { createLittleLawVariant, type LittleLawTaskChoice } from './generator';
import type { LittleLawUnknown } from './types';

const ALL_UNKNOWNS: readonly LittleLawUnknown[] = ['wip', 'throughput', 'time'];
const ALL_TASKS: readonly LittleLawTaskChoice[] = ALL_UNKNOWNS.map((unknown) => ({ method: 'little-law', unknown }));

function unwrap<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false }): T {
  if (!result.ok) throw new Error('unexpected error result in test fixture');
  return result.value;
}

function numberFrom(value: string): number {
  return Number(value.replace(/[^\d.,]/g, '').replace(',', '.'));
}

describe('createLittleLawVariant', () => {
  it('той самий seed дає той самий варіант', () => {
    const first = createLittleLawVariant(createSeededRandom('p03:1'), ALL_TASKS);
    const second = createLittleLawVariant(createSeededRandom('p03:1'), ALL_TASKS);
    expect(second).toEqual(first);
  });

  it('різні seed дають різні варіанти', () => {
    const first = createLittleLawVariant(createSeededRandom('p03:1'), ALL_TASKS);
    const second = createLittleLawVariant(createSeededRandom('p03:2'), ALL_TASKS);
    expect(second.variantId).not.toEqual(first.variantId);
  });

  it('обирає лише невідому величину з переданого пулу', () => {
    const only: readonly LittleLawTaskChoice[] = [{ method: 'little-law', unknown: 'wip' }];
    for (let seed = 0; seed < 20; seed += 1) {
      const variant = createLittleLawVariant(createSeededRandom(`only:${seed}`), only);
      expect(variant.unknown).toBe('wip');
    }
  });

  it('кидає помилку на порожній пул задач', () => {
    expect(() => createLittleLawVariant(createSeededRandom('x'), [])).toThrow();
  });

  it('unknown = time: очікуване значення справді дає W = L / λ', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const variant = createLittleLawVariant(createSeededRandom(`time:${seed}`), [{ method: 'little-law', unknown: 'time' }]);
      const wip = numberFrom(variant.given[0]!.value);
      const throughput = numberFrom(variant.given[1]!.value);
      expect(variant.answers[0]!.expected).toBeCloseTo(unwrap(littleLawTime(wip, throughput)), 5);
    }
  });

  it('unknown = wip: очікуване значення справді дає L = λ · W', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const variant = createLittleLawVariant(createSeededRandom(`wip:${seed}`), [{ method: 'little-law', unknown: 'wip' }]);
      const throughput = numberFrom(variant.given[0]!.value);
      const time = numberFrom(variant.given[1]!.value);
      expect(variant.answers[0]!.expected).toBeCloseTo(unwrap(littleLawWip(throughput, time)), 5);
      expect(Number.isInteger(variant.answers[0]!.expected)).toBe(true);
    }
  });

  it('unknown = throughput: очікуване значення справді дає λ = L / W', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const variant = createLittleLawVariant(createSeededRandom(`rate:${seed}`), [{ method: 'little-law', unknown: 'throughput' }]);
      const wip = numberFrom(variant.given[0]!.value);
      const time = numberFrom(variant.given[1]!.value);
      expect(variant.answers[0]!.expected).toBeCloseTo(unwrap(littleLawThroughput(wip, time)), 5);
    }
  });

  it('дані завжди невід’ємні й генератор не кидає винятків для жодного unknown', () => {
    for (const unknown of ALL_UNKNOWNS) {
      for (let seed = 0; seed < 15; seed += 1) {
        expect(() => createLittleLawVariant(createSeededRandom(`${unknown}:${seed}`), [{ method: 'little-law', unknown }])).not.toThrow();
      }
    }
  });
});
