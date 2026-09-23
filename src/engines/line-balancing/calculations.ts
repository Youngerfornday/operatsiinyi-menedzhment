import { ok } from '../shared/result';
import { fail, type LineBalancingResult } from './errors';

/**
 * Формули балансування потокової лінії (docs/research/formula-baseline.md, CAP-05, LB-01..04).
 * Правило закріплення операцій за станціями (LB-05, «найбільша кількість наступних завдань») для
 * простого послідовного ланцюга операцій без розгалужень зводиться до жадібного заповнення станцій
 * у технологічному порядку без перестановок — так само, як показано у WorkedExample code="LB-01"
 * лекції теми 5: жодна операція не переставляється, кожна станція наповнюється, поки влазить у такт.
 */

/** CAP-05: Такт = Доступний час виробництва / Попит за період. */
export function taktTime(availableTime: number, demand: number): LineBalancingResult<number> {
  if (!(availableTime > 0) || !(demand > 0)) return fail('non-positive-value');
  return ok(availableTime / demand);
}

/** LB-01: Nmin = ⌈Σtᵢ / C⌉. */
export function minimumStations(operationTimes: readonly number[], cycleTime: number): LineBalancingResult<number> {
  const validated = validateOperations(operationTimes, cycleTime);
  if (!validated.ok) return validated;
  const total = operationTimes.reduce((sum, time) => sum + time, 0);
  return ok(Math.ceil(total / cycleTime));
}

function validateOperations(operationTimes: readonly number[], cycleTime: number): LineBalancingResult<true> {
  if (operationTimes.length === 0) return fail('empty-operations');
  if (!(cycleTime > 0)) return fail('non-positive-denominator');
  if (operationTimes.some((time) => !(time > 0))) return fail('non-positive-value');
  if (operationTimes.some((time) => time > cycleTime)) return fail('operation-exceeds-cycle');
  return ok(true);
}

/**
 * LB-05 для послідовного ланцюга операцій: жадібне закріплення в незмінному технологічному порядку —
 * додаємо операцію до поточної станції, поки сума не перевищує такт, інакше відкриваємо нову станцію.
 */
export function assignStationsSequential(operationTimes: readonly number[], cycleTime: number): LineBalancingResult<readonly (readonly number[])[]> {
  const validated = validateOperations(operationTimes, cycleTime);
  if (!validated.ok) return validated;
  const stations: number[][] = [];
  let current: number[] = [];
  let currentSum = 0;
  for (const time of operationTimes) {
    if (current.length > 0 && currentSum + time > cycleTime) {
      stations.push(current);
      current = [];
      currentSum = 0;
    }
    current.push(time);
    currentSum += time;
  }
  if (current.length > 0) stations.push(current);
  return ok(stations);
}

/** LB-02: Ефективність = Σtᵢ / (N · C) · 100%. */
export function lineBalancingEfficiency(operationTimes: readonly number[], stationCount: number, cycleTime: number): LineBalancingResult<number> {
  if (!(stationCount > 0) || !(cycleTime > 0)) return fail('non-positive-denominator');
  if (operationTimes.length === 0) return fail('empty-operations');
  const total = operationTimes.reduce((sum, time) => sum + time, 0);
  return ok((total / (stationCount * cycleTime)) * 100);
}

/** LB-03: Простій (%) = 100% − Ефективність. Завжди визначена для вже порахованої ефективності. */
export function balanceDelay(efficiencyPercent: number): number {
  return 100 - efficiencyPercent;
}

/** LB-04: Тпростою = N · C − Σtᵢ. */
export function idleTimePerCycle(operationTimes: readonly number[], stationCount: number, cycleTime: number): LineBalancingResult<number> {
  if (!(stationCount > 0) || !(cycleTime > 0)) return fail('non-positive-denominator');
  const total = operationTimes.reduce((sum, time) => sum + time, 0);
  return ok(stationCount * cycleTime - total);
}
