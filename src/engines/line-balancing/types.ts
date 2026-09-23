/**
 * Тип варіанта задачі балансування потокової лінії: не залежить від React чи схеми контенту
 * (docs/research/formula-baseline.md, CAP-05, LB-01..04).
 */
export type LineBalancingMethod = 'line-balance';

/** Пункт вихідних даних задачі для показу у фабулі. */
export interface LineBalancingGivenItem {
  readonly label: string;
  readonly value: string;
}

/** Поле відповіді: студент вводить число, рушій звіряє з `expected` у межах `tolerance`. */
export interface LineBalancingAnswerField {
  readonly id: string;
  readonly label: string;
  readonly unit: string;
  readonly expected: number;
  readonly tolerance: number;
}

export interface LineBalancingVariant {
  readonly variantId: string;
  readonly method: LineBalancingMethod;
  /** Формулювання задачі без чисел — числа показані окремо у `given`. */
  readonly prompt: string;
  readonly given: readonly LineBalancingGivenItem[];
  readonly answers: readonly LineBalancingAnswerField[];
  /** Кроки розв’язку для розбору після перевірки, включно з розподілом операцій за станціями. */
  readonly solution: readonly string[];
}
