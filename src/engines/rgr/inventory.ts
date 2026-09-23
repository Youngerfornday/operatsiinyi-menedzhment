import { pickOne, randomInt, type RandomSource } from '../shared/random';
import type { InventoryData } from './types';

/**
 * Вихідні дані для EOQ-01, EOQ-03, EOQ-04 (економічний розмір замовлення, точка замовлення,
 * страховий запас). Коефіцієнт z береться з готової таблиці рівня обслуговування — так само, як
 * студент бере його з таблиці нормального розподілу, а не рахує обернену функцію. Значення z —
 * стандартна таблиця нормального розподілу, не звірена з підручником викладача.
 *
 * Річний попит = 12 × середньомісячний обсяг етапу 1 (одна дільниця на всіх етапах), рік — 300
 * робочих днів, як у практичній 6. σ_dLT дається готовим: базова формула EOQ-04 не містить
 * переходу від добового відхилення до відхилення за час постачання.
 */
const SERVICE_LEVEL_Z: ReadonlyArray<readonly [number, number]> = [
  [90, 1.28],
  [95, 1.65],
  [97, 1.88],
  [99, 2.33],
];
const WORKING_DAYS_PER_YEAR = 300;
const MONTHS_PER_YEAR = 12;

export function createInventory(random: RandomSource, baselineMonthlyDemand: number): InventoryData {
  const annualDemand = baselineMonthlyDemand * MONTHS_PER_YEAR;
  // baselineMonthlyDemand кратний 50 (етап 1), тож 12·B/300 = B/25 — ціле.
  const averageDailyDemand = annualDemand / WORKING_DAYS_PER_YEAR;
  const [serviceLevelPercent, zValue] = pickOne(SERVICE_LEVEL_Z, random);
  const leadTimeDays = randomInt(random, 3, 10);
  const stdDevShare = randomInt(random, 10, 25) / 100;

  return {
    annualDemand,
    orderingCost: 50 * randomInt(random, 4, 20),
    holdingCostPerUnitPerYear: 2 * randomInt(random, 5, 20),
    leadTimeDays,
    workingDaysPerYear: WORKING_DAYS_PER_YEAR,
    averageDailyDemand,
    leadTimeDemandStdDev: Math.max(1, Math.round(averageDailyDemand * leadTimeDays * stdDevShare)),
    serviceLevelPercent,
    zValue,
  };
}
