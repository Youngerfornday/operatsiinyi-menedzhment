import { describe, expect, it } from 'vitest';
import { computeCpm } from './network';
import { createRgrVariant } from './variant';
import type { BomItem, NetworkActivity, RgrVariant } from './types';

/**
 * Властивісна перевірка розв’язності: 1000 різних номерів залікової книжки → кожен етап варіанта
 * має однозначний розв’язок у межах бази формул і узгоджені між етапами дані однієї дільниці.
 */
const GRADEBOOK_SAMPLE = Array.from({ length: 1000 }, (_, index) => `2${String(index * 7919 % 10_000_000).padStart(7, '0')}`);

function variantFor(gradebook: string): RgrVariant {
  const result = createRgrVariant(gradebook);
  if (!result.ok) throw new Error(`Номер ${gradebook} відхилено: ${result.error.message}`);
  return result.value;
}

const VARIANTS = GRADEBOOK_SAMPLE.map(variantFor);

/** Lot-for-lot MRP (MRP-01..03): тиждень запуску кожного замовлення для всіх позицій BOM. */
function mrpReleaseWeeks(bom: readonly BomItem[], firstWeek: number, weeks: readonly number[]): number[] {
  const gross = new Map<string, Map<number, number>>();
  const add = (id: string, week: number, quantity: number) => {
    const byWeek = gross.get(id) ?? new Map<number, number>();
    byWeek.set(week, (byWeek.get(week) ?? 0) + quantity);
    gross.set(id, byWeek);
  };
  weeks.forEach((quantity, index) => add('P', firstWeek + index, quantity));
  const releases: number[] = [];
  for (const item of bom) {
    let onHand = item.onHand;
    const byWeek = [...(gross.get(item.id) ?? new Map()).entries()].sort((a, b) => a[0] - b[0]);
    for (const [week, quantity] of byWeek) {
      const net = Math.max(0, quantity - onHand);
      onHand = Math.max(0, onHand - quantity);
      if (net === 0) continue;
      const releaseWeek = week - item.leadTimeWeeks;
      releases.push(releaseWeek);
      for (const child of bom.filter((candidate) => candidate.parentId === item.id)) add(child.id, releaseWeek, net * child.quantityPerParent);
    }
  }
  return releases;
}

function criticalPathCount(network: readonly NetworkActivity[]): number {
  const { results } = computeCpm(network);
  const critical = new Set(results.filter((result) => result.critical).map((result) => result.id));
  const successors = (id: string) => network.filter((activity) => activity.predecessors.includes(id) && critical.has(activity.id));
  const countFrom = (id: string): number => {
    const next = successors(id);
    return next.length === 0 ? 1 : next.reduce((sum, activity) => sum + countFrom(activity.id), 0);
  };
  return network.filter((activity) => activity.predecessors.length === 0 && critical.has(activity.id)).reduce((sum, activity) => sum + countFrom(activity.id), 0);
}

describe('РГР: розв’язність варіантів на 1000 номерах залікової', () => {
  it('етап 2: історія й прогноз — охайні цілі числа, ваги дають суму 1', () => {
    for (const { stage2 } of VARIANTS) {
      for (const value of [...stage2.demandHistory, ...stage2.aggregatePlan.demandForecast]) {
        expect(value % 10).toBe(0);
        expect(value).toBeGreaterThan(0);
      }
      expect(stage2.weightedWeights.reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1, 10);
      expect(stage2.initialExponentialForecast).toBeGreaterThan(0);
    }
  });

  it('етап 2: чисельність персоналу узгоджена з попитом (стратегія погоні не звільняє більшість у першому місяці)', () => {
    for (const { stage2 } of VARIANTS) {
      const plan = stage2.aggregatePlan;
      const initialCapacity = plan.beginningWorkforce * plan.unitsPerWorkerPerMonth;
      const averageDemand = plan.demandForecast.reduce((sum, value) => sum + value, 0) / plan.demandForecast.length;
      expect(initialCapacity / averageDemand).toBeGreaterThan(0.6);
      expect(initialCapacity / averageDemand).toBeLessThan(1.4);
      for (const demand of plan.demandForecast) expect(Number.isInteger(Math.ceil(demand / plan.unitsPerWorkerPerMonth))).toBe(true);
    }
  });

  it('етап 2: проєктна потужність дільниці порівнянна з попитом (використання 50–120 %)', () => {
    for (const { stage1, stage2 } of VARIANTS) {
      const designCapacity = stage2.capacity.productionRatePerHour * stage2.capacity.availableHoursPerMonth;
      const utilization = stage1.baselineMonthlyDemand / designCapacity;
      expect(utilization).toBeGreaterThan(0.5);
      expect(utilization).toBeLessThan(1.2);
    }
  });

  it('етап 3: EOQ, ROP і SS розв’язні лише базовими формулами й річний попит = 12 × місячний', () => {
    for (const { stage1, stage3 } of VARIANTS) {
      const inv = stage3.inventory;
      expect(inv.annualDemand).toBe(12 * stage1.baselineMonthlyDemand);
      expect(Number.isInteger(inv.averageDailyDemand)).toBe(true);
      expect(inv.averageDailyDemand * inv.workingDaysPerYear).toBe(inv.annualDemand);
      expect(Math.sqrt((2 * inv.annualDemand * inv.orderingCost) / inv.holdingCostPerUnitPerYear)).toBeGreaterThan(0);
      expect(inv.leadTimeDemandStdDev).toBeGreaterThan(0);
      expect(inv.zValue * inv.leadTimeDemandStdDev).toBeGreaterThan(0);
    }
  });

  it('етап 3: MRP — жодного запуску замовлення раніше тижня 1', () => {
    for (const { stage3 } of VARIANTS) {
      const releases = mrpReleaseWeeks(stage3.bom, stage3.masterScheduleFirstWeek, stage3.masterScheduleWeeks);
      expect(releases.length).toBeGreaterThan(0);
      expect(Math.min(...releases)).toBeGreaterThanOrEqual(1);
    }
  });

  it('етап 3: мережа ациклічна, тривалість додатна, критичний шлях єдиний', () => {
    for (const { stage3 } of VARIANTS) {
      const ids = stage3.network.map((activity) => activity.id);
      stage3.network.forEach((activity, index) => activity.predecessors.forEach((id) => expect(ids.indexOf(id)).toBeLessThan(index)));
      expect(computeCpm(stage3.network).projectDuration).toBeGreaterThan(0);
      expect(criticalPathCount(stage3.network)).toBe(1);
    }
  });

  it('етап 4: X̄-R має ненульовий R̄, Cp і Cpk додатні', () => {
    for (const { stage4 } of VARIANTS) {
      const ranges = stage4.controlChart.subgroups.map((subgroup) => Math.max(...subgroup.measurements) - Math.min(...subgroup.measurements));
      const meanRange = ranges.reduce((sum, value) => sum + value, 0) / ranges.length;
      expect(meanRange).toBeGreaterThan(0);
      const cap = stage4.capability;
      const cp = (cap.upperSpecLimit - cap.lowerSpecLimit) / (6 * cap.processStdDev);
      const cpk = Math.min(cap.upperSpecLimit - cap.processMean, cap.processMean - cap.lowerSpecLimit) / (3 * cap.processStdDev);
      expect(cp).toBeGreaterThan(0);
      expect(cpk).toBeGreaterThan(0);
      const { before, after } = stage4.productivity;
      expect(after.output / after.laborHours).toBeGreaterThan(before.output / before.laborHours);
    }
  });
});
