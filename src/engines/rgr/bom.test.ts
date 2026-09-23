import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '../shared/random';
import { createBom, createMasterScheduleWeeks } from './bom';

describe('createBom', () => {
  it('той самий seed дає ту саму специфікацію', () => {
    const first = createBom(createSeededRandom('bom:1'));
    const second = createBom(createSeededRandom('bom:1'));

    expect(second).toEqual(first);
  });

  it('дерево має один корінь без батька, решта посилаються на існуючий вузол', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const bom = createBom(createSeededRandom(`bom:${seed}`));
      const ids = new Set(bom.map((item) => item.id));
      const roots = bom.filter((item) => item.parentId === null);

      expect(roots).toHaveLength(1);
      for (const item of bom.filter((entry) => entry.parentId !== null)) {
        expect(ids.has(item.parentId as string)).toBe(true);
        expect(item.quantityPerParent).toBeGreaterThan(0);
        expect(item.onHand).toBeGreaterThanOrEqual(0);
        expect(item.leadTimeWeeks).toBeGreaterThan(0);
      }
    }
  });
});

describe('createMasterScheduleWeeks', () => {
  it('той самий seed дає той самий тижневий план', () => {
    const first = createMasterScheduleWeeks(createSeededRandom('mps:1'), 500);
    const second = createMasterScheduleWeeks(createSeededRandom('mps:1'), 500);

    expect(second).toEqual(first);
  });

  it('дає 6 додатних тижнів на широкому діапазоні базового попиту', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const weeks = createMasterScheduleWeeks(createSeededRandom(`mps:${seed}`), 400 + seed * 10);

      expect(weeks).toHaveLength(6);
      for (const value of weeks) expect(value).toBeGreaterThan(0);
    }
  });
});
