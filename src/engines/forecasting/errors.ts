import { err, type Result } from '../shared/result';

/**
 * Помилки рушія прогнозування: невалідні вхідні дані для формул FC-01…FC-06
 * (docs/research/formula-baseline.md, розділ 2). Винятків немає — лише Result з кодом і повідомленням.
 */
export type ForecastingErrorCode = 'empty-series' | 'invalid-window' | 'length-mismatch' | 'invalid-weights' | 'invalid-alpha' | 'zero-actual';

export interface ForecastingError {
  readonly code: ForecastingErrorCode;
  readonly message: string;
}

export const FORECASTING_ERROR_MESSAGES: Readonly<Record<ForecastingErrorCode, string>> = {
  'empty-series': 'Ряд попиту не може бути порожнім.',
  'invalid-window': 'Розмір вікна ковзної середньої має бути цілим числом від 1 до кількості періодів ряду.',
  'length-mismatch': 'Кількість фактичних значень і прогнозів має збігатися.',
  'invalid-weights': 'Сума ваг зваженої ковзної середньої має дорівнювати 1, самі ваги — бути додатними й відповідати кількості періодів.',
  'invalid-alpha': 'Константа згладжування має бути в межах від 0 до 1 (не включно).',
  'zero-actual': 'Фактичний попит періоду не може дорівнювати нулю — похибку у відсотках порахувати неможливо.',
};

export function fail(code: ForecastingErrorCode): { readonly ok: false; readonly error: ForecastingError } {
  return err({ code, message: FORECASTING_ERROR_MESSAGES[code] });
}

export type ForecastingResult<T> = Result<T, ForecastingError>;
