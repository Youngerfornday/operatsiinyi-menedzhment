/**
 * Перевірка відповіді тренажера EOQ: кожне поле варіанта (`EoqVariant.answers`) — окрема частина
 * `TaskCheck` через спільний `checkNumberPart`/`combineParts` (task-check.ts), і зіставлення варіанта
 * з формулою та джерелом із `content/practicals/p06.yaml` (потрібне лише для показу — рушій рахунку
 * про схему контенту не знає).
 *
 * `content/practicals/p06.yaml` містить задачі трьох різних тренажерів практичної в одному списку
 * `trainer.tasks` (EOQ, MRP, черговість) — кожен острів фільтрує собі лише відомі йому методи, а не
 * кидає помилку на чужі: список свідомо спільний для practicals[].trainers.
 */
import type { Result } from '../../../engines/shared/result';
import type { EoqMethod, EoqTaskChoice, EoqVariant } from '../../../engines/eoq';
import type { CalculationTask } from '../../../content/schemas/practical';
import { checkNumberPart, combineParts, type FieldIssues, type TaskCheck } from './task-check';
import { num } from './format';

const EOQ_METHODS: readonly EoqMethod[] = ['eoq', 'reorder-point', 'cost-sensitivity'];

function isEoqMethod(value: string): value is EoqMethod {
  return (EOQ_METHODS as readonly string[]).includes(value);
}

/** Пул задач для генератора: лише ті задачі контенту, чий метод відомий цьому рушію. */
export function toEoqTaskChoices(tasks: readonly CalculationTask[]): readonly EoqTaskChoice[] {
  return tasks.filter((task): task is CalculationTask & { method: EoqMethod } => isEoqMethod(task.method)).map((task) => ({ method: task.method }));
}

export type EoqAnswer = Readonly<Record<string, string>>;

export const EMPTY_EOQ_ANSWER: EoqAnswer = {};

export function checkEoqTask(variant: EoqVariant, answer: EoqAnswer): Result<TaskCheck, FieldIssues> {
  const parts = variant.answers.map((field) =>
    checkNumberPart({
      id: field.id,
      label: field.label,
      text: answer[field.id] ?? '',
      expected: field.expected,
      tolerance: field.tolerance,
      format: (value) => `${num(value)} ${field.unit}`,
    }),
  );
  return combineParts(parts);
}

/** Задача контенту, з якої згенеровано варіант: та сама `method`. */
export function findCalculationTask(tasks: readonly CalculationTask[], method: string): CalculationTask | undefined {
  return tasks.find((task) => task.method === method);
}
