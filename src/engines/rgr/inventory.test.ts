import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '../shared/random';
import { createInventory } from './inventory';

describe('createInventory', () => {
  it('той самий seed дає ті самі дані запасів', () => {
    const first = createInventory(createSeededRandom('inv:1'), 500);
    const second = createInventory(createSeededRandom('inv:1'), 500);

    expect(second).toEqual(first);
  });

  it('усі величини для EOQ/ROP/SS додатні, а рівень обслуговування — з таблиці z', () => {
    const knownServiceLevels = [90, 95, 97, 99];
    for (let seed = 0; seed < 200; seed += 1) {
      const inventory = createInventory(createSeededRandom(`inv:${seed}`), 400 + seed);

      expect(inventory.annualDemand).toBeGreaterThan(0);
      expect(inventory.orderingCost).toBeGreaterThan(0);
      expect(inventory.holdingCostPerUnitPerYear).toBeGreaterThan(0);
      expect(inventory.leadTimeDays).toBeGreaterThan(0);
      expect(inventory.averageDailyDemand).toBeGreaterThan(0);
      expect(inventory.leadTimeDemandStdDev).toBeGreaterThan(0);
      expect(knownServiceLevels).toContain(inventory.serviceLevelPercent);
      expect(inventory.zValue).toBeGreaterThan(0);
    }
  });
});
