/**
 * Тип варіанта задачі, який генератор віддає острову: не залежить від React чи схеми контенту,
 * щоб той самий варіант можна було відтворити і в SCORM-пакеті.
 */
export type ProductivityMethod = 'partial-productivity' | 'multifactor-productivity' | 'productivity-index' | 'capacity-usage' | 'capacity-efficiency';

/** Пункт вихідних даних задачі для показу у фабулі («Випуск» → «12 000 виробів»). */
export interface ProductivityGivenItem {
  readonly label: string;
  readonly value: string;
}

/** Поле відповіді: студент вводить число, рушій звіряє з `expected` у межах `tolerance`. */
export interface ProductivityAnswerField {
  readonly id: string;
  readonly label: string;
  readonly unit: string;
  readonly expected: number;
  readonly tolerance: number;
}

export interface ProductivityVariant {
  readonly variantId: string;
  readonly method: ProductivityMethod;
  /** Лише для `partial-productivity`: який ресурс у знаменнику (як у `content/practicals/p01.yaml` → `trainer.tasks[].resource`). */
  readonly resource?: string;
  /** Формулювання задачі без чисел — числа показані окремо у `given`, щоб скрінрідер читав їх як дані, а не як прозу. */
  readonly prompt: string;
  readonly given: readonly ProductivityGivenItem[];
  readonly answers: readonly ProductivityAnswerField[];
  /** Кроки розв’язку для розбору після перевірки. */
  readonly solution: readonly string[];
}
