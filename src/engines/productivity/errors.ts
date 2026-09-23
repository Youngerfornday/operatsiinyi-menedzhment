import { err, type Result } from '../shared/result';

/**
 * Помилки рушія продуктивності: невалідні вхідні дані для формул PROD-01/02/03, CAP-01/02
 * (docs/research/formula-baseline.md, розділ 3). Винятків немає — лише Result з кодом і повідомленням.
 */
export type ProductivityErrorCode = 'negative-value' | 'non-positive-denominator' | 'empty-resources' | 'period-mismatch';

export interface ProductivityError {
  readonly code: ProductivityErrorCode;
  readonly message: string;
}

export const PRODUCTIVITY_ERROR_MESSAGES: Readonly<Record<ProductivityErrorCode, string>> = {
  'negative-value': 'Випуск або витрати ресурсу не можуть бути від’ємними.',
  'non-positive-denominator': 'Знаменник формули має бути більшим за нуль.',
  'empty-resources': 'Потрібен щонайменше один вид витраченого ресурсу.',
  'period-mismatch': 'Періоди мають включати однакову кількість видів ресурсів, щоб їх можна було порівняти.',
};

export function fail(code: ProductivityErrorCode): { readonly ok: false; readonly error: ProductivityError } {
  return err({ code, message: PRODUCTIVITY_ERROR_MESSAGES[code] });
}

export function isFinitePositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export type ProductivityResult<T> = Result<T, ProductivityError>;
