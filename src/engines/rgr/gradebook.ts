import { err, ok, type Result } from '../shared/result';

/**
 * Номер залікової книжки → варіант РГР (`content/course.yaml` → `grading.caseProject.companyCriteria`).
 *
 * Правило нормалізації:
 * - Допустимі символи — лише цифри 0–9. Чи буває в номера залікової книжки літерна серія, ми не
 *   перевіряли, тож не вгадуємо формат серії — просто відмовляємо на будь-якій літері (кириличній
 *   чи латинській). Якщо виявиться, що серія потрібна, це єдине місце, де розширювати правило.
 * - Роздільники — будь-який пробіл (зокрема нерозривний, `\s` покриває обидва) і будь-яке
 *   тире/дефіс (Unicode-категорія Pd: звичайний дефіс, en dash, em dash тощо) чи знак мінуса:
 *   вирізаються перед перевіркою. Крапка й похила риска роздільниками НЕ вважаються — найімовірніше,
 *   це помилка вводу (номер телефону, дата), а не номер залікової книжки.
 * - Довжина — від MIN_DIGITS до MAX_DIGITS значущих цифр (без ведучих нулів). Нижня межа навмисно
 *   вища за дві цифри: за старою схемою варіант визначали останні дві цифри, і звичка ввести саме
 *   їх мовчки підсунула б студентові чужий варіант замість помилки.
 * - Ведучі нулі не впливають на варіант і не показуються: «0067» після нормалізації — той самий
 *   номер, що й «67» (і однаково зазнає помилки «закороткий», якщо значущих цифр менше за MIN_DIGITS).
 *
 * Варіант обчислюється детермінованим хешем УСЬОГО нормалізованого номера — не лише двох останніх
 * цифр, як було раніше (`seedForGradebookNumber`). Той самий номер завжди дає той самий варіант;
 * різні номери — з дуже високою ймовірністю різні варіанти, навіть коли їхні останні цифри
 * збігаються (властивісні тести: `gradebook.test.ts`, `variant.test.ts`, `solvability.test.ts`).
 */
export type GradebookErrorCode = 'empty' | 'invalid-format' | 'too-short' | 'too-long';

export interface GradebookError {
  readonly code: GradebookErrorCode;
  readonly message: string;
}

/** Нормалізований номер залікової книжки: лише цифри, без роздільників і без ведучих нулів. */
export interface GradebookNumber {
  readonly digits: string;
}

/** Будь-який пробіл (зокрема нерозривний) і будь-яке тире/дефіс (Unicode Pd) чи знак мінуса. */
const SEPARATORS = /[\s\p{Pd}−]/gu;
/** Нижня межа значущих цифр — навмисно більша за 2, див. правило нормалізації вище. */
const MIN_DIGITS = 4;
/** Верхня межа — запобіжник від вставки явно зайвого тексту чи числа не з залікової книжки. */
const MAX_DIGITS = 20;
/** Ведучі нулі, за якими йде ще хоч одна цифра: «0067» → «67», «0000» → «0» (не зникає зовсім). */
const LEADING_ZEROS = /^0+(?=\d)/;

export const GRADEBOOK_ERROR_MESSAGES: Readonly<Record<GradebookErrorCode, string>> = {
  empty: 'Уведіть номер залікової книжки.',
  'invalid-format': 'Уведіть лише цифри номера, без літер серії.',
  'too-short': 'Номер закороткий: уведіть повний номер залікової книжки, а не дві останні цифри.',
  'too-long': `Номер задовгий: у залікової книжки не буває понад ${MAX_DIGITS} цифр.`,
};

function fail(code: GradebookErrorCode): Result<GradebookNumber, GradebookError> {
  return err({ code, message: GRADEBOOK_ERROR_MESSAGES[code] });
}

/**
 * Той самий номер без ведучих нулів («0067001» → «67001», «0000» → «0»). Єдине місце цієї
 * нормалізації — `parseGradebookNumber`, `seedForGradebookNumber` і `createRgrVariantForDigits`
 * (variant.ts) усі проганяють через неї, тож ведучі нулі ніде не просочуються в дані чи в показ.
 */
export function normalizeGradebookDigits(digits: string): string {
  return digits.replace(LEADING_ZEROS, '');
}

/** Перевіряє й нормалізує ввід студента; помилки — українською, без винятків. */
export function parseGradebookNumber(input: string): Result<GradebookNumber, GradebookError> {
  const trimmed = input.trim();
  if (trimmed.length === 0) return fail('empty');

  const withoutSeparators = trimmed.replace(SEPARATORS, '');
  if (withoutSeparators.length === 0) return fail('empty');
  if (!/^\d+$/.test(withoutSeparators)) return fail('invalid-format');
  if (withoutSeparators.length > MAX_DIGITS) return fail('too-long');

  const digits = normalizeGradebookDigits(withoutSeparators);
  if (digits.length < MIN_DIGITS) return fail('too-short');

  return ok({ digits });
}

/**
 * Ключ детермінованого зерна рушія — УВЕСЬ нормалізований номер залікової книжки, без ведучих
 * нулів. Захисно нормалізує ще раз (не покладається на те, що виклик прийшов саме з
 * `parseGradebookNumber`), тож `seedForGradebookNumber('0067001')` і `seedForGradebookNumber('67001')`
 * дають той самий ключ.
 */
export function seedForGradebookNumber(digits: string): string {
  return `rgr-variant:${normalizeGradebookDigits(digits)}`;
}
