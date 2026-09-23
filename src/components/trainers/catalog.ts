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
export const PUBLISHED_PRACTICALS: readonly string[] = ['p01', 'p02', 'p04', 'p05'];

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
  formula: '60 XP — за перший правильно розв’язаний варіант',
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

export const FACILITY_LOCATION_TRAINER = {
  practicalId: 'p04',
  registryId: 'facility-location',
  activityId: BADGE_ACTIVITY_IDS.facilityLocation,
  path: 'praktychni/p04/#trenazher-facility-location',
  icon: 'target',
  title: 'Вибір місця розташування',
  text: 'Оберіть майданчик методом вагових коефіцієнтів і перевірте результат методом центру ваги. Кожен варіант — нові дані, перевірка одразу показує повний розв’язок.',
  formula: '60 XP — за перший правильно розв’язаний варіант',
} as const satisfies PracticalTrainer;

export const LINE_BALANCING_TRAINER = {
  practicalId: 'p04',
  registryId: 'line-balancing',
  activityId: BADGE_ACTIVITY_IDS.lineBalancing,
  path: 'praktychni/p04/#trenazher-line-balancing',
  icon: 'layers',
  title: 'Балансування потокової лінії',
  text: 'Визначте такт лінії, мінімальну й фактичну кількість робочих станцій та ефективність балансування за правилом найбільшої кількості наступних завдань.',
  formula: '60 XP — за перший правильно розв’язаний варіант',
} as const satisfies PracticalTrainer;

export const WORK_MEASUREMENT_TRAINER = {
  practicalId: 'p04',
  registryId: 'work-measurement',
  activityId: BADGE_ACTIVITY_IDS.workMeasurement,
  path: 'praktychni/p04/#trenazher-work-measurement',
  icon: 'clock',
  title: 'Нормування праці',
  text: 'За хронометражними даними розрахуйте штучний і штучно-калькуляційний час та норму виробітку за зміну.',
  formula: '60 XP — за перший правильно розв’язаний варіант',
} as const satisfies PracticalTrainer;

export const FORECASTING_TRAINER = {
  practicalId: 'p05',
  registryId: 'forecasting',
  activityId: BADGE_ACTIVITY_IDS.forecasting,
  path: 'praktychni/p05/#trenazher-forecasting',
  icon: 'flag',
  title: 'Прогнозування попиту',
  text: 'Розрахуйте прогноз попиту простою й зваженою ковзною середньою та експоненційним згладжуванням, оцініть точність через MAD, MSE і MAPE. Кожен варіант — нові дані, перевірка одразу показує повний розв’язок.',
  formula: '60 XP — за перший правильно розв’язаний варіант',
} as const satisfies PracticalTrainer;

export const AGGREGATE_PLANNING_TRAINER = {
  practicalId: 'p05',
  registryId: 'aggregate-planning',
  activityId: BADGE_ACTIVITY_IDS.aggregatePlanning,
  path: 'praktychni/p05/#trenazher-aggregate-planning',
  icon: 'list',
  title: 'Агрегатне планування',
  text: 'Складіть агрегатний план на шість періодів за стратегією погоні за попитом і за стратегією рівномірного виробництва та порівняйте їх за сумарними витратами (регулярна оплата, найм, звільнення, зберігання запасу, дефіцит).',
  formula: '60 XP — за перший правильно розв’язаний варіант',
} as const satisfies PracticalTrainer;

/** Тренажери, що живуть на сторінці практичної (а не на власній сторінці `trenazhery/<slug>/`). */
export const PRACTICAL_TRAINERS: readonly PracticalTrainer[] = [
  PRODUCTIVITY_TRAINER,
  MATRIX_TRAINER,
  FACILITY_LOCATION_TRAINER,
  LINE_BALANCING_TRAINER,
  WORK_MEASUREMENT_TRAINER,
  FORECASTING_TRAINER,
  AGGREGATE_PLANNING_TRAINER,
];

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
  'facility-location': 'розрахункові задачі',
  'line-balancing': 'розрахункові задачі',
  'work-measurement': 'розрахункові задачі',
  forecasting: 'розрахункові задачі',
  'aggregate-planning': 'розрахункові задачі',
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
