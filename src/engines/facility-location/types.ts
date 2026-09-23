/**
 * Тип варіанта задачі вибору місця розташування: не залежить від React чи схеми контенту, щоб той
 * самий варіант можна було відтворити і в SCORM-пакеті (docs/research/formula-baseline.md, LOC-01, LOC-02).
 */
export type FacilityLocationMethod = 'factor-rating' | 'center-of-gravity';

/** Пункт вихідних даних задачі для показу у фабулі («Вага фактора «Робоча сила»» → «0,35»). */
export interface FacilityLocationGivenItem {
  readonly label: string;
  readonly value: string;
}

/** Поле відповіді: студент вводить число, рушій звіряє з `expected` у межах `tolerance`. */
export interface FacilityLocationAnswerField {
  readonly id: string;
  readonly label: string;
  readonly unit: string;
  readonly expected: number;
  readonly tolerance: number;
}

/**
 * Поле вибору «який варіант кращий» (лише для `factor-rating`): рушій гарантує, що бали двох
 * майданчиків завжди різні, тож відповідь однозначна — «нічия» варіанту не буває.
 */
export interface FacilityLocationChoiceField {
  readonly id: string;
  readonly label: string;
  readonly yes: string;
  readonly no: string;
  readonly expected: boolean;
}

export interface FacilityLocationVariant {
  readonly variantId: string;
  readonly method: FacilityLocationMethod;
  /** Формулювання задачі без чисел — числа показані окремо у `given`. */
  readonly prompt: string;
  readonly given: readonly FacilityLocationGivenItem[];
  readonly answers: readonly FacilityLocationAnswerField[];
  /** Присутнє лише для `factor-rating` — `center-of-gravity` не порівнює варіанти. */
  readonly choice?: FacilityLocationChoiceField;
  /** Кроки розв’язку для розбору після перевірки. */
  readonly solution: readonly string[];
}
