/**
 * Тип варіанта задачі нормування праці: не залежить від React чи схеми контенту
 * (docs/research/formula-baseline.md, WM-01..04).
 */
export type WorkMeasurementMethod = 'time-standard';

/** Пункт вихідних даних задачі для показу у фабулі. */
export interface WorkMeasurementGivenItem {
  readonly label: string;
  readonly value: string;
}

/** Поле відповіді: студент вводить число, рушій звіряє з `expected` у межах `tolerance`. */
export interface WorkMeasurementAnswerField {
  readonly id: string;
  readonly label: string;
  readonly unit: string;
  readonly expected: number;
  readonly tolerance: number;
}

export interface WorkMeasurementVariant {
  readonly variantId: string;
  readonly method: WorkMeasurementMethod;
  /** Формулювання задачі без чисел — числа показані окремо у `given`. */
  readonly prompt: string;
  readonly given: readonly WorkMeasurementGivenItem[];
  readonly answers: readonly WorkMeasurementAnswerField[];
  /** Кроки розв’язку для розбору після перевірки. */
  readonly solution: readonly string[];
}
