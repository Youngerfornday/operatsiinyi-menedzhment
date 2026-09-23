/**
 * Перевірка відповіді тренажера контрольних карт: числові межі варіанта (`ControlChartVariant.answers`)
 * через `checkNumberPart`, плюс одне питання «так/ні» про сигнал розладнання (`checkChoicePart`) —
 * разом через спільний `combineParts` (ui/parts.tsx). Пул задач — лише методи `xbar-r-chart` і
 * `p-chart`; решта задач набору практичної p07 належить сусіднім тренажерам і тут пропускається.
 */
import type { Result } from '../../../engines/shared/result';
import type { ControlChartMethod, ControlChartTaskChoice, ControlChartVariant } from '../../../engines/control-charts';
import type { CalculationTask } from '../../../content/schemas/practical';
import { checkChoicePart, checkNumberPart, combineParts, type FieldIssues, type TaskCheck, type YesNo } from './task-check';
import { num } from './format';

const CONTROL_CHART_METHODS: readonly ControlChartMethod[] = ['xbar-r-chart', 'p-chart'];

function isControlChartMethod(value: string): value is ControlChartMethod {
  return (CONTROL_CHART_METHODS as readonly string[]).includes(value);
}

export function toControlChartTaskChoices(tasks: readonly CalculationTask[]): readonly ControlChartTaskChoice[] {
  return tasks.filter((task): task is CalculationTask & { method: ControlChartMethod } => isControlChartMethod(task.method)).map((task) => ({ method: task.method }));
}

export interface ControlChartAnswer {
  readonly [fieldId: string]: string;
}

export const EMPTY_CONTROL_CHART_ANSWER: ControlChartAnswer = { signal: '' };

const SIGNAL_YES = 'сигналізує про розладнання';
const SIGNAL_NO = 'сигналу немає';

export function checkControlChartTask(variant: ControlChartVariant, answer: ControlChartAnswer): Result<TaskCheck, FieldIssues> {
  const numberParts = variant.answers.map((field) =>
    checkNumberPart({
      id: field.id,
      label: field.label,
      text: answer[field.id] ?? '',
      expected: field.expected,
      tolerance: field.tolerance,
      format: (value) => `${num(value)} ${field.unit}`.trim(),
    }),
  );
  const signalPart = checkChoicePart({
    id: variant.signal.id,
    label: variant.signal.label,
    value: (answer[variant.signal.id] ?? '') as YesNo,
    expected: variant.signal.expected,
    yes: SIGNAL_YES,
    no: SIGNAL_NO,
  });
  return combineParts([...numberParts, signalPart]);
}

export function findControlChartTask(tasks: readonly CalculationTask[], variant: Pick<ControlChartVariant, 'method'>): CalculationTask | undefined {
  return tasks.find((task) => task.method === variant.method);
}
