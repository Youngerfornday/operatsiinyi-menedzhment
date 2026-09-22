/**
 * Каталог тренажерів і практичних на сайті: шляхи (без base — його додає сторінка через url()),
 * ID активностей прогресу (збігаються з BADGE_ACTIVITY_IDS рушія геймифікації) і зв’язок з реєстром
 * course.yaml → practicals[].trainers.
 */
import { matrixActivityId } from '../../engines/matrix';

export interface CalculatorTrainer {
  readonly key: string;
  readonly slug: string;
  readonly path: string;
  readonly activityId: string;
  readonly practicalId: string;
  /** ID тренажера в реєстрі course.yaml (practicals[].trainers). */
  readonly registryId: string;
  /** Бейдж рушія геймифікації, який дає цей тренажер. */
  readonly badgeId: string;
  readonly icon: string;
  readonly title: string;
  readonly text: string;
  readonly formula: string;
}

/**
 * Тренажери-калькулятори з власною сторінкою `trenazhery/<slug>/`. Порожньо, доки не додано перший
 * калькулятор дисципліни (прогнозування, EOQ, MRP тощо) — див. src/engines/README.md.
 */
export const CALCULATOR_TRAINERS: readonly CalculatorTrainer[] = [];

/** Практичні, сторінки яких уже опубліковано (`praktychni/pNN/`). Порожньо, доки контент не готовий. */
export const PUBLISHED_PRACTICALS: readonly string[] = [];

export interface PracticalTrainer {
  readonly practicalId: string;
  readonly registryId: string;
  readonly activityId: string;
  /** Шлях без base — його додає сторінка через url(). */
  readonly path: string;
  readonly icon: string;
  readonly title: string;
  readonly text: string;
  readonly formula: string;
}

export const MATRIX_TRAINER = {
  practicalId: 'p01',
  registryId: 'model-matrix',
  activityId: matrixActivityId('p01'),
  path: 'praktychni/p01/#trenazher',
  icon: 'layers',
  title: 'Матриця моделей операційного менеджменту',
  text: 'Зіставте формулювання ознак з чотирма моделями: перша спроба навчальна з розбором кожної клітинки, друга оцінюється за рубрикою.',
  formula: 'Не менше 90 % зіставлень — 1 бал',
} as const satisfies PracticalTrainer;

/** Тренажери, що живуть на сторінці практичної (а не на власній сторінці `trenazhery/<slug>/`). */
export const PRACTICAL_TRAINERS: readonly PracticalTrainer[] = [MATRIX_TRAINER];

/** Людські назви тренажерів з реєстру course.yaml. */
export const TRAINER_KIND_LABELS: Readonly<Record<string, string>> = {
  'model-matrix': 'матриця моделей (зіставлення)',
};

export function trainerKindLabel(registryId: string): string {
  return Object.hasOwn(TRAINER_KIND_LABELS, registryId) ? (TRAINER_KIND_LABELS[registryId] ?? registryId) : registryId;
}

export interface PublishedTrainerLink {
  readonly registryId: string;
  readonly path: string;
  readonly title: string;
  readonly activityId: string;
}

/** Опубліковані тренажери за ID реєстру (без base). */
export function publishedTrainer(registryId: string): PublishedTrainerLink | null {
  const onPractical = PRACTICAL_TRAINERS.find((trainer) => trainer.registryId === registryId);
  if (onPractical) return { registryId, path: onPractical.path, title: onPractical.title, activityId: onPractical.activityId };
  const calculator = CALCULATOR_TRAINERS.find((trainer) => trainer.registryId === registryId);
  return calculator ? { registryId, path: calculator.path, title: calculator.title, activityId: calculator.activityId } : null;
}

export interface PracticalRef {
  readonly id: string;
  readonly topics: readonly string[];
  readonly trainers: readonly string[];
}

/** ID активностей опублікованих тренажерів практичних, до яких належить тема (для карти проходження). */
export function topicTrainerActivityIds(practicals: readonly PracticalRef[], topicId: string): string[] {
  const ids = practicals
    .filter((practical) => practical.topics.includes(topicId))
    .flatMap((practical) => practical.trainers)
    .map((registryId) => publishedTrainer(registryId)?.activityId)
    .filter((id): id is string => id !== undefined);
  return [...new Set(ids)];
}

export function practicalPath(practicalId: string): string {
  return `praktychni/${practicalId}/`;
}

/** «П1» з p01. */
export function practicalLabel(practicalId: string): string {
  return `П${Number.parseInt(practicalId.replace(/^p/, ''), 10)}`;
}
