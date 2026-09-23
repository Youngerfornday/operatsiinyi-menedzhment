/**
 * Перевірка відповіді тренажера продуктивності: кожне поле варіанта (`ProductivityVariant.answers`) —
 * окрема частина `TaskCheck` через спільний `checkNumberPart`/`combineParts` (ui/parts.tsx), і зіставлення
 * варіанта з формулою та джерелом із `content/practicals/p01.yaml` (потрібне лише для показу — рушій
 * рахунку про схему контенту не знає).
 */
import type { Result } from '../../../engines/shared/result';
import type { ProductivityMethod, ProductivityTaskChoice, ProductivityVariant } from '../../../engines/productivity';
import type { CalculationTask } from '../../../content/schemas/practical';
import { checkNumberPart, combineParts, type FieldIssues, type TaskCheck } from './task-check';
import { num } from './format';

/**
 * Схема контенту тримає `method` вільним рядком (щоб її могли перевикористати калькулятори інших
 * практичних), тому список методів, які насправді вміє рушій продуктивності, звіряється тут — під час
 * побудови пулу задач острова, а не всередині схеми.
 */
const PRODUCTIVITY_METHODS: readonly ProductivityMethod[] = ['partial-productivity', 'multifactor-productivity', 'productivity-index', 'capacity-usage', 'capacity-efficiency'];

function isProductivityMethod(value: string): value is ProductivityMethod {
  return (PRODUCTIVITY_METHODS as readonly string[]).includes(value);
}

/** Пул задач для генератора з контенту практичної; невідомий `method` — помилка контенту, а не тиха відмова. */
export function toProductivityTaskChoices(tasks: readonly CalculationTask[]): readonly ProductivityTaskChoice[] {
  return tasks.map((task) => {
    if (!isProductivityMethod(task.method)) throw new Error(`Задача «${task.id}»: невідомий метод «${task.method}» для рушія продуктивності`);
    return { method: task.method, resource: task.resource };
  });
}

export type ProductivityAnswer = Readonly<Record<string, string>>;

export const EMPTY_PRODUCTIVITY_ANSWER: ProductivityAnswer = {};

export function checkProductivityTask(variant: ProductivityVariant, answer: ProductivityAnswer): Result<TaskCheck, FieldIssues> {
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

/** Задача контенту, з якої згенеровано варіант: та сама `method` (і `resource` для часткової продуктивності). */
export function findCalculationTask(tasks: readonly CalculationTask[], variant: Pick<ProductivityVariant, 'method' | 'resource'>): CalculationTask | undefined {
  return tasks.find((task) => task.method === variant.method && (variant.resource === undefined || task.resource === variant.resource));
}
