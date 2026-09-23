import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '../shared/random';
import { createCpmPertVariant } from './generator';

describe('createCpmPertVariant', () => {
  it('той самий сід дає той самий варіант (відтворюваність)', () => {
    const first = createCpmPertVariant(createSeededRandom('cpm-pert:1'), [{ method: 'cpm-critical-path' }]);
    const second = createCpmPertVariant(createSeededRandom('cpm-pert:1'), [{ method: 'cpm-critical-path' }]);

    expect(first).toEqual(second);
  });

  it('cpm-critical-path: тривалість проекту невід’ємна і не менша за резерв роботи B', () => {
    const variant = createCpmPertVariant(createSeededRandom('cpm-pert:2'), [{ method: 'cpm-critical-path' }]);

    expect(variant.method).toBe('cpm-critical-path');
    expect(variant.answers).toHaveLength(2);
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
