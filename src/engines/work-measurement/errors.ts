import { err, type Result } from '../shared/result';

/**
 * Помилки рушія нормування праці: невалідні вхідні дані для оперативного часу (WM-01), штучного
 * часу (WM-02), штучно-калькуляційного часу (WM-03) і норми виробітку (WM-04) —
 * docs/research/formula-baseline.md. Винятків немає — лише Result з кодом і повідомленням.
 */
export type WorkMeasurementErrorCode = 'negative-value' | 'non-positive-value' | 'non-positive-denominator' | 'share-too-large';

export interface WorkMeasurementError {
  readonly code: WorkMeasurementErrorCode;
  readonly message: string;
}

export const WORK_MEASUREMENT_ERROR_MESSAGES: Readonly<Record<WorkMeasurementErrorCode, string>> = {
  'negative-value': 'Складові часу операції не можуть бути від’ємними.',
  'non-positive-value': 'Оперативний і штучний час мають бути більшими за нуль.',
  'non-positive-denominator': 'Розмір партії й змінний фонд робочого часу мають бути більшими за нуль.',
  'share-too-large': 'Сума часток на обслуговування й відпочинок має бути меншою за 100% оперативного часу.',
};

export function fail(code: WorkMeasurementErrorCode): { readonly ok: false; readonly error: WorkMeasurementError } {
  return err({ code, message: WORK_MEASUREMENT_ERROR_MESSAGES[code] });
}

export type WorkMeasurementResult<T> = Result<T, WorkMeasurementError>;
