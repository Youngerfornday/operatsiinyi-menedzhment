import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '../shared/random';
import { createStage1 } from './stage1';

describe('createStage1', () => {
  it('той самий seed дає ті самі вихідні дані', () => {
    const first = createStage1(createSeededRandom('stage1:1'));
    const second = createStage1(createSeededRandom('stage1:1'));

    expect(second).toEqual(first);
  });

  it('дає додатні та узгоджені числові дані на широкому діапазоні seed', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const stage1 = createStage1(createSeededRandom(`stage1:${seed}`));

      expect(stage1.itemCount).toBeGreaterThanOrEqual(1);
      expect(stage1.itemCount).toBeLessThanOrEqual(3);
      expect(stage1.baselineMonthlyDemand).toBeGreaterThan(0);
      expect(stage1.typicalBatchSize).toBeGreaterThan(0);
      expect(Number.isInteger(stage1.baselineMonthlyDemand)).toBe(true);
    }
  });

  it('розділ вихідних даних містить назву дільниці й продукцію', () => {
    const stage1 = createStage1(createSeededRandom('stage1:table'));
    const section = stage1.sections[0];

    expect(section?.title).toBe('Вихідні дані варіанта');
    expect(section?.rows.some((row) => row.label === 'Дільниця' && row.value === stage1.facility.section)).toBe(true);
  });
});
