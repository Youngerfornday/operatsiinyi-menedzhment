/**
 * Перевірка відповіді тренажера закону Літтла: єдине поле варіанта (`LittleLawVariant.answers`) —
 * частина `TaskCheck` через спільний `checkNumberPart` (ui/parts.tsx), і зіставлення варіанта з формулою
 * та джерелом із `content/practicals/p03.yaml` (потрібне лише для показу — рушій рахунку про схему
 * контенту не знає).
 *
 * `content/practicals/p03.yaml` містить задачі двох тренажерів практичної в одному списку
 * `trainer.tasks` (закон Літтла й тривалість виробничого циклу) — кожен острів фільтрує собі лише
 * відомі йому методи, а не кидає помилку на чужі: список свідомо спільний для practicals[].trainers.
 */
import type { Result } from '../../../engines/shared/result';
import type { LittleLawMethod, LittleLawUnknown, LittleLawVariant } from '../../../engines/little-law';
import type { CalculationTask } from '../../../content/schemas/practical';
import { checkNumberPart, combineParts, type FieldIssues, type TaskCheck } from './task-check';
import { num } from './format';
import { pluralUk } from '../../../lib/plural';

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

/** Пул задач для генератора: лише ті задачі контенту, чий метод і шукана величина відомі цьому рушію. */
export function toLittleLawTaskChoices(tasks: readonly CalculationTask[]): readonly LittleLawTaskChoice[] {
  return tasks.flatMap((task) => {
    if (!isLittleLawMethod(task.method) || !task.resource || !isLittleLawUnknown(task.resource)) return [];
    return [{ method: task.method, unknown: task.resource }];
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
      format: (value) => (field.unitForms ? pluralUk(value, field.unitForms) : `${num(value)} ${field.unit}`),
    }),
  );
  return combineParts(parts);
}

/** Задача контенту, з якої згенеровано варіант: той самий метод і шукана величина (`resource`). */
export function findCalculationTask(tasks: readonly CalculationTask[], variant: Pick<LittleLawVariant, 'method' | 'unknown'>): CalculationTask | undefined {
  return tasks.find((task) => task.method === variant.method && task.resource === variant.unknown);
}
