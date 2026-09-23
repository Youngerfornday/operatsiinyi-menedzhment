/**
 * Перевірка відповіді тренажера придатності процесу: поля варіанта (`ProcessCapabilityVariant.answers`)
 * через спільний `checkNumberPart`/`combineParts` (ui/parts.tsx). Пул задач — лише метод
 * `process-capability`; решта задач набору практичної p07 належить сусіднім тренажерам
 * (`cpm-pert`, `control-charts`) і тут пропускається.
 */
import type { Result } from '../../../engines/shared/result';
import type { ProcessCapabilityMethod, ProcessCapabilityTaskChoice, ProcessCapabilityVariant } from '../../../engines/process-capability';
import type { CalculationTask } from '../../../content/schemas/practical';
import { checkNumberPart, combineParts, type FieldIssues, type TaskCheck } from './task-check';
import { num } from './format';

const PROCESS_CAPABILITY_METHODS: readonly ProcessCapabilityMethod[] = ['process-capability'];

function isProcessCapabilityMethod(value: string): value is ProcessCapabilityMethod {
  return (PROCESS_CAPABILITY_METHODS as readonly string[]).includes(value);
}

export function toProcessCapabilityTaskChoices(tasks: readonly CalculationTask[]): readonly ProcessCapabilityTaskChoice[] {
  return tasks.filter((task): task is CalculationTask & { method: ProcessCapabilityMethod } => isProcessCapabilityMethod(task.method)).map((task) => ({ method: task.method }));
}

export type ProcessCapabilityAnswer = Readonly<Record<string, string>>;

export const EMPTY_PROCESS_CAPABILITY_ANSWER: ProcessCapabilityAnswer = {};

export function checkProcessCapabilityTask(variant: ProcessCapabilityVariant, answer: ProcessCapabilityAnswer): Result<TaskCheck, FieldIssues> {
  const parts = variant.answers.map((field) =>
    checkNumberPart({
      id: field.id,
      label: field.label,
      text: answer[field.id] ?? '',
      expected: field.expected,
      tolerance: field.tolerance,
      format: (value) => `${num(value)}${field.unit ? ` ${field.unit}` : ''}`,
    }),
  );
  return combineParts(parts);
}

export function findProcessCapabilityTask(tasks: readonly CalculationTask[], variant: Pick<ProcessCapabilityVariant, 'method'>): CalculationTask | undefined {
  return tasks.find((task) => task.method === variant.method);
}
