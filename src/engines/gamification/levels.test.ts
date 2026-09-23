import { describe, expect, it } from 'vitest';
import { LEVELS, levelForXp, levelProgress } from './levels';

describe('LEVELS', () => {
  it('follows the operations-management career ladder and thresholds from DESIGN.md', () => {
    expect(LEVELS.map((level) => [level.title, level.minXp])).toEqual([
      ['Стажист дільниці', 0],
      ['Майстер зміни', 500],
      ['Начальник дільниці', 1200],
      ['Начальник виробництва', 2200],
      ['Директор з операцій', 3400],
    ]);
    expect(LEVELS.map((level) => level.id)).toEqual(['floor-intern', 'shift-foreman', 'section-chief', 'production-manager', 'operations-director']);
  });
});

describe('levelForXp', () => {
  it.each([
    [0, 'Стажист дільниці'],
    [499, 'Стажист дільниці'],
    [500, 'Майстер зміни'],
    [1199, 'Майстер зміни'],
    [1200, 'Начальник дільниці'],
    [2200, 'Начальник виробництва'],
    [3400, 'Директор з операцій'],
    [99_999, 'Директор з операцій'],
  ])('%i XP → %s', (xp, title) => {
    expect(levelForXp(xp).title).toBe(title);
  });

  it('treats negative or broken XP as zero', () => {
    expect(levelForXp(-5).title).toBe('Стажист дільниці');
    expect(levelForXp(Number.NaN).title).toBe('Стажист дільниці');
  });
});

describe('levelProgress', () => {
  it('matches the profile mockup: 640 XP is 20% of the way to 1 200', () => {
    expect(levelProgress(640)).toEqual({
      level: LEVELS[1],
      position: 2,
      total: 5,
      next: LEVELS[2],
      xpIntoLevel: 140,
      xpForNextLevel: 700,
      xpRemaining: 560,
      ratio: 0.2,
    });
  });

  it('is complete at the top level', () => {
    expect(levelProgress(4000)).toMatchObject({ position: 5, next: null, xpRemaining: 0, ratio: 1 });
  });
});
