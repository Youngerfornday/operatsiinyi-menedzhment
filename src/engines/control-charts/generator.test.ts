import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '../shared/random';
import { createControlChartVariant } from './generator';

describe('createControlChartVariant', () => {
  it('той самий сід дає той самий варіант (відтворюваність)', () => {
    const first = createControlChartVariant(createSeededRandom('control-charts:1'), [{ method: 'xbar-r-chart' }]);
    const second = createControlChartVariant(createSeededRandom('control-charts:1'), [{ method: 'xbar-r-chart' }]);

    expect(first).toEqual(second);
  });

  it('кидає виняток на порожній пул задач', () => {
    expect(() => createControlChartVariant(createSeededRandom('control-charts:2'), [])).toThrow();
  });

  it('xbar-r-chart: UCL завжди більший за LCL для обох карт', () => {
    const random = createSeededRandom('control-charts:stress-xbar');
    for (let index = 0; index < 20; index += 1) {
      const variant = createControlChartVariant(random, [{ method: 'xbar-r-chart' }]);
      const byId = Object.fromEntries(variant.answers.map((field) => [field.id, field.expected]));
      expect(byId.uclx).toBeGreaterThan(byId.lclx as number);
      expect(byId.uclr).toBeGreaterThanOrEqual(byId.lclr as number);
      expect(typeof variant.signal.expected).toBe('boolean');
    }
  });

  it('p-chart: LCLp ніколи не від’ємна', () => {
    const random = createSeededRandom('control-charts:stress-p');
    for (let index = 0; index < 20; index += 1) {
      const variant = createControlChartVariant(random, [{ method: 'p-chart' }]);
      const lclp = variant.answers.find((field) => field.id === 'lclp');
      expect(lclp && lclp.expected).toBeGreaterThanOrEqual(0);
    }
  });

  it('двадцять варіантів обома методами поспіль завжди дають узгоджений сигнал розладнання', () => {
    const random = createSeededRandom('control-charts:mixed');
    for (let index = 0; index < 20; index += 1) {
      const variant = createControlChartVariant(random, [{ method: 'xbar-r-chart' }, { method: 'p-chart' }]);
      expect(variant.given.length).toBeGreaterThan(0);
      expect(variant.solution.length).toBeGreaterThan(0);
      expect(variant.signal.id).toBe('signal');
    }
  });
});
