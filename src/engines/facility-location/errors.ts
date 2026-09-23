import { err, type Result } from '../shared/result';

/**
 * Помилки рушія вибору місця розташування: невалідні вхідні дані для методу вагових коефіцієнтів
 * (LOC-01) і методу центру ваги (LOC-02), docs/research/formula-baseline.md. Винятків немає —
 * лише Result з кодом і повідомленням.
 */
export type FacilityLocationErrorCode = 'empty-factors' | 'length-mismatch' | 'negative-value' | 'non-finite-value' | 'empty-points' | 'non-positive-weight';

export interface FacilityLocationError {
  readonly code: FacilityLocationErrorCode;
  readonly message: string;
}

export const FACILITY_LOCATION_ERROR_MESSAGES: Readonly<Record<FacilityLocationErrorCode, string>> = {
  'empty-factors': 'Потрібен щонайменше один фактор розміщення.',
  'length-mismatch': 'Кількість ваг факторів має збігатися з кількістю оцінок варіанта.',
  'negative-value': 'Вага фактора чи оцінка варіанта не можуть бути від’ємними.',
  'non-finite-value': 'Вага фактора чи оцінка варіанта мають бути скінченними числами.',
  'empty-points': 'Потрібна щонайменше одна точка для методу центру ваги.',
  'non-positive-weight': 'Сумарний обсяг перевезень (вага точок) має бути більшим за нуль.',
};

export function fail(code: FacilityLocationErrorCode): { readonly ok: false; readonly error: FacilityLocationError } {
  return err({ code, message: FACILITY_LOCATION_ERROR_MESSAGES[code] });
}

export type FacilityLocationResult<T> = Result<T, FacilityLocationError>;
