import { createSeededRandom } from '../shared/random';
import { err, ok, type Result } from '../shared/result';

/**
 * Номер залікової книжки → варіант РГР (`content/course.yaml` → `grading.caseProject.companyCriteria`).
 *
 * Правило нормалізації:
 * - Допустимі символи — лише цифри 0–9. У номера залікової книжки цього факультету немає літерної
 *   серії, тож будь-яка літера (кирилична чи латинська) — завжди помилка формату; регістр тут не
 *   впливає на нічого, бо літер не буває взагалі. Якщо серія колись з'явиться в номерах — це єдине
 *   місце, де її додавати до правила.
 * - Роздільники — пробіл (зокрема нерозривний, `\s` його покриває) і дефіс: вирізаються перед
 *   перевіркою, тож «2040-1267», «2040 1267» і «20401267» — той самий номер.
 * - Порожній ввід і ввід коротший за 2 цифри — явна помилка формату, а не тихий нуль.
 * - Провідні нулі не відкидаються: номер лишається рядком цифр, а не числом.
 *
 * Варіант обчислюється детермінованим хешем УСЬОГО нормалізованого номера — не лише двох останніх
 * цифр, як було раніше (`seedForGradebookNumber`). Той самий номер завжди дає той самий варіант;
 * різні номери — з дуже високою ймовірністю різні варіанти, навіть коли їхні останні дві цифри
 * збігаються (властивісні тести: `gradebook.test.ts`, `variant.test.ts`, `solvability.test.ts`).
 */
export type GradebookErrorCode = 'empty' | 'invalid-format' | 'too-short';

export interface GradebookError {
  readonly code: GradebookErrorCode;
  readonly message: string;
}

export const GRADEBOOK_ERROR_MESSAGES: Readonly<Record<GradebookErrorCode, string>> = {
  empty: 'Уведіть номер залікової книжки.',
  'invalid-format': 'Номер залікової книжки має містити лише цифри (дозволені пробіли й дефіси як роздільники).',
  'too-short': 'Номер закороткий: потрібні щонайменше дві цифри, щоб визначити варіант.',
};

/** Нормалізований номер залікової книжки: лише цифри, без роздільників. */
export interface GradebookNumber {
  readonly digits: string;
}

const SEPARATORS = /[\s-]/g;
const MIN_DIGITS = 2;
/**
 * Діапазон показового «номера варіанта» — лише зручний ярлик для студента й викладача
 * (`displayVariantNumber`). Самі вихідні дані варіанта визначає не він, а
 * `seedForGradebookNumber(digits)`, тож розмір цього діапазону не впливає на розв'язність.
 */
const DISPLAY_VARIANT_SPACE = 999_999;

function fail(code: GradebookErrorCode): Result<GradebookNumber, GradebookError> {
  return err({ code, message: GRADEBOOK_ERROR_MESSAGES[code] });
}

/** Перевіряє й нормалізує ввід студента; помилки — українською, без винятків. */
export function parseGradebookNumber(input: string): Result<GradebookNumber, GradebookError> {
  const trimmed = input.trim();
  if (trimmed.length === 0) return fail('empty');

  const withoutSeparators = trimmed.replace(SEPARATORS, '');
  if (withoutSeparators.length === 0) return fail('empty');
  if (!/^\d+$/.test(withoutSeparators)) return fail('invalid-format');
  if (withoutSeparators.length < MIN_DIGITS) return fail('too-short');

  return ok({ digits: withoutSeparators });
}

/** Ключ детермінованого зерна рушія — УВЕСЬ нормалізований номер залікової книжки. */
export function seedForGradebookNumber(digits: string): string {
  return `rgr-variant:${digits}`;
}

/**
 * Показовий номер варіанта (1..999 999) для інтерфейсу — похідний від усього номера залікової
 * книжки через окреме зерно (`rgr-display:`), тому не споживає випадковість, яку
 * `seedForGradebookNumber` віддає генерації самих даних варіанта.
 */
export function displayVariantNumber(digits: string): number {
  const random = createSeededRandom(`rgr-display:${digits}`);
  return 1 + Math.floor(random.next() * DISPLAY_VARIANT_SPACE);
}
