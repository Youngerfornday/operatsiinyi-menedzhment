import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '../shared/random';
import { computeCpm, createNetwork } from './network';

describe('createNetwork', () => {
  it('той самий seed дає ту саму мережу', () => {
    const first = createNetwork(createSeededRandom('net:1'));
    const second = createNetwork(createSeededRandom('net:1'));

    expect(second).toEqual(first);
  });

  it('має рівно один старт (без попередників) і один фініш (без наступників)', () => {
    const network = createNetwork(createSeededRandom('net:structure'));
    const ids = new Set(network.map((activity) => activity.id));
    const successorsOf = (id: string) => network.filter((activity) => activity.predecessors.includes(id));

    const starts = network.filter((activity) => activity.predecessors.length === 0);
    const ends = network.filter((activity) => successorsOf(activity.id).length === 0);
    expect(starts).toHaveLength(1);
    expect(ends).toHaveLength(1);
    for (const activity of network) {
      for (const predecessor of activity.predecessors) expect(ids.has(predecessor)).toBe(true);
    }
  });
});

describe('computeCpm', () => {
  it('дає додатну тривалість проєкту й хоча б одну критичну роботу на широкому діапазоні seed', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const network = createNetwork(createSeededRandom(`net:${seed}`));

      const { results, projectDuration } = computeCpm(network);

      expect(projectDuration).toBeGreaterThan(0);
      expect(results.some((result) => result.critical)).toBe(true);
      for (const result of results) expect(result.slack).toBeGreaterThanOrEqual(0);
    }
  });

  it('критичний шлях від старту до фінішу дорівнює тривалості проєкту', () => {
    const network = createNetwork(createSeededRandom('net:critical-path'));

    const { results, projectDuration } = computeCpm(network);
    const critical = results.filter((result) => result.critical);
    const lastCritical = critical.reduce((max, result) => Math.max(max, result.earlyFinish), 0);

    expect(lastCritical).toBe(projectDuration);
  });
});
