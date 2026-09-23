/**
 * Перевірка відповіді тренажера тривалості виробничого циклу: три поля варіанта
 * (`ProductionCycleVariant.answers` — послідовний, паралельний, паралельно-послідовний рух) окремі
 * частини `TaskCheck` через спільний `checkNumberPart`/`combineParts` (ui/parts.tsx), і зіставлення
 * варіанта з формулою та джерелом із `content/practicals/p03.yaml`.
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

/** Пул задач для генератора з контенту практичної; невідомий `method` — помилка контенту, а не тиха відмова. */
export function toProductionCycleTaskChoices(tasks: readonly CalculationTask[]): readonly ProductionCycleTaskChoice[] {
  return tasks.map((task) => {
    if (!isProductionCycleMethod(task.method)) throw new Error(`Задача «${task.id}»: невідомий метод «${task.method}» для рушія тривалості циклу`);
    return { method: task.method };
  });
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
