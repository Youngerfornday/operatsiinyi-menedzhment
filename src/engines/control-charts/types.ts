export interface XbarRLimits {
  readonly centerXbar: number;
  readonly upperXbar: number;
  readonly lowerXbar: number;
  readonly centerRange: number;
  readonly upperRange: number;
  readonly lowerRange: number;
}

export interface PChartLimits {
  readonly center: number;
  readonly upper: number;
  /** Не може бути від’ємною (QC-02) — вже обрізана до 0. */
  readonly lower: number;
}

export type ControlChartMethod = 'xbar-r-chart' | 'p-chart';

/** Пункт вихідних даних задачі для показу у фабулі (як `ProductivityGivenItem` рушія продуктивності). */
export interface ControlChartGivenItem {
  readonly label: string;
  readonly value: string;
}

export interface ControlChartAnswerField {
  readonly id: string;
  readonly label: string;
  readonly unit: string;
  readonly expected: number;
  readonly tolerance: number;
}

/** Питання «чи є сигнал розладнання» з очікуваною відповіддю «так/ні» (`checkChoicePart`). */
export interface ControlChartSignalQuestion {
  readonly id: string;
  readonly label: string;
  readonly expected: boolean;
}

export interface ControlChartVariant {
  readonly variantId: string;
  readonly method: ControlChartMethod;
  readonly prompt: string;
  readonly given: readonly ControlChartGivenItem[];
  readonly answers: readonly ControlChartAnswerField[];
  readonly signal: ControlChartSignalQuestion;
  readonly solution: readonly string[];
}
