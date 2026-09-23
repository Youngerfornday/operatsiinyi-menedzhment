/**
 * Тип варіанта задачі, який генератор віддає острову: не залежить від React чи схеми контенту,
 * щоб той самий варіант можна було відтворити і в SCORM-пакеті.
 */
export type SequencingMethod = 'fcfs' | 'spt' | 'edd';

/** Робота в черзі до сортування — вихідні дані задачі. */
export interface SequencingJob {
  readonly id: string;
  readonly label: string;
  readonly processingTime: number;
  readonly dueDate: number;
}

/** Та сама робота після розрахунку послідовності: коли вона завершується і наскільки запізнюється. */
export interface SequencedJob extends SequencingJob {
  readonly completionTime: number;
  readonly flowTime: number;
  /** max(0; завершення − строк) — рішення етапу 4, за Heizer. */
  readonly lateness: number;
}

export interface SequencingSummary {
  readonly order: readonly SequencedJob[];
  readonly averageFlowTime: number;
  /** Середнє по всіх роботах, включно з тими, що завершились без запізнення (lateness=0) — за Heizer. */
  readonly averageLateness: number;
  readonly maxLateness: number;
  /** SCH-04: сумарний час обробки / сумарний час проходження · 100 %. */
  readonly utilization: number;
}

export interface SequencingAnswerField {
  readonly id: string;
  readonly label: string;
  readonly unit: string;
  readonly expected: number;
  readonly tolerance: number;
}

export interface SequencingVariant {
  readonly variantId: string;
  readonly method: SequencingMethod;
  readonly prompt: string;
  /** Роботи в порядку надходження (черга до сортування) — для показу таблиці умови. */
  readonly jobs: readonly SequencingJob[];
  /** Правильна послідовність виконання (id робіт) для обраного правила. */
  readonly expectedOrder: readonly string[];
  readonly answers: readonly SequencingAnswerField[];
  /** Кроки розв’язку для розбору після перевірки. */
  readonly solution: readonly string[];
}
