/**
 * Перевірка відповіді тренажера балансування лінії: кожне поле варіанта (`LineBalancingVariant.answers`)
 * — окрема частина `TaskCheck` через спільний `checkNumberPart`/`combineParts` (ui/parts.tsx).
 * `content/practicals/p04.yaml` містить задачі трьох тренажерів практичної в одному списку
 * `trainer.tasks` — острів фільтрує собі лише відомий метод (`line-balance`), а не кидає помилку
 * на чужі методи інших тренажерів тієї самої практичної.
 */
import type { Result } from '../../../engines/shared/result';
import type { LineBalancingMethod, LineBalancingTaskChoice, LineBalancingVariant } from '../../../engines/line-balancing';
import type { CalculationTask } from '../../../content/schemas/practical';
import { checkNumberPart, combineParts, type FieldIssues, type TaskCheck } from './task-check';
import { num } from './format';

const LINE_BALANCING_METHODS: readonly LineBalancingMethod[] = ['line-balance'];

function isLineBalancingMethod(value: string): value is LineBalancingMethod {
  return (LINE_BALANCING_METHODS as readonly string[]).includes(value);
}

/** Пул задач для генератора: лише ті задачі контенту, чий метод відомий цьому рушію. */
export function toLineBalancingTaskChoices(tasks: readonly CalculationTask[]): readonly LineBalancingTaskChoice[] {
  return tasks.filter((task): task is CalculationTask & { method: LineBalancingMethod } => isLineBalancingMethod(task.method)).map((task) => ({ method: task.method }));
}

export type LineBalancingAnswer = Readonly<Record<string, string>>;

export const EMPTY_LINE_BALANCING_ANSWER: LineBalancingAnswer = {};

export function checkLineBalancingTask(variant: LineBalancingVariant, answer: LineBalancingAnswer): Result<TaskCheck, FieldIssues> {
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
export function findCalculationTask(tasks: readonly CalculationTask[], variant: Pick<LineBalancingVariant, 'method'>): CalculationTask | undefined {
  return tasks.find((task) => task.method === variant.method);
}
