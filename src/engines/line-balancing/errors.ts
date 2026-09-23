import { err, type Result } from '../shared/result';

/**
 * Помилки рушія балансування лінії: невалідні вхідні дані для часу такту (CAP-05), мінімальної
 * кількості станцій (LB-01), розподілу операцій за станціями (LB-05) і ефективності (LB-02) —
 * docs/research/formula-baseline.md. Винятків немає — лише Result з кодом і повідомленням.
 */
export type LineBalancingErrorCode = 'non-positive-value' | 'empty-operations' | 'operation-exceeds-cycle' | 'non-positive-denominator';

export interface LineBalancingError {
  readonly code: LineBalancingErrorCode;
  readonly message: string;
}

export const LINE_BALANCING_ERROR_MESSAGES: Readonly<Record<LineBalancingErrorCode, string>> = {
  'non-positive-value': 'Доступний час і попит мають бути більшими за нуль.',
  'empty-operations': 'Потрібна щонайменше одна операція лінії.',
  'operation-exceeds-cycle': 'Час операції не може перевищувати час такту (циклу) лінії — операцію такт не пропустить.',
  'non-positive-denominator': 'Такт лінії та кількість станцій мають бути більшими за нуль.',
};

export function fail(code: LineBalancingErrorCode): { readonly ok: false; readonly error: LineBalancingError } {
  return err({ code, message: LINE_BALANCING_ERROR_MESSAGES[code] });
}

export type LineBalancingResult<T> = Result<T, LineBalancingError>;
