/**
 * Генератор варіантів рушія сітьового планування: топологія мережі фіксована (сім робіт, дві гілки, що
 * сходяться перед останньою роботою — та сама структура, що й наскрізний приклад лекції теми 7), а
 * тривалості (чи PERT-оцінки) — випадкові цілі числа. Відповідь завжди рахує сам рушій (`network.ts`,
 * `pert.ts`), тому очікуване значення узгоджене з даними, які бачить студент.
 */
import { pickOne, randomInt, type RandomSource } from '../shared/random';
import { formatNumber, formatPercent, roundTo } from '../shared/number-format';
import { computeNetwork } from './network';
import { computePertProject, onTimeProbability, projectZ } from './pert';
import type { Activity, CpmPertAnswerField, CpmPertGivenItem, CpmPertMethod, CpmPertVariant, PertEstimate, PertProjectResult } from './types';

/** Опис роботи наскрізного прикладу теми 7: код, назва, попередники (без тривалості — її генерують). */
const TOPOLOGY: readonly { readonly id: string; readonly title: string; readonly predecessors: readonly string[] }[] = [
  { id: 'A', title: 'Технічне завдання та узгодження бюджету', predecessors: [] },
  { id: 'B', title: 'Замовлення допоміжного обладнання', predecessors: ['A'] },
  { id: 'C', title: 'Проєктування розміщення лінії', predecessors: ['A'] },
  { id: 'D', title: 'Монтаж допоміжного обладнання', predecessors: ['B'] },
  { id: 'E', title: 'Закупівля та монтаж основної лінії', predecessors: ['C'] },
  { id: 'F', title: 'Пусконалагоджувальні роботи', predecessors: ['D', 'E'] },
  { id: 'G', title: 'Навчання персоналу та запуск у експлуатацію', predecessors: ['F'] },
];

/** Робота, чий повний резерв запитуємо: завжди B — вона критична лише в разі точного збігу тривалості обох гілок. */
const FLOAT_PROBE_ID = 'B';

function unwrap<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: unknown }): T {
  if (!result.ok) throw new Error('Генератор сітьового планування зібрав невалідні дані для рушія');
  return result.value;
}

function activitiesTable(rows: readonly { readonly id: string; readonly title: string; readonly predecessors: readonly string[]; readonly value: string }[]): CpmPertGivenItem[] {
  return rows.map((row) => ({ label: `${row.id}. ${row.title} (попередники: ${row.predecessors.length > 0 ? row.predecessors.join(', ') : '—'})`, value: row.value }));
}

function cpmVariant(random: RandomSource, variantId: string): CpmPertVariant {
  const durations = new Map(TOPOLOGY.map((row) => [row.id, randomInt(random, 1, 9)]));
  const activities: Activity[] = TOPOLOGY.map((row) => ({ id: row.id, duration: durations.get(row.id) as number, predecessors: row.predecessors }));
  const network = unwrap(computeNetwork(activities));
  const byId = new Map(network.activities.map((schedule) => [schedule.id, schedule]));
  const probe = byId.get(FLOAT_PROBE_ID);
  if (!probe) throw new Error(`Генератор сітьового планування: роботу ${FLOAT_PROBE_ID} не знайдено в розкладі`);

  const given = activitiesTable(TOPOLOGY.map((row) => ({ ...row, value: `${formatNumber(durations.get(row.id) as number)} тиж.` })));
  const answers: CpmPertAnswerField[] = [
    { id: 'duration', label: 'Тривалість проекту (критичний шлях)', unit: 'тиж.', expected: network.projectDuration, tolerance: 0 },
    { id: 'float', label: `Повний резерв роботи ${FLOAT_PROBE_ID}`, unit: 'тиж.', expected: probe.totalFloat, tolerance: 0 },
  ];
  const branchA = ['A', 'B', 'D', 'F', 'G'].reduce((sum, id) => sum + (durations.get(id) as number), 0);
  const branchB = ['A', 'C', 'E', 'F', 'G'].reduce((sum, id) => sum + (durations.get(id) as number), 0);
  const solution = [
    `Гілка A–B–D–F–G: ${['A', 'B', 'D', 'F', 'G'].map((id) => durations.get(id)).join(' + ')} = ${formatNumber(branchA)} тиж.`,
    `Гілка A–C–E–F–G: ${['A', 'C', 'E', 'F', 'G'].map((id) => durations.get(id)).join(' + ')} = ${formatNumber(branchB)} тиж.`,
    `Критичний шлях — довша гілка: ${formatNumber(network.projectDuration)} тиж. (PRJ-01, PRJ-04).`,
    `Повний резерв роботи ${FLOAT_PROBE_ID}: LS − ES = ${formatNumber(probe.lateStart)} − ${formatNumber(probe.earlyStart)} = ${formatNumber(probe.totalFloat)} тиж. (PRJ-02, PRJ-03).`,
  ];
  return { variantId, method: 'cpm-critical-path', prompt: 'Побудуйте сітьовий графік за переліком робіт, визначте критичний шлях і повний резерв зазначеної роботи (PRJ-01..04).', given, answers, solution };
}

const DEADLINE_MARGIN_WEEKS: readonly [number, number] = [1, 4];

/** Скільки разів перетягувати оцінки, поки гілки за te не розійдуться; на практиці вистачає однієї-двох спроб. */
const MAX_PERT_DRAWS = 50;

