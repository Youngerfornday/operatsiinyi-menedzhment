import { describe, expect, it } from 'vitest';
import { sequenceEdd, sequenceFcfs, sequenceSpt } from './calculations';
import type { SequencingJob } from './types';

/**
 * Фікстура — вивірені числа з content/modules/m2/t06/lecture.mdx, WorkedExample code="SCH-01"
 * («Черга з п’яти завдань: FCFS, SPT і EDD за повним набором показників»): п’ять робіт у порядку
 * надходження A, B, C, D, E.
 */
const LECTURE_JOBS: readonly SequencingJob[] = [
  { id: 'a', label: 'A', processingTime: 4, dueDate: 14 },
  { id: 'b', label: 'B', processingTime: 7, dueDate: 9 },
  { id: 'c', label: 'C', processingTime: 2, dueDate: 19 },
  { id: 'd', label: 'D', processingTime: 6, dueDate: 12 },
  { id: 'e', label: 'E', processingTime: 3, dueDate: 6 },
];

describe('sequenceFcfs', () => {
  it('порядок надходження без сортування: середній час 13,8, середнє запізнення 5,0, максимальне 16', () => {
    const result = sequenceFcfs(LECTURE_JOBS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.order.map((job) => job.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(result.value.averageFlowTime).toBeCloseTo(13.8, 1);
    expect(result.value.averageLateness).toBeCloseTo(5.0, 1);
    expect(result.value.maxLateness).toBe(16);
    expect(result.value.utilization).toBeCloseTo(31.9, 1);
  });
});

describe('sequenceSpt (SCH-01)', () => {
  it('за зростанням тривалості: середній час 10,6, середнє запізнення 3,2, максимальне 13', () => {
    const result = sequenceSpt(LECTURE_JOBS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.order.map((job) => job.id)).toEqual(['c', 'e', 'a', 'd', 'b']);
    expect(result.value.averageFlowTime).toBeCloseTo(10.6, 1);
    expect(result.value.averageLateness).toBeCloseTo(3.2, 1);
    expect(result.value.maxLateness).toBe(13);
    expect(result.value.utilization).toBeCloseTo(41.5, 1);
  });
});

describe('sequenceEdd (SCH-02)', () => {
  it('за зростанням строку: середній час 14,2, середнє запізнення 2,8, максимальне 6', () => {
    const result = sequenceEdd(LECTURE_JOBS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.order.map((job) => job.id)).toEqual(['e', 'b', 'd', 'a', 'c']);
    expect(result.value.averageFlowTime).toBeCloseTo(14.2, 1);
    expect(result.value.averageLateness).toBeCloseTo(2.8, 1);
    expect(result.value.maxLateness).toBe(6);
    expect(result.value.utilization).toBeCloseTo(31.0, 1);
  });
});

describe('помилки валідації черги (спільні для fcfs/spt/edd)', () => {
  it('порожня черга — empty-jobs', () => {
    expect(sequenceFcfs([])).toMatchObject({ ok: false, error: { code: 'empty-jobs' } });
    expect(sequenceSpt([])).toMatchObject({ ok: false, error: { code: 'empty-jobs' } });
    expect(sequenceEdd([])).toMatchObject({ ok: false, error: { code: 'empty-jobs' } });
  });

  it('невалідна тривалість обробки (нуль чи від’ємна) — negative-value', () => {
    const jobs: readonly SequencingJob[] = [{ id: 'a', label: 'A', processingTime: 0, dueDate: 5 }];
    expect(sequenceFcfs(jobs)).toMatchObject({ ok: false, error: { code: 'negative-value' } });
    const negative: readonly SequencingJob[] = [{ id: 'a', label: 'A', processingTime: -1, dueDate: 5 }];
    expect(sequenceSpt(negative)).toMatchObject({ ok: false, error: { code: 'negative-value' } });
  });

  it('від’ємний директивний строк — negative-value', () => {
    const jobs: readonly SequencingJob[] = [{ id: 'a', label: 'A', processingTime: 3, dueDate: -1 }];
    expect(sequenceEdd(jobs)).toMatchObject({ ok: false, error: { code: 'negative-value' } });
  });

  it('дублікат ID робіт — duplicate-id', () => {
    const jobs: readonly SequencingJob[] = [
      { id: 'a', label: 'A', processingTime: 3, dueDate: 5 },
      { id: 'a', label: 'A2', processingTime: 4, dueDate: 6 },
    ];
    expect(sequenceFcfs(jobs)).toMatchObject({ ok: false, error: { code: 'duplicate-id' } });
  });
});
