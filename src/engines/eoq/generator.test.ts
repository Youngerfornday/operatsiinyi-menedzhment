import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '../shared/random';
import { economicOrderQuantity, reorderPoint, safetyStock, totalAnnualInventoryCost } from './calculations';
import { roundTo } from '../shared/number-format';
import { createEoqVariant, type EoqTaskChoice } from './generator';
import type { EoqMethod } from './types';

const ALL_METHODS: readonly EoqMethod[] = ['eoq', 'reorder-point', 'cost-sensitivity'];
const ALL_TASKS: readonly EoqTaskChoice[] = ALL_METHODS.map((method) => ({ method }));

function extractNumber(text: string): number {
  return Number(text.replace(/[^\d.,]/g, '').replace(',', '.'));
}

function extractZ(text: string): number {
  const match = /z\s*=\s*([\d,.]+)/.exec(text);
  if (!match) throw new Error(`не знайдено z у «${text}»`);
  return Number(match[1]!.replace(',', '.'));
}

function unwrap<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false }): T {
  if (!result.ok) throw new Error('unexpected error result in test fixture');
  return result.value;
}

function answerById(variant: { readonly answers: readonly { readonly id: string; readonly expected: number; readonly tolerance: number }[] }, id: string) {
  const field = variant.answers.find((answer) => answer.id === id);
  if (!field) throw new Error(`поле «${id}» відсутнє у variant.answers`);
  return field;
}

describe('createEoqVariant', () => {
  it('той самий seed дає той самий варіант', () => {
    const first = createEoqVariant(createSeededRandom('eoq:1'), ALL_TASKS);
    const second = createEoqVariant(createSeededRandom('eoq:1'), ALL_TASKS);
    expect(second).toEqual(first);
  });

  it('різні seed дають різні варіанти', () => {
    const first = createEoqVariant(createSeededRandom('eoq:1'), ALL_TASKS);
    const second = createEoqVariant(createSeededRandom('eoq:2'), ALL_TASKS);
    expect(second.variantId).not.toEqual(first.variantId);
  });

  it('обирає лише методи з переданого пулу', () => {
    const only: readonly EoqTaskChoice[] = [{ method: 'reorder-point' }];
    for (let seed = 0; seed < 20; seed += 1) {
      const variant = createEoqVariant(createSeededRandom(`only:${seed}`), only);
      expect(variant.method).toBe('reorder-point');
    }
  });

  it('кидає помилку на порожній пул задач', () => {
    expect(() => createEoqVariant(createSeededRandom('x'), [])).toThrow();
  });

  it('eoq: given і answers непорожні, очікуване значення справді дає EOQ-01 з округленням', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const variant = createEoqVariant(createSeededRandom(`eoq-task:${seed}`), [{ method: 'eoq' }]);
      if (variant.method !== 'eoq') throw new Error('unexpected method');
      expect(variant.given.length).toBeGreaterThan(0);
      expect(variant.answers.length).toBe(1);
      const demand = extractNumber(variant.given[0]!.value);
      const orderCost = extractNumber(variant.given[1]!.value);
      const holdingCost = extractNumber(variant.given[2]!.value);
      const recomputed = roundTo(unwrap(economicOrderQuantity(demand, orderCost, holdingCost)), 0);
      const field = answerById(variant, 'eoq');
      expect(Math.abs(recomputed - field.expected)).toBeLessThanOrEqual(field.tolerance);
    }
  });

  it('reorder-point: given і answers непорожні, очікувані значення справді дають EOQ-03 і EOQ-04', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const variant = createEoqVariant(createSeededRandom(`reorder:${seed}`), [{ method: 'reorder-point' }]);
      if (variant.method !== 'reorder-point') throw new Error('unexpected method');
      expect(variant.given.length).toBe(4);
      expect(variant.answers.length).toBe(2);
      const averageDailyDemand = extractNumber(variant.given[0]!.value);
      const leadTimeDays = extractNumber(variant.given[1]!.value);
      const sigma = extractNumber(variant.given[2]!.value);
      const z = extractZ(variant.given[3]!.value);

      const ropBase = unwrap(reorderPoint(averageDailyDemand, leadTimeDays));
      const safetyStockExpected = roundTo(unwrap(safetyStock(z, sigma)), 0);
      const reorderPointExpected = ropBase + safetyStockExpected;

      const safetyField = answerById(variant, 'safety-stock');
      const reorderField = answerById(variant, 'reorder-point');
      expect(Math.abs(safetyStockExpected - safetyField.expected)).toBeLessThanOrEqual(safetyField.tolerance);
      expect(Math.abs(reorderPointExpected - reorderField.expected)).toBeLessThanOrEqual(reorderField.tolerance);
    }
  });

  it('cost-sensitivity: given і answers непорожні, очікувані витрати справді дає сума ordering+holding', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const variant = createEoqVariant(createSeededRandom(`cost:${seed}`), [{ method: 'cost-sensitivity' }]);
      if (variant.method !== 'cost-sensitivity') throw new Error('unexpected method');
      expect(variant.given.length).toBe(6);
      expect(variant.answers.length).toBe(3);
      const demand = extractNumber(variant.given[0]!.value);
      const orderCost = extractNumber(variant.given[1]!.value);
      const holdingCost = extractNumber(variant.given[2]!.value);
      const q80 = extractNumber(variant.given[3]!.value);
      const qStar = extractNumber(variant.given[4]!.value);
      const q120 = extractNumber(variant.given[5]!.value);

      const cases: readonly [string, number][] = [
        ['cost-80', q80],
        ['cost-100', qStar],
        ['cost-120', q120],
      ];
      for (const [id, quantity] of cases) {
        const expected = roundTo(unwrap(totalAnnualInventoryCost(demand, quantity, orderCost, holdingCost)), 0);
        const field = answerById(variant, id);
        expect(Math.abs(expected - field.expected)).toBeLessThanOrEqual(field.tolerance);
      }
    }
  });
});
