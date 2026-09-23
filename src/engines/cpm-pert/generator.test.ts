import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '../shared/random';
import { createCpmPertVariant } from './generator';
import { standardNormalCdf } from './pert';

describe('createCpmPertVariant', () => {
  it('той самий сід дає той самий варіант (відтворюваність)', () => {
    const first = createCpmPertVariant(createSeededRandom('cpm-pert:1'), [{ method: 'cpm-critical-path' }]);
    const second = createCpmPertVariant(createSeededRandom('cpm-pert:1'), [{ method: 'cpm-critical-path' }]);

    expect(first).toEqual(second);
  });

  it('cpm-critical-path: тривалість проекту невід’ємна, є повний і вільний резерв роботи B', () => {
    const variant = createCpmPertVariant(createSeededRandom('cpm-pert:2'), [{ method: 'cpm-critical-path' }]);

    expect(variant.method).toBe('cpm-critical-path');
    expect(variant.answers).toHaveLength(3);
    expect(variant.answers.map((field) => field.id).sort()).toEqual(['duration', 'float', 'freeFloat']);
    const duration = variant.answers.find((field) => field.id === 'duration');
    expect(duration && duration.expected).toBeGreaterThan(0);
  });

  it('pert-probability: очікувана тривалість і ймовірність — числа в допустимих межах', () => {
    const variant = createCpmPertVariant(createSeededRandom('cpm-pert:3'), [{ method: 'pert-probability' }]);

    const expectedField = variant.answers.find((field) => field.id === 'expected');
    const probabilityField = variant.answers.find((field) => field.id === 'probability');
    expect(expectedField && expectedField.expected).toBeGreaterThan(0);
    expect(probabilityField && probabilityField.expected).toBeGreaterThan(0);
    expect(probabilityField && probabilityField.expected).toBeLessThanOrEqual(100);
  });

  it('pert-probability: критичний шлях за te завжди один (п’ять робіт), бо дисперсію сумують лише по ньому (PRJ-06)', () => {
    for (let seed = 0; seed < 1000; seed += 1) {
      const variant = createCpmPertVariant(createSeededRandom(`cpm-pert:single-path:${seed}`), [{ method: 'pert-probability' }]);
      const pathLine = variant.solution.find((line) => line.startsWith('Критичний шлях за te:'));
      const path = pathLine?.match(/te: ([A-G–]+),/)?.[1] ?? '';

      expect(path.split('–')).toHaveLength(5);
    }
  });

  it('pert-probability: директивний строк буває і раніше, і пізніше за TE — 1000 сідів', () => {
    // |Z| ≤ 3 (MAX_ABSOLUTE_Z) — межа за Φ(3)/Φ(-3); мета — не більш ніж ~10% варіантів з P ≥ 99%,
    // і симетрично мають траплятися варіанти з P ≤ 1% (директивний строк раніше за TE).
    const TOTAL = 1000;
    const lowerBound = standardNormalCdf(-3);
    const upperBound = standardNormalCdf(3);
    let highProbabilityCount = 0;
    let lowProbabilityCount = 0;
    for (let seed = 0; seed < TOTAL; seed += 1) {
      const variant = createCpmPertVariant(createSeededRandom(`pert-deadline:${seed}`), [{ method: 'pert-probability' }]);
      const probability = (variant.answers.find((field) => field.id === 'probability')?.expected ?? 0) / 100;
      expect(probability).toBeGreaterThanOrEqual(lowerBound - 0.01);
      expect(probability).toBeLessThanOrEqual(upperBound + 0.01);
      if (probability >= 0.99) highProbabilityCount += 1;
      if (probability <= 0.01) lowProbabilityCount += 1;
    }
    expect(highProbabilityCount / TOTAL).toBeLessThanOrEqual(0.1);
    expect(lowProbabilityCount).toBeGreaterThan(0);
  });

  it('кидає виняток на порожній пул задач', () => {
    expect(() => createCpmPertVariant(createSeededRandom('cpm-pert:4'), [])).toThrow();
  });

  it('десять варіантів поспіль завжди дають коректний результат обома методами', () => {
    const random = createSeededRandom('cpm-pert:stress');
    for (let index = 0; index < 10; index += 1) {
      const variant = createCpmPertVariant(random, [{ method: 'cpm-critical-path' }, { method: 'pert-probability' }]);
      expect(variant.given.length).toBeGreaterThan(0);
      expect(variant.solution.length).toBeGreaterThan(0);
    }
  });
});
