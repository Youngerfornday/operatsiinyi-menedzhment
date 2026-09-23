/**
 * Тип варіанта задачі, який генератор віддає острову: не залежить від React чи схеми контенту,
 * щоб той самий варіант можна було відтворити і в SCORM-пакеті.
 */
export type ForecastingMethod =
  | 'forecast-moving-average'
  | 'forecast-weighted-moving-average'
  | 'forecast-exponential-smoothing'
  | 'forecast-mad'
  | 'forecast-mse'
  | 'forecast-mape';

/** Пункт вихідних даних задачі для показу у фабулі («Попит, період 1» → «120 од.»). */
export interface ForecastingGivenItem {
  readonly label: string;
  readonly value: string;
}

/** Поле відповіді: студент вводить число, рушій звіряє з `expected` у межах `tolerance`. */
export interface ForecastingAnswerField {
  readonly id: string;
  readonly label: string;
  readonly unit: string;
  readonly expected: number;
  readonly tolerance: number;
}

export interface ForecastingVariant {
  readonly variantId: string;
  readonly method: ForecastingMethod;
  /** Формулювання задачі без чисел — числа показані окремо у `given`, щоб скрінрідер читав їх як дані, а не як прозу. */
  readonly prompt: string;
  readonly given: readonly ForecastingGivenItem[];
  readonly answers: readonly ForecastingAnswerField[];
  /** Кроки розв’язку для розбору після перевірки. */
  readonly solution: readonly string[];
}
