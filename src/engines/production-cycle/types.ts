/**
 * Тип варіанта задачі для тривалості виробничого циклу (docs/research/formula-baseline.md, коди
 * PC-01, PC-02, PC-03): не залежить від React чи схеми контенту, щоб той самий варіант можна було
 * відтворити і в SCORM-пакеті.
 */
export type ProductionCycleMethod = 'production-cycle';

/** Операція технологічного маршруту: норма часу ti і кількість робочих місць Ci на цій операції. */
export interface CycleOperation {
  readonly time: number;
  readonly workplaces: number;
}

/** Пункт вихідних даних задачі для показу у фабулі («Норма часу, операція 1» → «2 хв»). */
export interface ProductionCycleGivenItem {
  readonly label: string;
  readonly value: string;
}

/** Поле відповіді: студент вводить число, рушій звіряє з `expected` у межах `tolerance`. */
export interface ProductionCycleAnswerField {
  readonly id: string;
  readonly label: string;
  readonly unit: string;
  readonly expected: number;
  readonly tolerance: number;
}

export interface ProductionCycleVariant {
  readonly variantId: string;
  readonly method: ProductionCycleMethod;
  readonly prompt: string;
  readonly given: readonly ProductionCycleGivenItem[];
  readonly answers: readonly ProductionCycleAnswerField[];
  readonly solution: readonly string[];
}
