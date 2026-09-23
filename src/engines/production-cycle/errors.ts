import { err, type Result } from '../shared/result';

/**
 * Помилки рушія тривалості виробничого циклу (PC-01, PC-02, PC-03). Винятків немає — лише Result
 * з кодом і повідомленням українською.
 */
export type ProductionCycleErrorCode = 'negative-value' | 'too-few-operations' | 'invalid-batch-size' | 'invalid-transfer-batch';

export interface ProductionCycleError {
  readonly code: ProductionCycleErrorCode;
  readonly message: string;
}

export const PRODUCTION_CYCLE_ERROR_MESSAGES: Readonly<Record<ProductionCycleErrorCode, string>> = {
  'negative-value': 'Норма часу й кількість робочих місць операції мають бути додатними числами.',
  'too-few-operations': 'Потрібно щонайменше дві операції, щоб порахувати тривалість циклу.',
  'invalid-batch-size': 'Розмір партії має бути цілим додатним числом.',
  'invalid-transfer-batch':
    'Транспортна (передавальна) партія має бути цілим числом від 1 до розміру партії, яке ділить розмір партії без залишку.',
};

export function fail(code: ProductionCycleErrorCode): { readonly ok: false; readonly error: ProductionCycleError } {
  return err({ code, message: PRODUCTION_CYCLE_ERROR_MESSAGES[code] });
}

export type ProductionCycleResult<T> = Result<T, ProductionCycleError>;
