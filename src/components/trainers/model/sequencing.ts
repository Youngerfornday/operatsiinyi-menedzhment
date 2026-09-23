/**
 * Перевірка відповіді тренажера черговості: студент обирає не лише числа, а й порядок виконання
 * робіт (позиція черги → id роботи), тому крім `checkNumberPart`/`combineParts` (як у продуктивності)
 * тут є власна перевірка послідовності — окрема частина `TaskCheck` з порівнянням масивів id.
 */
import { err, ok, type Result } from '../../../engines/shared/result';
import type { SequencingMethod, SequencingTaskChoice, SequencingVariant } from '../../../engines/sequencing';
import type { CalculationTask } from '../../../content/schemas/practical';
import { checkNumberPart, combineParts, type FieldIssues, type TaskCheck, type TaskPart } from './task-check';
import { num } from './format';

/**
 * `content/practicals/p06.yaml` містить задачі трьох різних тренажерів практичної в одному списку
 * `trainer.tasks` (EOQ, MRP, черговість) — цей острів фільтрує собі лише FCFS, SPT і EDD (усі три
 * правила розібрано в лекції теми 6), ігноруючи чужі методи.
 */
const SEQUENCING_METHODS: readonly SequencingMethod[] = ['fcfs', 'spt', 'edd'];

/** Формула завантаження (SCH-04) — спільна для всіх правил, показується поруч із формулою правила. */
export const UTILIZATION_METHOD = 'utilization';

function isSequencingMethod(value: string): value is SequencingMethod {
  return (SEQUENCING_METHODS as readonly string[]).includes(value);
}

/** Пул задач для генератора: лише ті задачі контенту, чий метод відомий цьому рушію. */
export function toSequencingTaskChoices(tasks: readonly CalculationTask[]): readonly SequencingTaskChoice[] {
  return tasks.filter((task): task is CalculationTask & { method: SequencingMethod } => isSequencingMethod(task.method)).map((task) => ({ method: task.method }));
}

/** Позиція черги id → обрана робота (порожній рядок — ще не обрано); плюс три текстові поля для показників. */
export interface SequencingAnswer {
  readonly order: Readonly<Record<string, string>>;
  readonly avgFlow: string;
  readonly avgLateness: string;
  readonly utilization: string;
}

export const EMPTY_SEQUENCING_ANSWER: SequencingAnswer = { order: {}, avgFlow: '', avgLateness: '', utilization: '' };

/** ID позицій черги, у порядку: position-0 (перша), position-1, ... */
export function sequencePositionIds(jobCount: number): readonly string[] {
  return Array.from({ length: jobCount }, (_, index) => `position-${index}`);
}

export function checkSequencingTask(variant: SequencingVariant, answer: SequencingAnswer): Result<TaskCheck, FieldIssues> {
  const positions = sequencePositionIds(variant.jobs.length);
  const missing: FieldIssues = positions.filter((id) => !answer.order[id]).map((id) => ({ field: id, message: 'Оберіть роботу для цієї позиції черги.' }));
  if (missing.length > 0) return err(missing);

  const submittedOrder = positions.map((id) => answer.order[id] as string);
  const repeated: FieldIssues = positions
    .filter((_, index) => submittedOrder.indexOf(submittedOrder[index] as string) !== index)
    .map((id) => ({ field: id, message: 'Ця робота вже стоїть на іншій позиції черги — кожну роботу обирають один раз.' }));
  if (repeated.length > 0) return err(repeated);
  const jobLabel = (id: string): string => variant.jobs.find((job) => job.id === id)?.label ?? id;
  const orderCorrect = submittedOrder.length === variant.expectedOrder.length && submittedOrder.every((id, index) => id === variant.expectedOrder[index]);
  const orderPart: TaskPart = {
    id: 'order',
    label: 'Послідовність виконання',
    given: submittedOrder.map(jobLabel).join(' → '),
    expected: variant.expectedOrder.map(jobLabel).join(' → '),
    correct: orderCorrect,
  };

  const numericSpecs: readonly { readonly id: string; readonly text: string }[] = [
    { id: 'avg-flow', text: answer.avgFlow },
    { id: 'avg-lateness', text: answer.avgLateness },
    { id: 'utilization', text: answer.utilization },
  ];
  const numberParts = numericSpecs.map(({ id, text }) => {
    const field = variant.answers.find((candidate) => candidate.id === id);
    if (!field) throw new Error(`Варіант черговості не містить поля відповіді «${id}»`);
    return checkNumberPart({ id: field.id, label: field.label, text, expected: field.expected, tolerance: field.tolerance, format: (value) => `${num(value)} ${field.unit}` });
  });

  return combineParts([ok(orderPart), ...numberParts]);
}

/** Задача контенту, з якої згенеровано варіант: та сама `method`. */
export function findCalculationTask(tasks: readonly CalculationTask[], method: string): CalculationTask | undefined {
  return tasks.find((task) => task.method === method);
}
