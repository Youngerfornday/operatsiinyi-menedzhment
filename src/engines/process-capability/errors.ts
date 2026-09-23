import { err, type Result } from '../shared/result';

/**
 * Помилки рушія придатності процесу: індекси Cp і Cpk (docs/research/formula-baseline.md, розділ 8,
 * коди QC-04, QC-05). Винятків немає — лише Result з кодом.
 */
export type ProcessCapabilityErrorCode = 'non-positive-sigma' | 'invalid-tolerance-field';

export interface ProcessCapabilityError {
  readonly code: ProcessCapabilityErrorCode;
  readonly message: string;
}

export const PROCESS_CAPABILITY_ERROR_MESSAGES: Readonly<Record<ProcessCapabilityErrorCode, string>> = {
  'non-positive-sigma': 'Стандартне відхилення процесу має бути більшим за нуль.',
  'invalid-tolerance-field': 'Верхня межа допуску має бути більшою за нижню.',
};

export function fail(code: ProcessCapabilityErrorCode): { readonly ok: false; readonly error: ProcessCapabilityError } {
  return err({ code, message: PROCESS_CAPABILITY_ERROR_MESSAGES[code] });
}

export type ProcessCapabilityResult<T> = Result<T, ProcessCapabilityError>;
