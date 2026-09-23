/**
 * Розкладка сторінки практичної за видом тренажера: розділи змісту, чип XP у шапці й речення про
 * обсяг тренажера в умові. Чисті функції — сторінка лише підставляє числа зі свого файлу даних.
 */

export type PracticalTrainerKind = 'matching-matrix' | 'calculation-tasks';

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
  'matching-matrix': [
    { id: 'trenazher', label: 'Тренажер-матриця' },
    { id: 'kompanii', label: 'Визначте модель компанії' },
  ],
  'calculation-tasks': [{ id: 'trenazher', label: 'Тренажер: розрахункові задачі' }],
};

const DATA_SECTION: Readonly<Record<PracticalTrainerKind, PracticalSection>> = {
  'matching-matrix': { id: 'dani', label: 'Дані, формули й джерела' },
  'calculation-tasks': { id: 'dani', label: 'Дані, формули й джерела' },
};

/**
 * Практична з калькулятором може мати кілька тренажерів на одній сторінці (наприклад, p03 — закон
 * Літтла й тривалість циклу): кожен отримує власний якір і пункт змісту. Без параметра — стара поведінка
 * (один спільний якір `trenazher`), тож практичні з одним тренажером (p01) не змінюються.
 */
export function practicalSections(kind: PracticalTrainerKind, calculatorTrainers?: readonly PracticalSection[]): readonly PracticalSection[] {
  const trainerSections = kind === 'calculation-tasks' && calculatorTrainers && calculatorTrainers.length > 0 ? calculatorTrainers : TRAINER_SECTIONS[kind];
  return [...COMMON_HEAD, ...trainerSections, ...COMMON_TAIL, DATA_SECTION[kind]];
}

export function practicalXpChip(kind: PracticalTrainerKind, trainerCount = 1): string {
  if (kind === 'matching-matrix') return 'до 60 XP за матрицю';
  const max = 60 * Math.max(1, trainerCount);
  return `до ${max} XP за задачі тренажера`;
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

export function calculationConditionNote(taskCount: number): string {
  return `У тренажері — ${taskCount} типів задач за формулами нижче. Кожен варіант дає нові дані; перевірка одразу показує повний розв’язок. Спроб необмежено, бал за критерієм рубрики визначає викладач за поданим розв’язком.`;
}
