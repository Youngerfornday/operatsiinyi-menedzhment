import { ok } from '../shared/result';
import { fail, isFinitePositive, type EoqResult } from './errors';

/**
 * Формули управління запасами при незалежному попиті (docs/research/formula-baseline.md, розділ 1,
 * коди EOQ-01, EOQ-03, EOQ-04). Одиниці узгоджує контент і генератор варіантів, рушій лише
 * захищається від нульових чи від’ємних знаменників.
 */

/** EOQ-01: Q* = √(2DS / H) — оптимальний розмір замовлення. */
export function economicOrderQuantity(annualDemand: number, orderCost: number, holdingCost: number): EoqResult<number> {
  if (annualDemand < 0 || orderCost < 0) return fail('negative-value');
  if (!isFinitePositive(holdingCost)) return fail('non-positive-holding-cost');
  return ok(Math.sqrt((2 * annualDemand * orderCost) / holdingCost));
}

/** EOQ-03: ROP = d̄ · L — точка замовлення за середнім денним попитом і часом постачання. */
export function reorderPoint(averageDailyDemand: number, leadTimeDays: number): EoqResult<number> {
  if (averageDailyDemand < 0) return fail('negative-value');
  if (!isFinitePositive(leadTimeDays)) return fail('non-positive-lead-time');
  return ok(averageDailyDemand * leadTimeDays);
}

/** EOQ-04: SS = z · σ_dLT — страховий запас за коефіцієнтом рівня обслуговування. */
export function safetyStock(zScore: number, demandStdDevDuringLeadTime: number): EoqResult<number> {
  if (zScore < 0 || demandStdDevDuringLeadTime < 0) return fail('negative-value');
  return ok(zScore * demandStdDevDuringLeadTime);
}

/** Компонент EOQ-01: (D/Q)·S — річні витрати на оформлення замовлень при розмірі партії Q. */
export function annualOrderingCost(annualDemand: number, orderQuantity: number, orderCost: number): EoqResult<number> {
  if (annualDemand < 0 || orderCost < 0) return fail('negative-value');
  if (!isFinitePositive(orderQuantity)) return fail('non-positive-order-quantity');
  return ok((annualDemand / orderQuantity) * orderCost);
}

/** Компонент EOQ-01: (Q/2)·H — річні витрати на зберігання середнього запасу при розмірі партії Q. */
export function annualHoldingCost(orderQuantity: number, holdingCost: number): EoqResult<number> {
  if (orderQuantity < 0) return fail('negative-value');
  if (!isFinitePositive(holdingCost)) return fail('non-positive-holding-cost');
  return ok((orderQuantity / 2) * holdingCost);
}

/** Сума витрат на оформлення й зберігання (EOQ-01): мінімум досягається при Q = EOQ. */
export function totalAnnualInventoryCost(annualDemand: number, orderQuantity: number, orderCost: number, holdingCost: number): EoqResult<number> {
  const ordering = annualOrderingCost(annualDemand, orderQuantity, orderCost);
  if (!ordering.ok) return ordering;
  const holding = annualHoldingCost(orderQuantity, holdingCost);
  if (!holding.ok) return holding;
  return ok(ordering.value + holding.value);
}
