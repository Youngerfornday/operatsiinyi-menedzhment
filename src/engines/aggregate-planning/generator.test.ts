import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '../shared/random';
import { chaseStrategyWorkforce, evaluatePlan, levelStrategyWorkforce } from './calculations';
import { createAggregatePlanningVariant, type AggregatePlanningTaskChoice } from './generator';

const TASKS: readonly AggregatePlanningTaskChoice[] = [{ method: 'aggregate-plan-costs' }];

function extractNumber(value: string): number {
  return Number(value.replace(/[^\d,.-]/g, '').replace(',', '.'));
}

describe('createAggregatePlanningVariant', () => {
  it('той самий seed дає той самий варіант', () => {
    // Act
    const first = createAggregatePlanningVariant(createSeededRandom('p05:1'), TASKS);
    const second = createAggregatePlanningVariant(createSeededRandom('p05:1'), TASKS);

    // Assert
    expect(second).toEqual(first);
  });

  it('різні seed дають різні варіанти', () => {
    // Act
    const first = createAggregatePlanningVariant(createSeededRandom('p05:1'), TASKS);
    const second = createAggregatePlanningVariant(createSeededRandom('p05:2'), TASKS);

    // Assert
    expect(second.variantId).not.toEqual(first.variantId);
  });

  it('кидає помилку на порожній пул задач', () => {
    expect(() => createAggregatePlanningVariant(createSeededRandom('x'), [])).toThrow();
  });

  it('чотирнадцять рядків даних: 6 періодів попиту + штат до горизонту + запас + 6 ставок і параметрів', () => {
    // Act
    const variant = createAggregatePlanningVariant(createSeededRandom('rows:1'), TASKS);

    // Assert
    expect(variant.given).toHaveLength(6 + 1 + 1 + 6);
  });

  it('звільнення завжди дорожче за найм, як у прикладі лекції', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const variant = createAggregatePlanningVariant(createSeededRandom(`fire:${seed}`), TASKS);
      const hiring = extractNumber(variant.given[10]!.value);
      const firing = extractNumber(variant.given[11]!.value);
      expect(firing).toBeGreaterThan(hiring);
    }
  });

  it('очікувані сумарні витрати справді дають AGG-01/AGG-02/AGG-03, порахувавши варіант наново', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const variant = createAggregatePlanningVariant(createSeededRandom(`plan:${seed}`), TASKS);
      const demand = variant.given.slice(0, 6).map((item) => extractNumber(item.value));
      const initialWorkforce = extractNumber(variant.given[6]!.value);
      const initialInventory = extractNumber(variant.given[7]!.value);
      const params = {
        productivityPerWorker: extractNumber(variant.given[8]!.value),
        regularWagePerWorker: extractNumber(variant.given[9]!.value),
        hiringCostPerWorker: extractNumber(variant.given[10]!.value),
        firingCostPerWorker: extractNumber(variant.given[11]!.value),
        holdingCostPerUnit: extractNumber(variant.given[12]!.value),
        shortageCostPerUnit: extractNumber(variant.given[13]!.value),
      };

      const chaseWorkforce = chaseStrategyWorkforce(demand, params.productivityPerWorker);
      const levelWorkforce = levelStrategyWorkforce(demand, params.productivityPerWorker);
      if (!chaseWorkforce.ok || !levelWorkforce.ok) throw new Error('unexpected error result in test fixture');
      const chase = evaluatePlan(demand, chaseWorkforce.value, initialWorkforce, initialInventory, params);
      const level = evaluatePlan(demand, levelWorkforce.value, initialWorkforce, initialInventory, params);
      if (!chase.ok || !level.ok) throw new Error('unexpected error result in test fixture');

      const chaseAnswer = variant.answers.find((field) => field.id === 'chase-cost')!;
      const levelAnswer = variant.answers.find((field) => field.id === 'level-cost')!;
      expect(chaseAnswer.expected).toBeCloseTo(chase.value.totalCost, 6);
      expect(levelAnswer.expected).toBeCloseTo(level.value.totalCost, 6);
    }
  });

  it('умова прямо називає правило дефіциту, а розв’язок показує запас рівномірної стратегії за періодами', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const variant = createAggregatePlanningVariant(createSeededRandom(`rule:${seed}`), TASKS);
      expect(variant.prompt).toMatch(/від’ємний залишок/);
      expect(variant.solution.some((step) => step.startsWith('Запас на кінець періодів'))).toBe(true);
    }
  });
});
