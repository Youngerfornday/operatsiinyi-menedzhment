import { err, type Result } from '../shared/result';

/** Помилки рушія закону Літтла (CAP-04: L = λ · W). Винятків немає — лише Result з кодом і повідомленням. */
export type LittleLawErrorCode = 'negative-value' | 'non-positive-denominator';

export interface LittleLawError {
  readonly code: LittleLawErrorCode;
  readonly message: string;
}

export const LITTLE_LAW_ERROR_MESSAGES: Readonly<Record<LittleLawErrorCode, string>> = {
  'negative-value': 'Незавершене виробництво, пропускна здатність і час перебування не можуть бути від’ємними.',
  'non-positive-denominator': 'Знаменник формули має бути більшим за нуль.',
};

export function fail(code: LittleLawErrorCode): { readonly ok: false; readonly error: LittleLawError } {
  return err({ code, message: LITTLE_LAW_ERROR_MESSAGES[code] });
}

export function isFinitePositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export type LittleLawResult<T> = Result<T, LittleLawError>;
