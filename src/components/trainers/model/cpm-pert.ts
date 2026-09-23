/**
 * Перевірка відповіді тренажера сітьового планування: кожне поле варіанта (`CpmPertVariant.answers`) —
 * окрема частина `TaskCheck` через спільний `checkNumberPart`/`combineParts` (ui/parts.tsx). Практична
 * p07 має три React-острови на одному наборі задач контенту (`cpm-pert`, `control-charts`,
 * `process-capability`), тому пул тут — лише задачі з методами, які знає саме цей рушій; задачі інших
 * методів просто пропускаються, а не вважаються помилкою контенту (на відміну від тренажера з єдиним
 * методом, як `productivity`).
 */
import type { Result } from '../../../engines/shared/result';
import type { CpmPertMethod, CpmPertTaskChoice, CpmPertVariant } from '../../../engines/cpm-pert';
import type { CalculationTask } from '../../../content/schemas/practical';
import { checkNumberPart, combineParts, type FieldIssues, type TaskCheck } from './task-check';
import { num } from './format';

export const CPM_PERT_METHODS: readonly CpmPertMethod[] = ['cpm-critical-path', 'pert-probability'];

function isCpmPertMethod(value: string): value is CpmPertMethod {
  return (CPM_PERT_METHODS as readonly string[]).includes(value);
}

/** Задачі практичної, метод яких належить рушію сітьового планування — решта належить сусіднім тренажерам. */
export function toCpmPertTaskChoices(tasks: readonly CalculationTask[]): readonly CpmPertTaskChoice[] {
  return tasks.filter((task): task is CalculationTask & { method: CpmPertMethod } => isCpmPertMethod(task.method)).map((task) => ({ method: task.method }));
}

export type CpmPertAnswer = Readonly<Record<string, string>>;

export const EMPTY_CPM_PERT_ANSWER: CpmPertAnswer = {};

export function checkCpmPertTask(variant: CpmPertVariant, answer: CpmPertAnswer): Result<TaskCheck, FieldIssues> {
  const parts = variant.answers.map((field) =>
    checkNumberPart({
      id: field.id,
      label: field.label,
      text: answer[field.id] ?? '',
      expected: field.expected,
      tolerance: field.tolerance,
      format: (value) => `${num(value)} ${field.unit}`.trim(),
    }),
  );
  return combineParts(parts);
}

/** Задача контенту, з якої згенеровано варіант — для показу формули й джерела. */
export function findCpmPertTask(tasks: readonly CalculationTask[], variant: Pick<CpmPertVariant, 'method'>): CalculationTask | undefined {
  return tasks.find((task) => task.method === variant.method);
}
