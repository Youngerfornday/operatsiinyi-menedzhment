import { err, type Result } from '../shared/result';

/**
 * Помилки рушія EOQ: невалідні вхідні дані для формул EOQ-01, EOQ-03, EOQ-04
 * (docs/research/formula-baseline.md, розділ 1). Винятків немає — лише Result з кодом і повідомленням.
 */
export type EoqErrorCode = 'negative-value' | 'non-positive-holding-cost' | 'non-positive-lead-time' | 'non-positive-order-quantity';

export interface EoqError {
  readonly code: EoqErrorCode;
  readonly message: string;
}

export const EOQ_ERROR_MESSAGES: Readonly<Record<EoqErrorCode, string>> = {
  'negative-value': 'Попит, вартість замовлення чи розмір партії не можуть бути від’ємними.',
  'non-positive-holding-cost': 'Вартість зберігання одиниці запасу має бути більшою за нуль.',
  'non-positive-lead-time': 'Час постачання має бути більшим за нуль.',
  'non-positive-order-quantity': 'Розмір замовлення має бути більшим за нуль.',
};

export function fail(code: EoqErrorCode): { readonly ok: false; readonly error: EoqError } {
  return err({ code, message: EOQ_ERROR_MESSAGES[code] });
}

export function isFinitePositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export type EoqResult<T> = Result<T, EoqError>;
