import { describe, expect, it } from 'vitest';
import { computeNetwork } from './network';
import type { Activity } from './types';

/**
 * Фікстура — наскрізний приклад лекції теми 7 (content/modules/m2/t07/lecture.mdx, WorkedExample
 * code="PRJ-01"): сім робіт запуску лінії пакування з вивіреними ранніми/пізніми термінами,
 * критичним шляхом A–C–E–F–G (18 тижнів) і резервами B, D по 2 тижні.
 */
const LECTURE_ACTIVITIES: readonly Activity[] = [
  { id: 'A', duration: 2, predecessors: [] },
  { id: 'B', duration: 5, predecessors: ['A'] },
  { id: 'C', duration: 4, predecessors: ['A'] },
  { id: 'D', duration: 3, predecessors: ['B'] },
  { id: 'E', duration: 6, predecessors: ['C'] },
  { id: 'F', duration: 4, predecessors: ['D', 'E'] },
  { id: 'G', duration: 2, predecessors: ['F'] },
];

function scheduleOf(activities: ReturnType<typeof computeNetwork>, id: string) {
  if (!activities.ok) throw new Error('network computation failed');
  const schedule = activities.value.activities.find((activity) => activity.id === id);
  if (!schedule) throw new Error(`activity ${id} not found`);
  return schedule;
}

describe('computeNetwork (PRJ-01..04, PRJ-09)', () => {
  it('рахує тривалість проекту й критичний шлях запуску лінії пакування — 18 тижнів, A-C-E-F-G', () => {
    const result = computeNetwork(LECTURE_ACTIVITIES);

    expect(result.ok && result.value.projectDuration).toBe(18);
    expect(result.ok && result.value.criticalPath).toEqual(['A', 'C', 'E', 'F', 'G']);
  });

  it('рахує ранні й пізні терміни кожної роботи, як у лекції', () => {
    const result = computeNetwork(LECTURE_ACTIVITIES);

    expect(scheduleOf(result, 'F')).toMatchObject({ earlyStart: 12, earlyFinish: 16, lateStart: 12, lateFinish: 16 });
    expect(scheduleOf(result, 'D')).toMatchObject({ earlyStart: 7, earlyFinish: 10, lateStart: 9, lateFinish: 12 });
  });

  it('рахує повний резерв: B і D — 2 тижні, критичні роботи — 0', () => {
    const result = computeNetwork(LECTURE_ACTIVITIES);

    expect(scheduleOf(result, 'B').totalFloat).toBe(2);
    expect(scheduleOf(result, 'D').totalFloat).toBe(2);
    for (const id of ['A', 'C', 'E', 'F', 'G']) {
      expect(scheduleOf(result, id).totalFloat).toBe(0);
      expect(scheduleOf(result, id).isCritical).toBe(true);
    }
  });

  it('рахує вільний резерв: B — 0 (зсуває старт D), D — 2 (F однаково чекає на E)', () => {
    const result = computeNetwork(LECTURE_ACTIVITIES);

    expect(scheduleOf(result, 'B').freeFloat).toBe(0);
    expect(scheduleOf(result, 'D').freeFloat).toBe(2);
  });

  it('відхиляє порожній перелік робіт', () => {
    expect(computeNetwork([])).toMatchObject({ ok: false, error: { code: 'empty-activities' } });
  });

  it('відхиляє дублікат коду роботи', () => {
    const activities: Activity[] = [
      { id: 'A', duration: 1, predecessors: [] },
      { id: 'A', duration: 2, predecessors: [] },
    ];
    expect(computeNetwork(activities)).toMatchObject({ ok: false, error: { code: 'duplicate-id' } });
  });

  it('відхиляє посилання на невідомого попередника', () => {
    const activities: Activity[] = [{ id: 'A', duration: 1, predecessors: ['X'] }];
    expect(computeNetwork(activities)).toMatchObject({ ok: false, error: { code: 'unknown-predecessor' } });
  });

  it('відхиляє невалідну тривалість', () => {
    const activities: Activity[] = [{ id: 'A', duration: 0, predecessors: [] }];
    expect(computeNetwork(activities)).toMatchObject({ ok: false, error: { code: 'non-positive-duration' } });
  });

  it('відхиляє цикл у попередниках', () => {
    const activities: Activity[] = [
      { id: 'A', duration: 1, predecessors: ['B'] },
      { id: 'B', duration: 1, predecessors: ['A'] },
    ];
    expect(computeNetwork(activities)).toMatchObject({ ok: false, error: { code: 'cycle-detected' } });
  });
});
