/**
 * Перевірка відповіді тренажера нормування праці: кожне поле варіанта (`WorkMeasurementVariant.answers`)
 * — окрема частина `TaskCheck` через спільний `checkNumberPart`/`combineParts` (ui/parts.tsx).
 * `content/practicals/p04.yaml` містить задачі трьох тренажерів практичної в одному списку
 * `trainer.tasks` — острів фільтрує собі лише відомий метод (`time-standard`), а не кидає помилку
 * на чужі методи інших тренажерів тієї самої практичної.
 */
import type { Result } from '../../../engines/shared/result';
import type { WorkMeasurementMethod, WorkMeasurementTaskChoice, WorkMeasurementVariant } from '../../../engines/work-measurement';
import type { CalculationTask } from '../../../content/schemas/practical';
import { checkNumberPart, combineParts, type FieldIssues, type TaskCheck } from './task-check';
import { num } from './format';

export const WORK_MEASUREMENT_METHODS: readonly WorkMeasurementMethod[] = ['time-standard'];

function isWorkMeasurementMethod(value: string): value is WorkMeasurementMethod {
  return (WORK_MEASUREMENT_METHODS as readonly string[]).includes(value);
}

/** Пул задач для генератора: лише ті задачі контенту, чий метод відомий цьому рушію. */
export function toWorkMeasurementTaskChoices(tasks: readonly CalculationTask[]): readonly WorkMeasurementTaskChoice[] {
  return tasks.filter((task): task is CalculationTask & { method: WorkMeasurementMethod } => isWorkMeasurementMethod(task.method)).map((task) => ({ method: task.method }));
}

export type WorkMeasurementAnswer = Readonly<Record<string, string>>;

export const EMPTY_WORK_MEASUREMENT_ANSWER: WorkMeasurementAnswer = {};

export function checkWorkMeasurementTask(variant: WorkMeasurementVariant, answer: WorkMeasurementAnswer): Result<TaskCheck, FieldIssues> {
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
export function findCalculationTask(tasks: readonly CalculationTask[], variant: Pick<WorkMeasurementVariant, 'method'>): CalculationTask | undefined {
  return tasks.find((task) => task.method === variant.method);
}
