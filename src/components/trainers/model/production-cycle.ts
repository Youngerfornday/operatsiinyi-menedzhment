/**
 * Перевірка відповіді тренажера тривалості виробничого циклу: три поля варіанта
 * (`ProductionCycleVariant.answers` — послідовний, паралельний, паралельно-послідовний рух) окремі
 * частини `TaskCheck` через спільний `checkNumberPart`/`combineParts` (ui/parts.tsx), і зіставлення
 * варіанта з формулою та джерелом із `content/practicals/p03.yaml`.
 *
 * `content/practicals/p03.yaml` містить задачі двох тренажерів практичної в одному списку
 * `trainer.tasks` (закон Літтла й тривалість виробничого циклу) — кожен острів фільтрує собі лише
 * відомі йому методи, а не кидає помилку на чужі: список свідомо спільний для practicals[].trainers.
 */
import type { Result } from '../../../engines/shared/result';
import type { ProductionCycleMethod, ProductionCycleVariant } from '../../../engines/production-cycle';
import type { CalculationTask } from '../../../content/schemas/practical';
import { checkNumberPart, combineParts, type FieldIssues, type TaskCheck } from './task-check';
import { num } from './format';

/** Схема контенту тримає `method` вільним рядком; єдиний метод, який вміє рушій циклу, звіряється тут. */
const PRODUCTION_CYCLE_METHODS: readonly ProductionCycleMethod[] = ['production-cycle'];

function isProductionCycleMethod(value: string): value is ProductionCycleMethod {
  return (PRODUCTION_CYCLE_METHODS as readonly string[]).includes(value);
}

export interface ProductionCycleTaskChoice {
  readonly method: ProductionCycleMethod;
}

/** Пул задач для генератора: лише ті задачі контенту, чий метод відомий цьому рушію. */
export function toProductionCycleTaskChoices(tasks: readonly CalculationTask[]): readonly ProductionCycleTaskChoice[] {
  return tasks.filter((task): task is CalculationTask & { method: ProductionCycleMethod } => isProductionCycleMethod(task.method)).map((task) => ({ method: task.method }));
}

export type ProductionCycleAnswer = Readonly<Record<string, string>>;

export const EMPTY_PRODUCTION_CYCLE_ANSWER: ProductionCycleAnswer = {};

export function checkProductionCycleTask(variant: ProductionCycleVariant, answer: ProductionCycleAnswer): Result<TaskCheck, FieldIssues> {
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

/** Задача контенту, з якої згенеровано варіант: єдина задача типу `production-cycle`. */
export function findCalculationTask(tasks: readonly CalculationTask[], variant: Pick<ProductionCycleVariant, 'method'>): CalculationTask | undefined {
  return tasks.find((task) => task.method === variant.method);
}
