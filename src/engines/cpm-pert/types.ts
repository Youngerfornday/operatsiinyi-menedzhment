/** Робота мережі: код, тривалість і безпосередні попередники (за кодами). */
export interface Activity {
  readonly id: string;
  readonly duration: number;
  readonly predecessors: readonly string[];
}

/** Розклад однієї роботи після прямого й зворотного проходу (PRJ-01..03, PRJ-09). */
export interface ActivitySchedule {
  readonly id: string;
  readonly duration: number;
  readonly earlyStart: number;
  readonly earlyFinish: number;
  readonly lateStart: number;
  readonly lateFinish: number;
  /** Повний резерв: LS − ES (PRJ-03). */
  readonly totalFloat: number;
  /** Вільний резерв: min(ES наступників) − EF, для кінцевої роботи — тривалість проекту − EF (PRJ-09). */
  readonly freeFloat: number;
  /** Резерв 0 (PRJ-04). */
  readonly isCritical: boolean;
}

export interface NetworkResult {
  readonly activities: readonly ActivitySchedule[];
  readonly projectDuration: number;
  /** Коди робіт критичного шляху в порядку виконання. */
  readonly criticalPath: readonly string[];
}

/** Три оцінки тривалості роботи методом PERT: оптимістична, найімовірніша, песимістична (PRJ-05, PRJ-06). */
export interface PertEstimate {
  readonly id: string;
  readonly optimistic: number;
  readonly mostLikely: number;
  readonly pessimistic: number;
  readonly predecessors: readonly string[];
}

export interface PertActivityResult {
  readonly id: string;
  readonly expectedTime: number;
  readonly variance: number;
}

export interface PertProjectResult {
  readonly activities: readonly PertActivityResult[];
  readonly network: NetworkResult;
  /** Очікувана тривалість проекту — сума te робіт критичного шляху (TE). */
  readonly expectedDuration: number;
  /** Дисперсія проекту — сума дисперсій лише робіт критичного шляху. */
  readonly variance: number;
  readonly sigma: number;
}

export type CpmPertMethod = 'cpm-critical-path' | 'pert-probability';

/** Пункт вихідних даних задачі для показу у фабулі (як `ProductivityGivenItem` рушія продуктивності). */
export interface CpmPertGivenItem {
  readonly label: string;
  readonly value: string;
}

export interface CpmPertAnswerField {
  readonly id: string;
  readonly label: string;
  readonly unit: string;
  readonly expected: number;
  readonly tolerance: number;
}

export interface CpmPertVariant {
  readonly variantId: string;
  readonly method: CpmPertMethod;
  readonly prompt: string;
  readonly given: readonly CpmPertGivenItem[];
  readonly answers: readonly CpmPertAnswerField[];
  readonly solution: readonly string[];
}
