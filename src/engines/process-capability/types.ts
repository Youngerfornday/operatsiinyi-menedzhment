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

export interface ProcessCapabilityVariant {
  readonly variantId: string;
  readonly method: ProcessCapabilityMethod;
  readonly prompt: string;
  readonly given: readonly ProcessCapabilityGivenItem[];
  readonly answers: readonly ProcessCapabilityAnswerField[];
  readonly solution: readonly string[];
}
