/**
 * Генератор варіантів тренажера черговості: для обраного методу з `content/practicals/p06.yaml`
 * (`trainer.tasks`) будує один відтворюваний варіант — шість робіт із попарно різними
 * тривалостями обробки й директивними строками (щоб SPT/EDD-порядок був однозначним), і водночас
 * саму відповідь через рушій формул (`calculations.ts`), щоб очікуване значення завжди узгоджувалося
 * з тим, що бачить студент.
 */
import { pickOne, shuffled, type RandomSource } from '../shared/random';
import { formatNumber, roundTo } from '../shared/number-format';
import { sequenceEdd, sequenceFcfs, sequenceSpt } from './calculations';
import type { SequencingAnswerField, SequencingJob, SequencingMethod, SequencingSummary, SequencingVariant } from './types';

const JOB_IDS = ['a', 'b', 'c', 'd', 'e', 'f'] as const;
const JOB_LABELS = ['Робота A', 'Робота B', 'Робота C', 'Робота D', 'Робота E', 'Робота F'] as const;
const DURATION_POOL = [2, 3, 4, 5, 6, 7, 8, 9] as const;
const DUE_DATE_POOL: readonly number[] = Array.from({ length: 36 }, (_, index) => index + 5);

function unwrap(result: { readonly ok: true; readonly value: SequencingSummary } | { readonly ok: false; readonly error: unknown }): SequencingSummary {
  if (!result.ok) throw new Error('Генератор черговості зібрав невалідну чергу робіт для рушія формул');
  return result.value;
}

/** Шість робіт з попарно різними тривалостями й строками в порядку надходження (це і є черговість FCFS). */
function generateJobs(random: RandomSource): SequencingJob[] {
  const durations = shuffled(DURATION_POOL, random).slice(0, JOB_IDS.length);
  const dueDates = shuffled(DUE_DATE_POOL, random).slice(0, JOB_IDS.length);
  return JOB_IDS.map((id, index) => ({
    id,
    label: JOB_LABELS[index] as string,
    processingTime: durations[index] as number,
    dueDate: dueDates[index] as number,
  }));
}

const SEQUENCERS: Readonly<Record<SequencingMethod, (jobs: readonly SequencingJob[]) => { readonly ok: true; readonly value: SequencingSummary } | { readonly ok: false; readonly error: unknown }>> = {
  fcfs: sequenceFcfs,
  spt: sequenceSpt,
  edd: sequenceEdd,
};

const METRICS_TEXT = 'розрахуйте середній час проходження, середнє запізнення і завантаження (SCH-04)';

const METHOD_PROMPTS: Readonly<Record<SequencingMethod, string>> = {
  fcfs: `Виконайте роботи в порядку надходження (FCFS, без сортування) і ${METRICS_TEXT}.`,
  spt: `Упорядкуйте роботи за правилом SPT (найкоротша операція першою) і ${METRICS_TEXT} (SCH-01).`,
  edd: `Упорядкуйте роботи за правилом EDD (найближчий строк першим) і ${METRICS_TEXT} (SCH-02).`,
};

const METHOD_RULE_NAMES: Readonly<Record<SequencingMethod, string>> = {
  fcfs: 'FCFS (порядок надходження)',
  spt: 'SPT (найкоротша операція першою)',
  edd: 'EDD (найближчий строк першим)',
};

function jobLabel(jobs: readonly SequencingJob[], id: string): string {
  return jobs.find((job) => job.id === id)?.label ?? id;
}

function buildSolution(method: SequencingMethod, jobs: readonly SequencingJob[], summary: SequencingSummary): string[] {
  const orderText = summary.order.map((job) => jobLabel(jobs, job.id)).join(' → ');
  const completionSteps = summary.order.map((job) => `${jobLabel(jobs, job.id)} (обробка ${formatNumber(job.processingTime)} дн., строк ${formatNumber(job.dueDate)} дн.): завершення ${formatNumber(job.completionTime)} дн.`);
  const totalProcessing = summary.order.reduce((sum, job) => sum + job.processingTime, 0);
  const totalFlow = summary.order.reduce((sum, job) => sum + job.flowTime, 0);
  const latenessSteps = summary.order.map((job) => `${jobLabel(jobs, job.id)}: max(0; ${formatNumber(job.completionTime)} − ${formatNumber(job.dueDate)}) = ${formatNumber(job.lateness)} дн.`);
  return [
    `Порядок за правилом ${METHOD_RULE_NAMES[method]}: ${orderText}.`,
    ...completionSteps,
    ...latenessSteps,
    `Середній час проходження = ${formatNumber(summary.order.reduce((sum, job) => sum + job.flowTime, 0))} / ${summary.order.length} = ${formatNumber(roundTo(summary.averageFlowTime, 1), { maximumFractionDigits: 1 })} дн.`,
    `Середнє запізнення = ${formatNumber(summary.order.reduce((sum, job) => sum + job.lateness, 0))} / ${summary.order.length} = ${formatNumber(roundTo(summary.averageLateness, 1), { maximumFractionDigits: 1 })} дн.`,
    `Завантаження (SCH-04) = ${formatNumber(totalProcessing)} / ${formatNumber(totalFlow)} · 100 % = ${formatNumber(roundTo(summary.utilization, 1), { maximumFractionDigits: 1 })} %.`,
  ];
}

export interface SequencingTaskChoice {
  readonly method: SequencingMethod;
}

/**
 * Випадкові строки інколи такі пізні, що за обраним правилом жодна робота не запізнюється, і середнє
 * запізнення вироджується в 0 — таку чергу генеруємо заново (детерміновано, з того самого джерела).
 */
const MAX_JOB_ATTEMPTS = 50;

function jobsWithLateness(random: RandomSource, method: SequencingMethod): { readonly jobs: SequencingJob[]; readonly summary: SequencingSummary } {
  let jobs = generateJobs(random);
  let summary = unwrap(SEQUENCERS[method](jobs));
  for (let attempt = 1; attempt < MAX_JOB_ATTEMPTS && summary.maxLateness === 0; attempt += 1) {
    jobs = generateJobs(random);
    summary = unwrap(SEQUENCERS[method](jobs));
  }
  return { jobs, summary };
}

/** Один випадковий варіант з переданого пулу методів (`content/practicals/p06.yaml` → `trainer.tasks`). */
export function createSequencingVariant(random: RandomSource, tasks: readonly SequencingTaskChoice[]): SequencingVariant {
  if (tasks.length === 0) throw new Error('Пул задач тренажера черговості порожній');
  const variantId = `sqv-${Math.floor(random.next() * 1e9).toString(36)}`;
  const { method } = pickOne(tasks, random);
  const { jobs, summary } = jobsWithLateness(random, method);
  const expectedOrder = summary.order.map((job) => job.id);
  const answers: SequencingAnswerField[] = [
    { id: 'avg-flow', label: 'Середній час проходження', unit: 'дн.', expected: roundTo(summary.averageFlowTime, 1), tolerance: 0.15 },
    { id: 'avg-lateness', label: 'Середнє запізнення', unit: 'дн.', expected: roundTo(summary.averageLateness, 1), tolerance: 0.15 },
    { id: 'utilization', label: 'Завантаження', unit: '%', expected: roundTo(summary.utilization, 1), tolerance: 0.15 },
  ];
  return {
    variantId,
    method,
    prompt: METHOD_PROMPTS[method],
    jobs,
    expectedOrder,
    answers,
    solution: buildSolution(method, jobs, summary),
  };
}
