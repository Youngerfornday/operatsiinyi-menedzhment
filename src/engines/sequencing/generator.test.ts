import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '../shared/random';
import { sequenceEdd, sequenceFcfs, sequenceSpt } from './calculations';
import { createSequencingVariant, type SequencingTaskChoice } from './generator';
import type { SequencingMethod, SequencingSummary } from './types';

const ALL_METHODS: readonly SequencingMethod[] = ['fcfs', 'spt', 'edd'];
const ALL_TASKS: readonly SequencingTaskChoice[] = ALL_METHODS.map((method) => ({ method }));

const SEQUENCERS: Readonly<Record<SequencingMethod, (jobs: readonly { readonly id: string; readonly label: string; readonly processingTime: number; readonly dueDate: number }[]) => { readonly ok: true; readonly value: SequencingSummary } | { readonly ok: false }>> = {
  fcfs: sequenceFcfs,
  spt: sequenceSpt,
  edd: sequenceEdd,
};

describe('createSequencingVariant', () => {
  it('той самий seed дає той самий варіант (детермінізм)', () => {
    const first = createSequencingVariant(createSeededRandom('p06:seq:1'), ALL_TASKS);
    const second = createSequencingVariant(createSeededRandom('p06:seq:1'), ALL_TASKS);
    expect(second).toEqual(first);
  });

  it('різні seed дають різні варіанти', () => {
    const first = createSequencingVariant(createSeededRandom('p06:seq:1'), ALL_TASKS);
    const second = createSequencingVariant(createSeededRandom('p06:seq:2'), ALL_TASKS);
    expect(second.variantId).not.toEqual(first.variantId);
  });

  it('обирає лише методи з переданого пулу', () => {
    const only: readonly SequencingTaskChoice[] = [{ method: 'spt' }];
    for (let seed = 0; seed < 20; seed += 1) {
      const variant = createSequencingVariant(createSeededRandom(`only:${seed}`), only);
      expect(variant.method).toBe('spt');
    }
  });

  it('кидає помилку на порожній пул задач', () => {
    expect(() => createSequencingVariant(createSeededRandom('x'), [])).toThrow();
  });

  it('генерує шість робіт з попарно різними тривалостями й строками, expectedOrder — перестановка тих самих id', () => {
    for (const method of ALL_METHODS) {
      const variant = createSequencingVariant(createSeededRandom(`shape:${method}`), [{ method }]);
      expect(variant.jobs).toHaveLength(6);
      const durations = variant.jobs.map((job) => job.processingTime);
      const dueDates = variant.jobs.map((job) => job.dueDate);
      expect(new Set(durations).size).toBe(6);
      expect(new Set(dueDates).size).toBe(6);

      const jobIds = variant.jobs.map((job) => job.id);
      expect(variant.expectedOrder).toHaveLength(6);
      expect(new Set(variant.expectedOrder).size).toBe(6);
      expect([...variant.expectedOrder].sort()).toEqual([...jobIds].sort());
    }
  });

  it('answers містить рівно два поля з очікуваними id', () => {
    const variant = createSequencingVariant(createSeededRandom('answers:1'), ALL_TASKS);
    expect(variant.answers.map((field) => field.id)).toEqual(['avg-flow', 'avg-lateness']);
  });

  it('expected-значення independently узгоджуються з незалежним викликом sequence* на тих самих jobs', () => {
    for (const method of ALL_METHODS) {
      for (let seed = 0; seed < 15; seed += 1) {
        const variant = createSequencingVariant(createSeededRandom(`check:${method}:${seed}`), [{ method }]);
        const recomputed = SEQUENCERS[method](variant.jobs);
        expect(recomputed.ok).toBe(true);
        if (!recomputed.ok) continue;
        const avgFlow = variant.answers.find((field) => field.id === 'avg-flow')!;
        const avgLateness = variant.answers.find((field) => field.id === 'avg-lateness')!;
        expect(avgFlow.expected).toBeCloseTo(recomputed.value.averageFlowTime, 1);
        expect(avgLateness.expected).toBeCloseTo(recomputed.value.averageLateness, 1);
        expect(variant.expectedOrder).toEqual(recomputed.value.order.map((job) => job.id));
      }
    }
  });
});
