/**
 * Розкладка сторінки практичної за видом тренажера: розділи змісту, чип XP у шапці й речення про
 * обсяг тренажера в умові. Чисті функції — сторінка лише підставляє числа зі свого файлу даних.
 */
import { pluralUk } from '../../lib/plural';

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

export function practicalSections(kind: PracticalTrainerKind): readonly PracticalSection[] {
  return [...COMMON_HEAD, ...TRAINER_SECTIONS[kind], ...COMMON_TAIL, DATA_SECTION[kind]];
}

export function practicalXpChip(kind: PracticalTrainerKind): string {
  return kind === 'matching-matrix' ? 'до 60 XP за матрицю' : 'до 60 XP за задачі тренажера';
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

const TASK_TYPE_FORMS = { one: 'тип задачі', few: 'типи задач', many: 'типів задач', other: 'типу задачі' } as const;

export function calculationConditionNote(taskCount: number): string {
  return `У тренажері — ${pluralUk(taskCount, TASK_TYPE_FORMS)} за формулами нижче. Кожен варіант дає нові дані; перевірка одразу показує повний розв’язок. Спроб необмежено, бал за критерієм рубрики визначає викладач за поданим розв’язком.`;
}
