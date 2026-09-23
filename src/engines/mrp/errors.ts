import { err, type Result } from '../shared/result';

/**
 * Помилки рушія MRP: невалідні вхідні дані для формул MRP-01/02/03
 * (docs/research/formula-baseline.md, розділ 3). Винятків немає — лише Result з кодом і повідомленням.
 */
export type MrpErrorCode = 'negative-value' | 'non-positive-quantity-per-parent' | 'negative-lead-time';

export interface MrpError {
  readonly code: MrpErrorCode;
  readonly message: string;
}

export const MRP_ERROR_MESSAGES: Readonly<Record<MrpErrorCode, string>> = {
  'negative-value': 'Кількість чи запас не можуть бути від’ємними.',
  'non-positive-quantity-per-parent': 'Норма витрати компонента на одиницю батьківського рівня має бути більшою за нуль.',
  'negative-lead-time': 'Час постачання чи виробництва не може бути від’ємним.',
};

export function fail(code: MrpErrorCode): { readonly ok: false; readonly error: MrpError } {
  return err({ code, message: MRP_ERROR_MESSAGES[code] });
}

export type MrpResult<T> = Result<T, MrpError>;
