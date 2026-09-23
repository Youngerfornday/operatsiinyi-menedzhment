export type ProcessCapabilityMethod = 'process-capability';

/** Пункт вихідних даних задачі для показу у фабулі (як `ProductivityGivenItem` рушія продуктивності). */
export interface ProcessCapabilityGivenItem {
  readonly label: string;
  readonly value: string;
}

export interface ProcessCapabilityAnswerField {
  readonly id: string;
  readonly label: string;
  readonly unit: string;
  readonly expected: number;
  readonly tolerance: number;
}

/** Питання «так/ні» з очікуваною відповіддю (`checkChoicePart`) — без порогів придатності (1,0, 1,33 тощо). */
export interface ProcessCapabilitySignalQuestion {
  readonly id: string;
  readonly label: string;
  readonly expected: boolean;
}

export interface ProcessCapabilityVariant {
  readonly variantId: string;
  readonly method: ProcessCapabilityMethod;
  readonly prompt: string;
  readonly given: readonly ProcessCapabilityGivenItem[];
  readonly answers: readonly ProcessCapabilityAnswerField[];
  /** «Процес не центрований (Cpk < Cp)?» — порівняння двох щойно розрахованих індексів, без зовнішніх порогів. */
  readonly notCentered: ProcessCapabilitySignalQuestion;
  readonly solution: readonly string[];
}