function drawPertEstimates(random: RandomSource): PertEstimate[] {
  return TOPOLOGY.map((row) => {
    const mostLikely = randomInt(random, 2, 8);
    const optimistic = mostLikely - randomInt(random, 1, Math.min(2, mostLikely - 1) || 1);
    const pessimistic = mostLikely + randomInt(random, 1, 3);
    return { id: row.id, optimistic: Math.max(1, optimistic), mostLikely, pessimistic, predecessors: row.predecessors };
  });
}

/** Кожна гілка мережі (A–B–D–F–G чи A–C–E–F–G) має п’ять робіт; більше критичних робіт — дві гілки рівні. */
const SINGLE_PATH_LENGTH = 5;

/**
 * Оцінки з рівно одним критичним шляхом за te. Коли обидві гілки мають однакову очікувану тривалість,
 * критичних шляхів два, а PRJ-06 визначає дисперсію проекту лише для одного критичного шляху; правила
 * вибору між рівними шляхами база не містить, тож такий варіант студентові не показуємо.
 */
function pertEstimatesWithSinglePath(random: RandomSource): { readonly estimates: PertEstimate[]; readonly project: PertProjectResult } {
  for (let attempt = 0; attempt < MAX_PERT_DRAWS; attempt += 1) {
    const estimates = drawPertEstimates(random);
    const project = unwrap(computePertProject(estimates));
    if (project.network.criticalPath.length === SINGLE_PATH_LENGTH) return { estimates, project };
  }
  throw new Error('Генератор PERT не знайшов оцінок з єдиним критичним шляхом');
}

function pertVariant(random: RandomSource, variantId: string): CpmPertVariant {
  const { estimates, project } = pertEstimatesWithSinglePath(random);
  const directiveDeadline = roundTo(project.expectedDuration, 0) + randomInt(random, DEADLINE_MARGIN_WEEKS[0], DEADLINE_MARGIN_WEEKS[1]);
  const z = unwrap(projectZ(directiveDeadline, project.expectedDuration, project.sigma));
  const probability = unwrap(onTimeProbability(directiveDeadline, project.expectedDuration, project.sigma));

  const given = activitiesTable(TOPOLOGY.map((row) => {
    const estimate = estimates.find((candidate) => candidate.id === row.id) as PertEstimate;
    return { ...row, value: `o=${formatNumber(estimate.optimistic)}, m=${formatNumber(estimate.mostLikely)}, p=${formatNumber(estimate.pessimistic)} тиж.` };
  }));
  given.push({ label: 'Директивний строк проекту D', value: `${formatNumber(directiveDeadline)} тиж.` });

  const answers: CpmPertAnswerField[] = [
    { id: 'expected', label: 'Очікувана тривалість проекту TE', unit: 'тиж.', expected: roundTo(project.expectedDuration, 2), tolerance: 0.05 },
    { id: 'probability', label: 'Імовірність дотримання строку D', unit: '%', expected: roundTo(probability * 100, 1), tolerance: 0.5 },
  ];
  const criticalActivities = project.activities.filter((activity) => project.network.criticalPath.includes(activity.id));
  const solution = [
    ...criticalActivities.map((activity) => `te(${activity.id}) = (o + 4m + p) / 6 = ${formatNumber(activity.expectedTime, { maximumFractionDigits: 3 })} тиж. (PRJ-05).`),
    `Критичний шлях за te: ${project.network.criticalPath.join('–')}, TE = ${formatNumber(project.expectedDuration, { maximumFractionDigits: 3 })} тиж.`,
    `Дисперсія проекту (сума дисперсій робіт критичного шляху): σ² = ${formatNumber(project.variance, { maximumFractionDigits: 3 })} (PRJ-06); σ ≈ ${formatNumber(project.sigma, { maximumFractionDigits: 3 })} тижня.`,
    `Z = (D − TE) / σ = (${formatNumber(directiveDeadline)} − ${formatNumber(project.expectedDuration, { maximumFractionDigits: 2 })}) / ${formatNumber(project.sigma, { maximumFractionDigits: 3 })} ≈ ${formatNumber(z)} (PRJ-07).`,
    `За таблицею нормального розподілу Φ(${formatNumber(z)}) ≈ ${formatPercent(probability)}.`,
  ];
  return { variantId, method: 'pert-probability', prompt: 'Оцініть очікувану тривалість проекту та ймовірність дотримання директивного строку методом PERT (PRJ-05..07).', given, answers, solution };
}

const GENERATORS: Readonly<Record<CpmPertMethod, (random: RandomSource, variantId: string) => CpmPertVariant>> = {
  'cpm-critical-path': cpmVariant,
  'pert-probability': pertVariant,
};

export interface CpmPertTaskChoice {
  readonly method: CpmPertMethod;
}

/** Один випадковий варіант з переданого пулу методів (`content/practicals/p07.yaml` → `trainer.tasks`). */
export function createCpmPertVariant(random: RandomSource, tasks: readonly CpmPertTaskChoice[]): CpmPertVariant {
  if (tasks.length === 0) throw new Error('Пул задач тренажера сітьового планування порожній');
  const variantId = `cpv-${Math.floor(random.next() * 1e9).toString(36)}`;
  const choice = pickOne(tasks, random);
  return GENERATORS[choice.method](random, variantId);
}
