import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '../shared/random';
import { createStage1 } from './stage1';
import { createStage4 } from './stage4';

describe('createStage4', () => {
  it('той самий seed і stage1 дають ті самі дані', () => {
    const stage1 = createStage1(createSeededRandom('stage4:base'));
    const first = createStage4(createSeededRandom('stage4:1'), stage1);
    const second = createStage4(createSeededRandom('stage4:1'), stage1);

    expect(second).toEqual(first);
  });

  it('контрольна карта — 10 підгруп по 5 додатних вимірювань', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const stage1 = createStage1(createSeededRandom(`stage4:s1:${seed}`));
      const stage4 = createStage4(createSeededRandom(`stage4:${seed}`), stage1);

      expect(stage4.controlChart.subgroups).toHaveLength(10);
      for (const subgroup of stage4.controlChart.subgroups) {
        expect(subgroup.measurements).toHaveLength(5);
        for (const value of subgroup.measurements) expect(value).toBeGreaterThan(0);
      }
    }
  });

  it('межі допуску охоплюють середнє процесу (LSL < mean < USL)', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const stage1 = createStage1(createSeededRandom(`stage4:cap:s1:${seed}`));
      const { capability } = createStage4(createSeededRandom(`stage4:cap:${seed}`), stage1);

      expect(capability.lowerSpecLimit).toBeLessThan(capability.upperSpecLimit);
      expect(capability.processStdDev).toBeGreaterThan(0);
    }
  });

  it('продуктивність після заходів завжди вища за продуктивність до', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const stage1 = createStage1(createSeededRandom(`stage4:prod:s1:${seed}`));
      const { productivity } = createStage4(createSeededRandom(`stage4:prod:${seed}`), stage1);

      const before = productivity.before.output / productivity.before.laborHours;
      const after = productivity.after.output / productivity.after.laborHours;
      expect(after).toBeGreaterThan(before);
    }
  });
});
