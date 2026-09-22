import { describe, expect, it } from 'vitest';
import { FIXED_NOW } from '../progress/__fixtures__/sample-state';
import { createEmptyProgress, type ProgressState } from '../progress/state';
import { BADGES, BADGE_ACTIVITY_IDS, earnedBadgeIds } from './badges';

const at = FIXED_NOW.toISOString();

function withActivity(id: string, bestScore: number, solvedVariants?: string[]): ProgressState {
  const base = createEmptyProgress(FIXED_NOW);
  const activity = solvedVariants ? { attempts: 1, bestScore, solvedVariants } : { attempts: 1, bestScore };
  return { ...base, activities: { [id]: activity } };
}

describe('BADGES', () => {
  it('defines thirteen badges with unique IDs and both texts in Ukrainian', () => {
    expect(BADGES).toHaveLength(13);
    expect(new Set(BADGES.map((badge) => badge.id)).size).toBe(13);
    for (const badge of BADGES) {
      expect(badge.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(badge.condition).toMatch(/[а-яіїєґ]/i);
      expect(badge.achievement).toMatch(/[а-яіїєґ]/i);
    }
  });

  it('covers the operations-management activities from the trainer roadmap', () => {
    const titles = BADGES.map((badge) => badge.title);
    for (const title of ['Оптимальна партія', 'Потреба спланована', 'Критичний шлях', 'Процес під контролем', 'Уважний читач']) {
      expect(titles).toContain(title);
    }
  });

  it('earns nothing on an empty state', () => {
    expect(earnedBadgeIds(createEmptyProgress(FIXED_NOW))).toEqual([]);
  });
});

describe('badge predicates', () => {
  it('«Прогноз справдився» needs three different solved forecasting scenarios', () => {
    expect(earnedBadgeIds(withActivity(BADGE_ACTIVITY_IDS.forecasting, 1, ['a', 'b']))).toEqual([]);
    expect(earnedBadgeIds(withActivity(BADGE_ACTIVITY_IDS.forecasting, 1, ['a', 'b', 'c']))).toEqual(['prohnoz-spravdyvsia']);
  });

  it.each([
    [BADGE_ACTIVITY_IDS.productivity, 'produktyvnist-dilianky'],
    [BADGE_ACTIVITY_IDS.littleLaw, 'zakon-littla'],
    [BADGE_ACTIVITY_IDS.productionCycle, 'tsykl-vyrobnytstva'],
    [BADGE_ACTIVITY_IDS.lineBalancing, 'liniia-zbalansovana'],
    [BADGE_ACTIVITY_IDS.eoq, 'optymalna-partiia'],
    [BADGE_ACTIVITY_IDS.mrp, 'potreba-splanovana'],
    [BADGE_ACTIVITY_IDS.aggregatePlanning, 'ahrehatnyi-plan'],
    [BADGE_ACTIVITY_IDS.sequencing, 'cherha-bez-prostoiv'],
    [BADGE_ACTIVITY_IDS.cpmPert, 'krytychnyi-shliakh'],
    [BADGE_ACTIVITY_IDS.controlCharts, 'protses-pid-kontrolem'],
    [BADGE_ACTIVITY_IDS.processCapability, 'zdatnist-protsesu'],
  ])('a flawless result in %s earns %s, a partial one does not', (activityId, badgeId) => {
    expect(earnedBadgeIds(withActivity(activityId, 1))).toEqual([badgeId]);
    expect(earnedBadgeIds(withActivity(activityId, 0.99))).toEqual([]);
  });

  it('«Уважний читач» needs five completed topics', () => {
    const base = createEmptyProgress(FIXED_NOW);
    const topics = (count: number) =>
      Object.fromEntries(Array.from({ length: count }, (_, index) => [`t0${index + 1}`, { status: 'completed' as const, updatedAt: at }]));
    const inProgress = { t09: { status: 'in-progress' as const, updatedAt: at } };
    expect(earnedBadgeIds({ ...base, topics: { ...topics(4), ...inProgress } })).toEqual([]);
    expect(earnedBadgeIds({ ...base, topics: topics(5) })).toEqual(['uvazhnyi-chytach']);
  });
});
