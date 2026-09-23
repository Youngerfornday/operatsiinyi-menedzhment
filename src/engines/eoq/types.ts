/**
 * Тип варіанта задачі, який генератор віддає острову: не залежить від React чи схеми контенту,
 * щоб той самий варіант можна було відтворити і в SCORM-пакеті.
 */
export type EoqMethod = 'eoq' | 'reorder-point' | 'cost-sensitivity';

/** Пункт вихідних даних задачі для показу у фабулі («Річний попит (D)» → «12 000 шт./рік»). */
export interface EoqGivenItem {
  readonly label: string;
  readonly value: string;
}

/** Поле відповіді: студент вводить число, рушій звіряє з `expected` у межах `tolerance`. */
export interface EoqAnswerField {
  readonly id: string;
  readonly label: string;
  readonly unit: string;
  readonly expected: number;
  readonly tolerance: number;
}

export interface EoqVariant {
  readonly variantId: string;
  readonly method: EoqMethod;
  /** Формулювання задачі без чисел — числа показані окремо у `given`, щоб скрінрідер читав їх як дані, а не як прозу. */
  readonly prompt: string;
  readonly given: readonly EoqGivenItem[];
  readonly answers: readonly EoqAnswerField[];
  /** Кроки розв’язку для розбору після перевірки. */
  readonly solution: readonly string[];
}
