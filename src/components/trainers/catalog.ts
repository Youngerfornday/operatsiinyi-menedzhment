/**
 * Каталог тренажерів і практичних на сайті: шляхи (без base — його додає сторінка через url()),
 * ID активностей прогресу (збігаються з BADGE_ACTIVITY_IDS рушія геймифікації) і зв’язок з реєстром
 * course.yaml → practicals[].trainers.
 */
import { BADGE_ACTIVITY_IDS } from '../../engines/gamification';
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

/** Практичні, сторінки яких уже опубліковано (`praktychni/pNN/`). */
export const PUBLISHED_PRACTICALS: readonly string[] = ['p01'];

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

export const PRODUCTIVITY_TRAINER = {
  practicalId: 'p01',
  registryId: 'productivity',
  activityId: BADGE_ACTIVITY_IDS.productivity,
  path: 'praktychni/p01/#trenazher',
  icon: 'calc',
  title: 'Продуктивність операційної системи',
  text: 'Розрахуйте часткову й багатофакторну продуктивність, індекс її зміни та використання й ефективність потужності. Кожен варіант — нові дані, перевірка одразу показує повний розв’язок.',
  formula: 'До 60 XP — по одному разу за кожен тип задачі',
} as const satisfies PracticalTrainer;

export const MATRIX_TRAINER = {
  practicalId: 'p02',
  registryId: 'priorities-matrix',
  activityId: matrixActivityId('p02'),
  path: 'praktychni/p02/#trenazher',
  icon: 'layers',
  title: 'Матриця операційних пріоритетів і рішень',
  text: 'Зіставте операційні пріоритети з рішеннями операційного менеджменту: перша спроба навчальна з розбором кожної клітинки, друга оцінюється за рубрикою.',
  formula: 'Не менше 90 % зіставлень — 2 бали',
} as const satisfies PracticalTrainer;

/** Тренажери, що живуть на сторінці практичної (а не на власній сторінці `trenazhery/<slug>/`). */
export const PRACTICAL_TRAINERS: readonly PracticalTrainer[] = [PRODUCTIVITY_TRAINER, MATRIX_TRAINER];

export interface HomeTrainerCard {
  readonly key: string;
  readonly path: string;
  readonly icon: string;
  readonly title: string;
  readonly text: string;
  readonly formula: string;
}

/**
 * Картки тренажерів для головної. Тренажер може жити і на власній сторінці, і всередині практичної —
 * для читача це однаково тренажер, тому головна показує обидва види; практичний потрапляє сюди,
 * лише коли його практичну опубліковано.
 */
export function homeTrainerCards(): readonly HomeTrainerCard[] {
  const standalone = CALCULATOR_TRAINERS.map(({ key, path, icon, title, text, formula }) => ({ key, path, icon, title, text, formula }));
  const onPracticals = PRACTICAL_TRAINERS.filter((trainer) => PUBLISHED_PRACTICALS.includes(trainer.practicalId)).map(
    ({ registryId, path, icon, title, text, formula }) => ({ key: registryId, path, icon, title, text, formula }),
  );
  return [...standalone, ...onPracticals];
}

/** Людські назви тренажерів з реєстру course.yaml. */
export const TRAINER_KIND_LABELS: Readonly<Record<string, string>> = {
  productivity: 'розрахункові задачі',
  'priorities-matrix': 'матриця зіставлення',
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
