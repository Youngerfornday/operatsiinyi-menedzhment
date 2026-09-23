/**
 * Перевірка відповіді тренажера прогнозування: кожне поле варіанта (`ForecastingVariant.answers`) —
 * окрема частина `TaskCheck` через спільний `checkNumberPart`/`combineParts` (ui/parts.tsx), і зіставлення
 * варіанта з формулою та джерелом із `content/practicals/p05.yaml` (потрібне лише для показу — рушій
 * рахунку про схему контенту не знає).
 *
 * Практична p05 поєднує в одному `trainer.tasks` методи ДВОХ рушіїв (прогнозування й агрегатне
 * планування — `src/components/trainers/model/aggregate-planning.ts`), тому на відміну від
 * `model/productivity.ts` (єдиний рушій на файл, невідомий метод — помилка контенту) тут метод,
 * невідомий цьому рушію, просто відфільтровується: він призначений іншому тренажеру практичної.
 */
import type { Result } from '../../../engines/shared/result';
import type { ForecastingMethod, ForecastingTaskChoice, ForecastingVariant } from '../../../engines/forecasting';
import type { CalculationTask } from '../../../content/schemas/practical';
import { checkNumberPart, combineParts, type FieldIssues, type TaskCheck } from './task-check';
import { num } from './format';

export const FORECASTING_METHODS: readonly ForecastingMethod[] = [
  'forecast-moving-average',
  'forecast-weighted-moving-average',
  'forecast-exponential-smoothing',
  'forecast-mad',
  'forecast-mse',
  'forecast-mape',
];

function isForecastingMethod(value: string): value is ForecastingMethod {
  return (FORECASTING_METHODS as readonly string[]).includes(value);
}

/** Задачі рушія прогнозування з пулу практичної; методи, що належать іншому рушію, тихо пропускаються. */
export function toForecastingTaskChoices(tasks: readonly CalculationTask[]): readonly ForecastingTaskChoice[] {
  return tasks.filter((task): task is CalculationTask & { method: ForecastingMethod } => isForecastingMethod(task.method)).map((task) => ({ method: task.method }));
}

export type ForecastingAnswer = Readonly<Record<string, string>>;

export const EMPTY_FORECASTING_ANSWER: ForecastingAnswer = {};

export function checkForecastingTask(variant: ForecastingVariant, answer: ForecastingAnswer): Result<TaskCheck, FieldIssues> {
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
export function findForecastingTask(tasks: readonly CalculationTask[], variant: Pick<ForecastingVariant, 'method'>): CalculationTask | undefined {
  return tasks.find((task) => task.method === variant.method);
}
