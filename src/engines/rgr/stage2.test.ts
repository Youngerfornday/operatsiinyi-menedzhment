import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '../shared/random';
import { createStage1 } from './stage1';
import { createStage2 } from './stage2';

function stage1For(seed: string) {
  return createStage1(createSeededRandom(seed));
}

describe('createStage2', () => {
  it('той самий seed і stage1 дають ті самі дані', () => {
    const stage1 = stage1For('stage2:base');
    const first = createStage2(createSeededRandom('stage2:1'), stage1);
    const second = createStage2(createSeededRandom('stage2:1'), stage1);

    expect(second).toEqual(first);
  });

  it('історія попиту — 9 додатних періодів, агрегатний план — 6', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const stage1 = stage1For(`stage2:s1:${seed}`);
      const stage2 = createStage2(createSeededRandom(`stage2:${seed}`), stage1);

      expect(stage2.demandHistory).toHaveLength(9);
      for (const value of stage2.demandHistory) expect(value).toBeGreaterThan(0);
      expect(stage2.aggregatePlan.demandForecast).toHaveLength(6);
      for (const value of stage2.aggregatePlan.demandForecast) expect(value).toBeGreaterThan(0);
    }
  });

  it('ваги зваженої ковзної середньої точно сумуються в 1', () => {
    const stage1 = stage1For('stage2:weights');
    const stage2 = createStage2(createSeededRandom('stage2:weights'), stage1);

    const sum = stage2.weightedWeights.reduce((total, weight) => total + weight, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it('усі вартісні параметри агрегатного плану додатні', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const stage1 = stage1For(`stage2:cost:s1:${seed}`);
      const { aggregatePlan } = createStage2(createSeededRandom(`stage2:cost:${seed}`), stage1);

      expect(aggregatePlan.beginningWorkforce).toBeGreaterThan(0);
      expect(aggregatePlan.unitsPerWorkerPerMonth).toBeGreaterThan(0);
      expect(aggregatePlan.regularTimeCostPerUnit).toBeGreaterThan(0);
      expect(aggregatePlan.overtimeCostPerUnit).toBeGreaterThan(aggregatePlan.regularTimeCostPerUnit);
      expect(aggregatePlan.hiringCostPerWorker).toBeGreaterThan(0);
      expect(aggregatePlan.layoffCostPerWorker).toBeGreaterThan(0);
      expect(aggregatePlan.holdingCostPerUnitPerMonth).toBeGreaterThan(0);
      expect(aggregatePlan.shortageCostPerUnitPerMonth).toBeGreaterThan(aggregatePlan.holdingCostPerUnitPerMonth);
    }
  });

  it('розділи таблиці містять контрольну вибірку періодів 4–9', () => {
    const stage1 = stage1For('stage2:table');
    const stage2 = createStage2(createSeededRandom('stage2:table'), stage1);
    const paramsSection = stage2.sections.find((section) => section.title === 'Параметри методів прогнозування');

    expect(paramsSection?.rows.some((row) => row.value.includes('4–9'))).toBe(true);
  });
});
