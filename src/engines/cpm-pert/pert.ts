import { ok } from '../shared/result';
import { roundTo } from '../shared/number-format';
import { computeNetwork, countCriticalPaths } from './network';
import { fail, type CpmPertResult } from './errors';
import type { PertActivityResult, PertEstimate, PertProjectResult } from './types';

/** PRJ-05: очікуваний час операції — зважене середнє трьох оцінок. */
export function expectedTime(optimistic: number, mostLikely: number, pessimistic: number): number {
  return (optimistic + 4 * mostLikely + pessimistic) / 6;
}

/** PRJ-06: дисперсія тривалості операції. */
export function activityVariance(optimistic: number, pessimistic: number): number {
  return ((pessimistic - optimistic) / 6) ** 2;
}

/**
 * Стандартний нормальний розподіл Φ(z): наближення Абрамовіца — Стігана (формула 26.2.17), похибка
 * не більша за 7,5·10⁻⁸. Це загальновідома числова апроксимація таблиці нормального розподілу, а не
 * формула курсу — власного коду в базі не потребує (на відміну від PRJ-05..07, які цю функцію лише
 * використовують для пошуку ймовірності за Z).
 */
export function standardNormalCdf(z: number): number {
  const absZ = Math.abs(z);
  const t = 1 / (1 + 0.2316419 * absZ);
  const density = 0.3989422804014327 * Math.exp((-z * z) / 2);
  const poly = t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const upperTailProbability = density * poly;
  return z >= 0 ? 1 - upperTailProbability : upperTailProbability;
}

/** PRJ-07: Z = (D − TE) / σ, округлений до 2 знаків, як у лекції теми 7, перед пошуком у таблиці. */
export function projectZ(directiveDeadline: number, expectedDuration: number, sigma: number): CpmPertResult<number> {
  if (!(sigma > 0)) return fail('non-positive-sigma');
  return ok(roundTo((directiveDeadline - expectedDuration) / sigma, 2));
}

function validateEstimate(estimate: PertEstimate): boolean {
  return estimate.optimistic > 0 && estimate.optimistic <= estimate.mostLikely && estimate.mostLikely <= estimate.pessimistic;
}

/**
 * Проєкт методом PERT: критичний шлях визначають за очікуваними часами te робіт (стандартна практика —
 * te використовують як тривалість роботи для CPM під невизначеністю), дисперсію проєкту рахують лише
 * за роботами цього критичного шляху (PRJ-06). PRJ-06 визначена для ОДНОГО критичного шляху: якщо
 * мережа має кілька критичних шляхів однакової тривалості (наприклад, дві гілки сходяться з рівною
 * сумою te), база курсу не визначає правила вибору між ними чи підсумовування їхніх дисперсій — це
 * `multiple-critical-paths`, контентна межа методу, а не тиха відмова.
 */
export function computePertProject(estimates: readonly PertEstimate[]): CpmPertResult<PertProjectResult> {
  if (estimates.length === 0) return fail('empty-activities');
  if (estimates.some((estimate) => !validateEstimate(estimate))) return fail('invalid-pert-estimates');

  const activities: PertActivityResult[] = estimates.map((estimate) => ({
    id: estimate.id,
    expectedTime: expectedTime(estimate.optimistic, estimate.mostLikely, estimate.pessimistic),
    variance: activityVariance(estimate.optimistic, estimate.pessimistic),
  }));

  const networkActivities = estimates.map((estimate) => ({ id: estimate.id, duration: expectedTime(estimate.optimistic, estimate.mostLikely, estimate.pessimistic), predecessors: estimate.predecessors }));
  const network = computeNetwork(networkActivities);
  if (!network.ok) return network;
  if (countCriticalPaths(networkActivities, network.value) > 1) return fail('multiple-critical-paths');

  const varianceById = new Map(activities.map((activity) => [activity.id, activity.variance]));
  const variance = network.value.criticalPath.reduce((sum, id) => sum + (varianceById.get(id) ?? 0), 0);
  const sigma = Math.sqrt(variance);

  return ok({ activities, network: network.value, expectedDuration: network.value.projectDuration, variance, sigma });
}

/** Імовірність дотримання директивного строку D за методом PERT (PRJ-07), у частках (0..1). */
export function onTimeProbability(directiveDeadline: number, expectedDuration: number, sigma: number): CpmPertResult<number> {
  const z = projectZ(directiveDeadline, expectedDuration, sigma);
  if (!z.ok) return z;
  return ok(standardNormalCdf(z.value));
}
