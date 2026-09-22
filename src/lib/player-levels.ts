/**
 * Кар'єрні рівні гравця для статичних заготовок (чип у шапці, сходинки на головній).
 * Єдине джерело правди — LEVELS у рушії геймифікації: статичні елементи гідруються
 * за data-level-id тими самими ідентифікаторами, тож дублювати список тут не можна.
 */
import { LEVELS } from '../engines/gamification/levels';

export interface PlayerLevel {
  readonly id: string;
  readonly title: string;
  readonly minXp: number;
}

export const PLAYER_LEVELS: readonly PlayerLevel[] = LEVELS.map(({ id, title, minXp }) => ({ id, title, minXp }));

export const INITIAL_LEVEL = PLAYER_LEVELS[0] as PlayerLevel;

const xpFormat = new Intl.NumberFormat('uk-UA');

export function formatXp(xp: number): string {
  return `${xpFormat.format(xp)} XP`;
}
