/**
 * Розкладка сторінки практичної за видом тренажера: розділи змісту, чип XP у шапці й речення про
 * обсяг тренажера в умові. Чисті функції — сторінка лише підставляє числа зі свого файлу даних.
 */

export type PracticalTrainerKind = 'model-matrix';

export interface PracticalSection {
  readonly id: string;
  readonly label: string;
}

const COMMON_HEAD: readonly PracticalSection[] = [
  { id: 'meta', label: 'Мета і результати' },
  { id: 'umova', label: 'Умова' },
];

const COMMON_TAIL: readonly PracticalSection[] = [
  { id: 'ese', label: 'Есе' },
  { id: 'rubryka', label: 'Рубрика' },
];

const TRAINER_SECTIONS: Readonly<Record<PracticalTrainerKind, readonly PracticalSection[]>> = {
  'model-matrix': [
    { id: 'trenazher', label: 'Тренажер-матриця' },
    { id: 'kompanii', label: 'Визначте модель компанії' },
  ],
};

const DATA_SECTION: Readonly<Record<PracticalTrainerKind, PracticalSection>> = {
  'model-matrix': { id: 'dani', label: 'Моделі, дані й джерела' },
};

export function practicalSections(kind: PracticalTrainerKind): readonly PracticalSection[] {
  return [...COMMON_HEAD, ...TRAINER_SECTIONS[kind], ...COMMON_TAIL, DATA_SECTION[kind]];
}

export function practicalXpChip(kind: PracticalTrainerKind): string {
  return kind === 'model-matrix' ? 'до 60 XP за матрицю' : 'до 60 XP за задачі тренажера';
}

export interface MatrixNoteInput {
  readonly features: number;
  readonly models: number;
  readonly cells: number;
  readonly rubricTitle: string;
}

export function matrixConditionNote({ features, models, cells, rubricTitle }: MatrixNoteInput): string {
  return `У тренажері — ${features} ознак × ${models} моделі = ${cells} формулювань. Перша спроба навчальна, оцінюється друга: бал за критерієм «${rubricTitle}» рубрики нижче.`;
}
