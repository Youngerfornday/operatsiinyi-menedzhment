import { pickOne, randomInt, type RandomSource } from '../shared/random';
import type { InventoryData } from './types';

/**
 * Вихідні дані для EOQ-01, EOQ-03, EOQ-04 (економічний розмір замовлення, точка замовлення,
 * страховий запас). Коефіцієнт z береться з готової таблиці рівня обслуговування — так само, як
 * студент бере його з таблиці нормального розподілу, а не рахує обернену функцію.
 */
const SERVICE_LEVEL_Z: ReadonlyArray<readonly [number, number]> = [
  [90, 1.28],
  [95, 1.65],
  [97, 1.88],
  [99, 2.33],
];
const DAYS_PER_YEAR = 360;
const DAILY_DEMAND_ROUNDING = 5;

export function createInventory(random: RandomSource, baselineMonthlyDemand: number): InventoryData {
  const averageDailyDemand = Math.max(DAILY_DEMAND_ROUNDING, Math.round(baselineMonthlyDemand / 30 / DAILY_DEMAND_ROUNDING) * DAILY_DEMAND_ROUNDING);
  const annualDemand = averageDailyDemand * DAYS_PER_YEAR;
  const [serviceLevelPercent, zValue] = pickOne(SERVICE_LEVEL_Z, random);
  const stdDevShare = randomInt(random, 10, 30) / 100;

  return {
    annualDemand,
    orderingCost: 50 * randomInt(random, 4, 20),
    holdingCostPerUnitPerYear: 2 * randomInt(random, 5, 20),
    leadTimeDays: randomInt(random, 3, 10),
    averageDailyDemand,
    dailyDemandStdDev: Math.max(1, Math.round(averageDailyDemand * stdDevShare)),
    serviceLevelPercent,
    zValue,
  };
}
