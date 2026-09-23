/**
 * Перевірка відповіді тренажера MRP: кожне поле варіанта (`MrpVariant.answers`) — окрема частина
 * `TaskCheck` через спільний `checkNumberPart`/`combineParts` (ui/parts.tsx). На відміну від
 * `model/productivity.ts`, тут немає вибору методу — рушій завжди виконує те саме розгортання
 * специфікації, тому немає `toXxxTaskChoices`, лише фільтр `mrpFormulaTasks` для показу формул.
 *
 * `content/practicals/p06.yaml` містить задачі трьох різних тренажерів практичної в одному списку
 * `trainer.tasks` (EOQ, MRP, черговість) — цей острів фільтрує собі лише свої три формули (MRP-01..03),
 * решту (EOQ, SPT/EDD) ігнорує.
 */
import type { Result } from '../../../engines/shared/result';
import type { MrpVariant } from '../../../engines/mrp';
import type { CalculationTask } from '../../../content/schemas/practical';
import { checkNumberPart, combineParts, type FieldIssues, type TaskCheck } from './task-check';
import { num } from './format';

export const MRP_METHODS: readonly string[] = ['gross-requirement', 'net-requirement', 'lot-for-lot'];

/** Формули MRP для показу (`SourceNotes`) — лише ті задачі спільного списку, чий метод належить цьому тренажеру. */
export function mrpFormulaTasks(tasks: readonly CalculationTask[]): readonly CalculationTask[] {
  return tasks.filter((task) => MRP_METHODS.includes(task.method));
}

export type MrpAnswer = Readonly<Record<string, string>>;

export const EMPTY_MRP_ANSWER: MrpAnswer = {};

export function checkMrpTask(variant: MrpVariant, answer: MrpAnswer): Result<TaskCheck, FieldIssues> {
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
