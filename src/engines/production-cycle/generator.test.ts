import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '../shared/random';
import { productionCycleTimes } from './calculations';
import { createProductionCycleVariant, type ProductionCycleTaskChoice } from './generator';
import type { CycleOperation } from './types';

const TASKS: readonly ProductionCycleTaskChoice[] = [{ method: 'production-cycle' }];

function unwrap<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false }): T {
  if (!result.ok) throw new Error('unexpected error result in test fixture');
  return result.value;
}

function numberFrom(value: string): number {
  return Number(value.replace(/[^\d.,]/g, '').replace(',', '.'));
}

/** Відновлює операції з рядків given: усі, крім останніх двох (n і p). */
function operationsFromGiven(variant: ReturnType<typeof createProductionCycleVariant>): CycleOperation[] {
  return variant.given.slice(0, -2).map((item) => {
    const [timePart] = item.value.split(',');
    const workplacesMatch = /(\d+) робочих місця/.exec(item.value);
    const workplaces = workplacesMatch ? Number(workplacesMatch[1]) : 1;
    return { time: numberFrom(timePart!), workplaces };
  });
}

describe('createProductionCycleVariant', () => {
  it('той самий seed дає той самий варіант', () => {
    const first = createProductionCycleVariant(createSeededRandom('p03:1'), TASKS);
    const second = createProductionCycleVariant(createSeededRandom('p03:1'), TASKS);
    expect(second).toEqual(first);
  });

  it('різні seed дають різні варіанти', () => {
    const first = createProductionCycleVariant(createSeededRandom('p03:1'), TASKS);
    const second = createProductionCycleVariant(createSeededRandom('p03:2'), TASKS);
    expect(second.variantId).not.toEqual(first.variantId);
  });

  it('кидає помилку на порожній пул задач', () => {
    expect(() => createProductionCycleVariant(createSeededRandom('x'), [])).toThrow();
  });

  it('дає рівно три відповіді — послідовний, паралельний, паралельно-послідовний рух', () => {
    const variant = createProductionCycleVariant(createSeededRandom('p03:5'), TASKS);
    expect(variant.answers.map((field) => field.id)).toEqual(['sequential', 'parallel', 'mixed']);
  });

  it('очікувані значення справді дає рушій формул (PC-01, PC-02, PC-03) із тих самих вихідних даних', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const variant = createProductionCycleVariant(createSeededRandom(`pc:${seed}`), TASKS);
      const operations = operationsFromGiven(variant);
      const batchSize = numberFrom(variant.given.at(-2)!.value);
      const transferBatch = numberFrom(variant.given.at(-1)!.value);
      const expected = unwrap(productionCycleTimes(operations, batchSize, transferBatch));
      expect(variant.answers[0]!.expected).toBeCloseTo(expected.sequential, 6);
      expect(variant.answers[1]!.expected).toBeCloseTo(expected.parallel, 6);
      expect(variant.answers[2]!.expected).toBeCloseTo(expected.mixed, 6);
    }
  });

  it('порядок Tпар ≤ Tзм ≤ Tпосл виконується для щойно згенерованих даних', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const variant = createProductionCycleVariant(createSeededRandom(`order:${seed}`), TASKS);
      const [sequential, parallel, mixed] = variant.answers.map((field) => field.expected);
      expect(parallel!).toBeLessThanOrEqual(mixed! + 1e-9);
      expect(mixed!).toBeLessThanOrEqual(sequential! + 1e-9);
    }
  });

  it('транспортна партія завжди ділить розмір партії без залишку', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const variant = createProductionCycleVariant(createSeededRandom(`div:${seed}`), TASKS);
      const batchSize = numberFrom(variant.given.at(-2)!.value);
      const transferBatch = numberFrom(variant.given.at(-1)!.value);
      expect(batchSize % transferBatch).toBe(0);
      expect(transferBatch).toBeLessThan(batchSize);
    }
  });

  it('генерує від 3 до 4 операцій', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const variant = createProductionCycleVariant(createSeededRandom(`ops:${seed}`), TASKS);
      const operations = operationsFromGiven(variant);
      expect(operations.length).toBeGreaterThanOrEqual(3);
      expect(operations.length).toBeLessThanOrEqual(4);
    }
  });
});
