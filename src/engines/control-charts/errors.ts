import { err, type Result } from '../shared/result';

/**
 * Помилки рушія контрольних карт: x̄-R (кількісна ознака) і p (частка невідповідних)
 * (docs/research/formula-baseline.md, розділ 8, коди QC-01, QC-02). Винятків немає — лише Result з кодом.
 */
export type ControlChartErrorCode = 'non-positive-subgroup-size' | 'unsupported-subgroup-size' | 'negative-range' | 'invalid-proportion';

export interface ControlChartError {
  readonly code: ControlChartErrorCode;
  readonly message: string;
}

export const CONTROL_CHART_ERROR_MESSAGES: Readonly<Record<ControlChartErrorCode, string>> = {
  'non-positive-subgroup-size': 'Розмір підгрупи має бути більшим за нуль.',
  'unsupported-subgroup-size': 'Для цього розміру підгрупи немає табличних констант A2, D3, D4 стандартної таблиці SPC.',
  'negative-range': 'Середній розмах не може бути від’ємним.',
  'invalid-proportion': 'Частка дефектних одиниць має бути в межах від 0 до 1.',
};

export function fail(code: ControlChartErrorCode): { readonly ok: false; readonly error: ControlChartError } {
  return err({ code, message: CONTROL_CHART_ERROR_MESSAGES[code] });
}

export type ControlChartResult<T> = Result<T, ControlChartError>;
