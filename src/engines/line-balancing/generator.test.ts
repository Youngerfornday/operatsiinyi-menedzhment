import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '../shared/random';
import { assignStationsSequential, lineBalancingEfficiency, minimumStations, taktTime } from './calculations';
import { createLineBalancingVariant, type LineBalancingTaskChoice } from './generator';

const TASKS: readonly LineBalancingTaskChoice[] = [{ method: 'line-balance' }];

function extractGivenNumbers(items: readonly { readonly value: string }[]): number[] {
  return items.map((item) => Number(item.value.replace(/[^\d.,]/g, '').replace(',', '.')));
}

function unwrap<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false }): T {
  if (!result.ok) throw new Error('unexpected error result in test fixture');
  return result.value;
}

describe('createLineBalancingVariant', () => {
  it('той самий seed дає той самий варіант', () => {
    const first = createLineBalancingVariant(createSeededRandom('p04:1'), TASKS);
    const second = createLineBalancingVariant(createSeededRandom('p04:1'), TASKS);
    expect(second).toEqual(first);
  });

  it('різні seed дають різні варіанти', () => {
    const first = createLineBalancingVariant(createSeededRandom('p04:1'), TASKS);
    const second = createLineBalancingVariant(createSeededRandom('p04:2'), TASKS);
    expect(second.variantId).not.toEqual(first.variantId);
  });

  it('кидає помилку на порожній пул задач', () => {
    expect(() => createLineBalancingVariant(createSeededRandom('x'), [])).toThrow();
  });

  it('такт дорівнює доступному часу, поділеному на попит (CAP-05)', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const variant = createLineBalancingVariant(createSeededRandom(`lb:${seed}`), TASKS);
      const [availableMinutes, demand] = extractGivenNumbers(variant.given.slice(0, 2)) as [number, number];
      const expectedTakt = unwrap(taktTime(availableMinutes * 60, demand));
      expect(variant.answers[0]!.expected).toBeCloseTo(expectedTakt, 6);
      expect(Number.isInteger(expectedTakt)).toBe(true);
    }
  });

  it('Nmin, фактична кількість станцій і ефективність узгоджені з LB-01, LB-05, LB-02', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const variant = createLineBalancingVariant(createSeededRandom(`lb2:${seed}`), TASKS);
      const [, , ...opValues] = extractGivenNumbers(variant.given);
      const takt = variant.answers[0]!.expected;
      const nmin = unwrap(minimumStations(opValues, takt));
      const stations = unwrap(assignStationsSequential(opValues, takt));
      const efficiency = unwrap(lineBalancingEfficiency(opValues, stations.length, takt));
      expect(variant.answers[1]!.expected).toBe(nmin);
      expect(variant.answers[2]!.expected).toBe(stations.length);
      expect(variant.answers[3]!.expected).toBeCloseTo(efficiency, 1);
      expect(nmin).toBeLessThanOrEqual(stations.length);
    }
  });

  it('усі часи операцій менші за такт', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const variant = createLineBalancingVariant(createSeededRandom(`lb3:${seed}`), TASKS);
      const [, , ...opValues] = extractGivenNumbers(variant.given);
      const takt = variant.answers[0]!.expected;
      expect(opValues.length).toBeGreaterThanOrEqual(6);
      for (const time of opValues) expect(time).toBeLessThanOrEqual(takt);
    }
  });
});
