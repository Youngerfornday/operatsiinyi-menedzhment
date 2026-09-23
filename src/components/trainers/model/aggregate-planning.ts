/**
 * Перевірка відповіді тренажера агрегатного планування: кожне поле варіанта
 * (`AggregatePlanningVariant.answers`) — окрема частина `TaskCheck` через спільний
 * `checkNumberPart`/`combineParts` (ui/parts.tsx), і зіставлення варіанта з формулою та джерелом із
 * `content/practicals/p05.yaml` (потрібне лише для показу — рушій рахунку про схему контенту не знає).
 *
 * Практична p05 поєднує в одному `trainer.tasks` методи ДВОХ рушіїв (прогнозування —
 * `src/components/trainers/model/forecasting.ts` — й агрегатне планування), тому на відміну від
 * `model/productivity.ts` (єдиний рушій на файл, невідомий метод — помилка контенту) тут метод, що
 * належить іншому рушію, просто відфільтровується.
 */
import type { Result } from '../../../engines/shared/result';
import type { AggregatePlanningMethod, AggregatePlanningTaskChoice, AggregatePlanningVariant } from '../../../engines/aggregate-planning';
import type { CalculationTask } from '../../../content/schemas/practical';
import { checkNumberPart, combineParts, type FieldIssues, type TaskCheck } from './task-check';
import { num } from './format';

export const AGGREGATE_PLANNING_METHODS: readonly AggregatePlanningMethod[] = ['aggregate-plan-costs'];

function isAggregatePlanningMethod(value: string): value is AggregatePlanningMethod {
  return (AGGREGATE_PLANNING_METHODS as readonly string[]).includes(value);
}

/** Задачі рушія агрегатного планування з пулу практичної; методи, що належать іншому рушію, тихо пропускаються. */
export function toAggregatePlanningTaskChoices(tasks: readonly CalculationTask[]): readonly AggregatePlanningTaskChoice[] {
  return tasks.filter((task): task is CalculationTask & { method: AggregatePlanningMethod } => isAggregatePlanningMethod(task.method)).map((task) => ({ method: task.method }));
}

export type AggregatePlanningAnswer = Readonly<Record<string, string>>;

export const EMPTY_AGGREGATE_PLANNING_ANSWER: AggregatePlanningAnswer = {};

export function checkAggregatePlanningTask(variant: AggregatePlanningVariant, answer: AggregatePlanningAnswer): Result<TaskCheck, FieldIssues> {
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
export function findAggregatePlanningTask(tasks: readonly CalculationTask[], variant: Pick<AggregatePlanningVariant, 'method'>): CalculationTask | undefined {
  return tasks.find((task) => task.method === variant.method);
}
