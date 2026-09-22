/**
 * Кар’єрні рівні курсу (DESIGN.md, макет профілю): поріг XP і що відкриває рівень.
 * Єдине джерело правди для рівнів: src/lib/player-levels.ts будує статичні заготовки з цього списку.
 */
export interface Level {
  readonly id: string;
  readonly title: string;
  readonly minXp: number;
  readonly unlocks: string;
}

export const LEVELS: readonly Level[] = Object.freeze([
  { id: 'floor-intern', title: 'Стажист дільниці', minXp: 0, unlocks: 'Читання тем, флеш-картки, самоперевірка' },
  { id: 'shift-foreman', title: 'Майстер зміни', minXp: 500, unlocks: 'Тренувальні тести з розбором, калькулятори' },
  { id: 'section-chief', title: 'Начальник дільниці', minXp: 1200, unlocks: 'Кейс-гра з виробничими рішеннями' },
  { id: 'production-manager', title: 'Начальник виробництва', minXp: 2200, unlocks: 'Аукціон розподілу потужностей, поглиблені кейси' },
  { id: 'operations-director', title: 'Директор з операцій', minXp: 3400, unlocks: 'Підсумковий аудит операційної системи компанії на вибір' },
]);

export interface LevelProgress {
  readonly level: Level;
  /** Номер рівня з 1 — для «Ваш рівень — 2 із 5». */
  readonly position: number;
  readonly total: number;
  readonly next: Level | null;
  readonly xpIntoLevel: number;
  readonly xpForNextLevel: number;
  readonly xpRemaining: number;
  /** 0..1 — заповнення метра до наступного рівня. */
  readonly ratio: number;
}

function levelIndex(xp: number): number {
  const safeXp = Number.isFinite(xp) ? Math.max(xp, 0) : 0;
  return LEVELS.reduce((found, level, index) => (safeXp >= level.minXp ? index : found), 0);
}

export function levelForXp(xp: number): Level {
  return LEVELS[levelIndex(xp)] as Level;
}

export function levelProgress(xp: number): LevelProgress {
  const index = levelIndex(xp);
  const level = LEVELS[index] as Level;
  const next = LEVELS[index + 1] ?? null;
  const safeXp = Number.isFinite(xp) ? Math.max(xp, 0) : 0;
  const xpIntoLevel = safeXp - level.minXp;
  const xpForNextLevel = next ? next.minXp - level.minXp : 0;
  return {
    level,
    position: index + 1,
    total: LEVELS.length,
    next,
    xpIntoLevel,
    xpForNextLevel,
    xpRemaining: next ? next.minXp - safeXp : 0,
    ratio: next ? xpIntoLevel / xpForNextLevel : 1,
  };
}
