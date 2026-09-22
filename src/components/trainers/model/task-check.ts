/**
 * Розбір полів форми тренажера і перевірка відповіді студента на задачу. Числа читає `parseDecimalInput`
 * рушія («1,5», «1 250,5»), помилки повертаються з полем — острів показує їх біля поля.
 */
import { parseDecimalInput } from '../../../engines/shared/decimal-input';
import { err, ok, type Result } from '../../../engines/shared/result';

export interface FieldSpec {
  /** Технічна назва поля (ключ вхідного об’єкта). */
  readonly field: string;
  /** Назва поля для людини. */
  readonly label: string;
}

export interface FieldIssue {
  readonly field: string;
  readonly message: string;
}

export type FieldIssues = readonly FieldIssue[];

/** Розбір тексту поля тренажера: число або помилка з полем, за яким острів підсвітить проблему. */
export function parseFieldInput(text: string, spec: FieldSpec): Result<number, FieldIssue> {
  const value = parseDecimalInput(text);
  if (value === null) return err({ field: spec.field, message: `Поле «${spec.label}» має бути числом, наприклад 1,5.` });
  return ok(value);
}

/** Усі поля розбираються разом, щоб показати всі помилки формату одразу. */
export function parseFields<K extends string>(values: Readonly<Record<K, string>>, specs: Readonly<Record<K, FieldSpec>>): Result<Record<K, number>, FieldIssues> {
  const keys = Object.keys(specs) as K[];
  const parsed = keys.map((key) => [key, parseFieldInput(values[key] ?? '', specs[key])] as const);
  const issues = parsed.flatMap(([, result]) => (result.ok ? [] : [result.error]));
  if (issues.length > 0) return err(issues);
  return ok(Object.fromEntries(parsed.map(([key, result]) => [key, result.ok ? result.value : 0])) as Record<K, number>);
}

export const PERCENT_SCALE = 100;

export type YesNo = 'yes' | 'no' | '';

export interface TaskPart {
  readonly id: string;
  readonly label: string;
  readonly given: string;
  readonly expected: string;
  readonly correct: boolean;
}

export interface TaskCheck {
  readonly solved: boolean;
  readonly parts: readonly TaskPart[];
}

export interface NumberPartSpec {
  readonly id: string;
  readonly label: string;
  readonly text: string;
  readonly expected: number;
  /** Допуск за модулем: 0 — точне ціле, 0,005 — до копійки тощо. */
  readonly tolerance: number;
  readonly format: (value: number) => string;
}

/** Похибка double: 0,1 + 0,2 не дорівнює 0,3, тому до допуску додається мізерний запас. */
const FLOAT_SLACK = 1e-9;

export function checkNumberPart(spec: NumberPartSpec): Result<TaskPart, FieldIssue> {
  const parsed = parseFieldInput(spec.text, { field: spec.id, label: spec.label });
  if (!parsed.ok) return err(parsed.error);
  const correct = Math.abs(parsed.value - spec.expected) <= spec.tolerance + FLOAT_SLACK;
  return ok({ id: spec.id, label: spec.label, given: spec.format(parsed.value), expected: spec.format(spec.expected), correct });
}

export interface ChoicePartSpec {
  readonly id: string;
  readonly label: string;
  readonly value: YesNo;
  readonly expected: boolean;
  readonly yes: string;
  readonly no: string;
}

export function checkChoicePart(spec: ChoicePartSpec): Result<TaskPart, FieldIssue> {
  if (spec.value === '') return err({ field: spec.id, message: `Оберіть відповідь на питання «${spec.label}».` });
  const given = spec.value === 'yes';
  return ok({ id: spec.id, label: spec.label, given: given ? spec.yes : spec.no, expected: spec.expected ? spec.yes : spec.no, correct: given === spec.expected });
}

export function combineParts(results: readonly Result<TaskPart, FieldIssue>[]): Result<TaskCheck, FieldIssues> {
  const issues = results.flatMap((result) => (result.ok ? [] : [result.error]));
  if (issues.length > 0) return err(issues);
  const parts = results.flatMap((result) => (result.ok ? [result.value] : []));
  return ok({ solved: parts.every((part) => part.correct), parts });
}

/** Зведення помилок у мапу «поле → повідомлення» для рендера біля полів. */
export function issuesByField(issues: FieldIssues): Readonly<Record<string, string>> {
  return Object.fromEntries(issues.map((issue) => [issue.field, issue.message]));
}
