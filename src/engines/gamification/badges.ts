import type { ProgressState } from '../progress/state';

/**
 * ID тренажерів і кейсів, за якими видаються бейджі. Контент і UI-острови мають надсилати події
 * саме з цими ID (`trainer-completed` / `case-completed`).
 */
export const BADGE_ACTIVITY_IDS = {
  productivity: 'productivity',
  littleLaw: 'little-law',
  productionCycle: 'production-cycle',
  lineBalancing: 'line-balancing',
  forecasting: 'forecasting',
  eoq: 'eoq',
  mrp: 'mrp',
  aggregatePlanning: 'aggregate-planning',
  sequencing: 'sequencing',
  cpmPert: 'cpm-pert',
  controlCharts: 'control-charts',
  processCapability: 'process-capability',
} as const;

export interface BadgeDefinition {
  readonly id: string;
  readonly title: string;
  /** Умова в наказовому способі — для нездобутого бейджа («Пройдіть чекліст…»). */
  readonly condition: string;
  /** Опис здобутого бейджа в минулому часі («Пройшли чекліст…»). */
  readonly achievement: string;
  /** ID теми курсу, коли її вже призначено бейджу; null — бейдж поки без прив’язки до теми. */
  readonly topic: string | null;
  readonly isEarned: (state: ProgressState) => boolean;
}

/** Як і Moodle, вважаємо результат бездоганним, якщо він відрізняється від 1 менш ніж на 0,000001. */
const FLAWLESS = 0.999999;
const FORECAST_SCENARIOS = 3;
const TOPICS_FOR_READER = 5;

function flawless(activityId: string): (state: ProgressState) => boolean {
  return (state) => (state.activities[activityId]?.bestScore ?? 0) > FLAWLESS;
}

export const BADGES: readonly BadgeDefinition[] = Object.freeze([
  {
    id: 'produktyvnist-dilianky',
    title: 'Продуктивність дільниці',
    condition: 'Розрахуйте показник продуктивності операційної системи в тренажері без жодної помилки',
    achievement: 'Розрахували показник продуктивності операційної системи без жодної помилки',
    topic: 't01',
    isEarned: flawless(BADGE_ACTIVITY_IDS.productivity),
  },
  {
    id: 'zakon-littla',
    title: 'Закон Літтла',
    condition: 'Застосуйте закон Літтла (L = λW), щоб визначити незавершене виробництво',
    achievement: 'Застосували закон Літтла, щоб визначити незавершене виробництво',
    topic: null,
    isEarned: flawless(BADGE_ACTIVITY_IDS.littleLaw),
  },
  {
    id: 'tsykl-vyrobnytstva',
    title: 'Цикл виробництва',
    condition: 'Розрахуйте тривалість виробничого циклу без помилок',
    achievement: 'Розрахували тривалість виробничого циклу без помилок',
    topic: null,
    isEarned: flawless(BADGE_ACTIVITY_IDS.productionCycle),
  },
  {
    id: 'liniia-zbalansovana',
    title: 'Лінія збалансована',
    condition: 'Збалансуйте потокову лінію за часом такту без втрат ефективності',
    achievement: 'Збалансували потокову лінію за часом такту без втрат ефективності',
    topic: null,
    isEarned: flawless(BADGE_ACTIVITY_IDS.lineBalancing),
  },
  {
    id: 'prohnoz-spravdyvsia',
    title: 'Прогноз справдився',
    condition: 'Побудуйте прогноз попиту й розрахуйте похибку для трьох різних наборів даних',
    achievement: 'Побудували прогноз попиту й розрахували похибку для трьох різних наборів даних',
    topic: null,
    isEarned: (state) => (state.activities[BADGE_ACTIVITY_IDS.forecasting]?.solvedVariants?.length ?? 0) >= FORECAST_SCENARIOS,
  },
  {
    id: 'optymalna-partiia',
    title: 'Оптимальна партія',
    condition: 'Розрахуйте економічний розмір замовлення (EOQ) без помилок',
    achievement: 'Розрахували економічний розмір замовлення (EOQ) без помилок',
    topic: null,
    isEarned: flawless(BADGE_ACTIVITY_IDS.eoq),
  },
  {
    id: 'potreba-splanovana',
    title: 'Потреба спланована',
    condition: 'Складіть план потреби в матеріалах (MRP) без помилок',
    achievement: 'Склали план потреби в матеріалах (MRP) без помилок',
    topic: null,
    isEarned: flawless(BADGE_ACTIVITY_IDS.mrp),
  },
  {
    id: 'ahrehatnyi-plan',
    title: 'Агрегатний план',
    condition: 'Складіть агрегатний план виробництва з мінімальними витратами',
    achievement: 'Склали агрегатний план виробництва з мінімальними витратами',
    topic: null,
    isEarned: flawless(BADGE_ACTIVITY_IDS.aggregatePlanning),
  },
  {
    id: 'cherha-bez-prostoiv',
    title: 'Черга без простоїв',
    condition: 'Визначте оптимальну послідовність запуску завдань без помилок',
    achievement: 'Визначили оптимальну послідовність запуску завдань без помилок',
    topic: null,
    isEarned: flawless(BADGE_ACTIVITY_IDS.sequencing),
  },
  {
    id: 'krytychnyi-shliakh',
    title: 'Критичний шлях',
    condition: 'Побудуйте мережевий графік і знайдіть критичний шлях без помилок',
    achievement: 'Побудували мережевий графік і знайшли критичний шлях без помилок',
    topic: null,
    isEarned: flawless(BADGE_ACTIVITY_IDS.cpmPert),
  },
  {
    id: 'protses-pid-kontrolem',
    title: 'Процес під контролем',
    condition: 'Побудуйте контрольну карту і правильно визначте, чи процес керований',
    achievement: 'Побудували контрольну карту і правильно визначили, чи процес керований',
    topic: null,
    isEarned: flawless(BADGE_ACTIVITY_IDS.controlCharts),
  },
  {
    id: 'zdatnist-protsesu',
    title: 'Здатність процесу',
    condition: 'Розрахуйте індекси Cp і Cpk без помилок',
    achievement: 'Розрахували індекси Cp і Cpk без помилок',
    topic: null,
    isEarned: flawless(BADGE_ACTIVITY_IDS.processCapability),
  },
  {
    id: 'uvazhnyi-chytach',
    title: 'Уважний читач',
    condition: 'Прочитайте п’ять тем до кінця разом із джерелами',
    achievement: 'Прочитали п’ять тем до кінця разом із джерелами',
    topic: null,
    isEarned: (state) => Object.values(state.topics).filter((topic) => topic.status === 'completed').length >= TOPICS_FOR_READER,
  },
]);

/** ID усіх бейджів, умови яких виконано в стані (незалежно від того, чи їх уже видано). */
export function earnedBadgeIds(state: ProgressState): string[] {
  return BADGES.filter((badge) => badge.isEarned(state)).map((badge) => badge.id);
}

export function findBadge(id: string): BadgeDefinition | undefined {
  return BADGES.find((badge) => badge.id === id);
}
