/**
 * Перевірка відповіді тренажера вибору місця розташування: кожне поле варіанта
 * (`FacilityLocationVariant.answers`) — окрема частина `TaskCheck` через спільний
 * `checkNumberPart`/`combineParts` (ui/parts.tsx), і зіставлення варіанта з формулою та джерелом
 * із `content/practicals/p04.yaml` (потрібне лише для показу — рушій рахунку про схему контенту
 * не знає).
 *
 * `content/practicals/p04.yaml` містить задачі трьох різних тренажерів практичної в одному списку
 * `trainer.tasks` (розміщення, балансування лінії, нормування праці) — кожен острів фільтрує собі
 * лише відомі йому методи, а не кидає помилку на чужі: список свідомо спільний для practicals[].trainers.
 */
import type { Result } from '../../../engines/shared/result';
import type { FacilityLocationMethod, FacilityLocationTaskChoice, FacilityLocationVariant } from '../../../engines/facility-location';
import type { CalculationTask } from '../../../content/schemas/practical';
import { checkNumberPart, combineParts, type FieldIssues, type TaskCheck } from './task-check';
import { num } from './format';

const FACILITY_LOCATION_METHODS: readonly FacilityLocationMethod[] = ['factor-rating', 'center-of-gravity'];

function isFacilityLocationMethod(value: string): value is FacilityLocationMethod {
  return (FACILITY_LOCATION_METHODS as readonly string[]).includes(value);
}

/** Пул задач для генератора: лише ті задачі контенту, чий метод відомий цьому рушію. */
export function toFacilityLocationTaskChoices(tasks: readonly CalculationTask[]): readonly FacilityLocationTaskChoice[] {
  return tasks.filter((task): task is CalculationTask & { method: FacilityLocationMethod } => isFacilityLocationMethod(task.method)).map((task) => ({ method: task.method }));
}

export type FacilityLocationAnswer = Readonly<Record<string, string>>;

export const EMPTY_FACILITY_LOCATION_ANSWER: FacilityLocationAnswer = {};

export function checkFacilityLocationTask(variant: FacilityLocationVariant, answer: FacilityLocationAnswer): Result<TaskCheck, FieldIssues> {
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
export function findCalculationTask(tasks: readonly CalculationTask[], variant: Pick<FacilityLocationVariant, 'method'>): CalculationTask | undefined {
  return tasks.find((task) => task.method === variant.method);
}
