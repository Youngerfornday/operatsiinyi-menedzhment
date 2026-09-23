import { ok } from '../shared/result';
import { fail, type SequencingResult } from './errors';
import type { SequencedJob, SequencingJob, SequencingSummary } from './types';

/**
 * Правила черговості на одному робочому місці (docs/research/formula-baseline.md, розділ 5,
 * коди SCH-01, SCH-02, SCH-04). Усі три правила впорядковують ту саму чергу робіт і рахують
 * розклад за спільною механікою `computeSchedule` — різниться лише порядок, у якому роботи
 * потрапляють на верстат.
 */

function validateJobs(jobs: readonly SequencingJob[]): SequencingResult<true> {
  if (jobs.length === 0) return fail('empty-jobs');
  if (jobs.some((job) => job.processingTime <= 0 || job.dueDate < 0)) return fail('negative-value');
  const ids = new Set(jobs.map((job) => job.id));
  if (ids.size !== jobs.length) return fail('duplicate-id');
  return ok(true);
}

/**
 * Розклад одного верстата за заданим порядком робіт: усі роботи вже чекають у черзі на момент t=0
 * (закритий цех), тож час проходження кожної роботи дорівнює її часу завершення. Запізнення —
 * `max(0; завершення − строк)`, середнє — по всіх n роботах, включно з тими, що завершились без
 * запізнення (lateness=0) — рішення етапу 4, за Heizer J., Render B., Munson C., 2016.
 */
function computeSchedule(order: readonly SequencingJob[]): SequencingSummary {
  let clock = 0;
  const sequencedJobs: SequencedJob[] = order.map((job) => {
    clock += job.processingTime;
    const completionTime = clock;
    const flowTime = completionTime;
    const lateness = Math.max(0, completionTime - job.dueDate);
    return { ...job, completionTime, flowTime, lateness };
  });

  const jobCount = sequencedJobs.length;
  const totalProcessingTime = sequencedJobs.reduce((sum, job) => sum + job.processingTime, 0);
  const totalFlowTime = sequencedJobs.reduce((sum, job) => sum + job.flowTime, 0);
  const totalLateness = sequencedJobs.reduce((sum, job) => sum + job.lateness, 0);
  const maxLateness = Math.max(...sequencedJobs.map((job) => job.lateness));

  return {
    order: sequencedJobs,
    averageFlowTime: totalFlowTime / jobCount,
    averageLateness: totalLateness / jobCount,
    maxLateness,
    // SCH-04: Завантаження = Сумарний час обробки / Сумарний час проходження · 100 %.
    utilization: (totalProcessingTime / totalFlowTime) * 100,
  };
}

/** Базова (без сортування) черговість — порядок надходження робіт, «диспетчер не сортує чергу». */
export function sequenceFcfs(jobs: readonly SequencingJob[]): SequencingResult<SequencingSummary> {
  const validation = validateJobs(jobs);
  if (!validation.ok) return validation;
  return ok(computeSchedule(jobs));
}

/** SCH-01: правило SPT — найкоротша операція першою; мінімізує середній час виконання і чергу. */
export function sequenceSpt(jobs: readonly SequencingJob[]): SequencingResult<SequencingSummary> {
  const validation = validateJobs(jobs);
  if (!validation.ok) return validation;
  return ok(computeSchedule([...jobs].sort((a, b) => a.processingTime - b.processingTime)));
}

/** SCH-02: правило EDD — найближчий директивний строк першим; мінімізує максимальне запізнення. */
export function sequenceEdd(jobs: readonly SequencingJob[]): SequencingResult<SequencingSummary> {
  const validation = validateJobs(jobs);
  if (!validation.ok) return validation;
  return ok(computeSchedule([...jobs].sort((a, b) => a.dueDate - b.dueDate)));
}
