/**
 * Перевірка відповіді тренажера придатності процесу: поля варіанта (`ProcessCapabilityVariant.answers`)
 * через спільний `checkNumberPart`/`combineParts` (ui/parts.tsx). Пул задач — лише метод
 * `process-capability`; решта задач набору практичної p07 належить сусіднім тренажерам
 * (`cpm-pert`, `control-charts`) і тут пропускається.
 */
import type { Result } from '../../../engines/shared/result';
import type { ProcessCapabilityMethod, ProcessCapabilityTaskChoice, ProcessCapabilityVariant } from '../../../engines/process-capability';
import type { CalculationTask } from '../../../content/schemas/practical';
import { checkChoicePart, checkNumberPart, combineParts, type FieldIssues, type TaskCheck, type YesNo } from './task-check';
import { num } from './format';

const PROCESS_CAPABILITY_METHODS: readonly ProcessCapabilityMethod[] = ['process-capability'];

function isProcessCapabilityMethod(value: string): value is ProcessCapabilityMethod {
  return (PROCESS_CAPABILITY_METHODS as readonly string[]).includes(value);
}

export function toProcessCapabilityTaskChoices(tasks: readonly CalculationTask[]): readonly ProcessCapabilityTaskChoice[] {
  return tasks.filter((task): task is CalculationTask & { method: ProcessCapabilityMethod } => isProcessCapabilityMethod(task.method)).map((task) => ({ method: task.method }));
}

export interface ProcessCapabilityAnswer {
  readonly [fieldId: string]: string;
}

export const EMPTY_PROCESS_CAPABILITY_ANSWER: ProcessCapabilityAnswer = { notCentered: '' };

const NOT_CENTERED_YES = 'не центрований';
const NOT_CENTERED_NO = 'центрований';

export function checkProcessCapabilityTask(variant: ProcessCapabilityVariant, answer: ProcessCapabilityAnswer): Result<TaskCheck, FieldIssues> {
  const numberParts = variant.answers.map((field) =>
    checkNumberPart({
      id: field.id,
      label: field.label,
      text: answer[field.id] ?? '',
      expected: field.expected,
      tolerance: field.tolerance,
      format: (value) => `${num(value)}${field.unit ? ` ${field.unit}` : ''}`,
    }),
  );
  const notCenteredPart = checkChoicePart({
    id: variant.notCentered.id,
    label: variant.notCentered.label,
    value: (answer[variant.notCentered.id] ?? '') as YesNo,
    expected: variant.notCentered.expected,
    yes: NOT_CENTERED_YES,
    no: NOT_CENTERED_NO,
  });
  return combineParts([...numberParts, notCenteredPart]);
}

export function findProcessCapabilityTask(tasks: readonly CalculationTask[], variant: Pick<ProcessCapabilityVariant, 'method'>): CalculationTask | undefined {
  return tasks.find((task) => task.method === variant.method);
}
