/**
 * Перевірка відповіді тренажера закону Літтла: єдине поле варіанта (`LittleLawVariant.answers`) —
 * частина `TaskCheck` через спільний `checkNumberPart` (ui/parts.tsx), і зіставлення варіанта з формулою
 * та джерелом із `content/practicals/p03.yaml` (потрібне лише для показу — рушій рахунку про схему
 * контенту не знає).
 */
import type { Result } from '../../../engines/shared/result';
import type { LittleLawMethod, LittleLawUnknown, LittleLawVariant } from '../../../engines/little-law';
import type { CalculationTask } from '../../../content/schemas/practical';
import { checkNumberPart, combineParts, type FieldIssues, type TaskCheck } from './task-check';
import { num } from './format';

/**
 * Схема контенту тримає `method` вільним рядком, тому список методів, які насправді вміє рушій закону
 * Літтла, звіряється тут — під час побудови пулу задач острова, а не всередині схеми. `resource`
 * позначає, яку з трьох величин (L, λ, W) шукає студент у цьому типі задачі.
 */
const LITTLE_LAW_METHODS: readonly LittleLawMethod[] = ['little-law'];
const LITTLE_LAW_UNKNOWNS: readonly LittleLawUnknown[] = ['wip', 'throughput', 'time'];

function isLittleLawMethod(value: string): value is LittleLawMethod {
  return (LITTLE_LAW_METHODS as readonly string[]).includes(value);
}

function isLittleLawUnknown(value: string): value is LittleLawUnknown {
  return (LITTLE_LAW_UNKNOWNS as readonly string[]).includes(value);
}

export interface LittleLawTaskChoice {
  readonly method: LittleLawMethod;
  readonly unknown: LittleLawUnknown;
}

/** Пул задач для генератора з контенту практичної; невідомий `method`/`resource` — помилка контенту. */
export function toLittleLawTaskChoices(tasks: readonly CalculationTask[]): readonly LittleLawTaskChoice[] {
  return tasks.map((task) => {
    if (!isLittleLawMethod(task.method)) throw new Error(`Задача «${task.id}»: невідомий метод «${task.method}» для рушія закону Літтла`);
    if (!task.resource || !isLittleLawUnknown(task.resource)) {
      throw new Error(`Задача «${task.id}»: невідома шукана величина «${task.resource}» для закону Літтла`);
    }
    return { method: task.method, unknown: task.resource };
  });
}

export type LittleLawAnswer = Readonly<Record<string, string>>;

export const EMPTY_LITTLE_LAW_ANSWER: LittleLawAnswer = {};

export function checkLittleLawTask(variant: LittleLawVariant, answer: LittleLawAnswer): Result<TaskCheck, FieldIssues> {
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

/** Задача контенту, з якої згенеровано варіант: той самий метод і шукана величина (`resource`). */
export function findCalculationTask(tasks: readonly CalculationTask[], variant: Pick<LittleLawVariant, 'method' | 'unknown'>): CalculationTask | undefined {
  return tasks.find((task) => task.method === variant.method && task.resource === variant.unknown);
}
