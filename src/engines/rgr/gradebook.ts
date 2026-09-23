import { err, ok, type Result } from '../shared/result';

/**
 * Номер залікової книжки → номер варіанта РГР. За умовою `companyCriteria` course.yaml варіант
 * визначається останніми двома цифрами номера: студенти з однаковими двома останніми цифрами
 * отримують той самий варіант (навмисно — це саме та ознака, за якою викладач ловить копії).
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
  /** 1..100 — номер варіанта РГР (00 на кінці номера відповідає варіанту 100). */
  readonly variantNumber: number;
}

const SEPARATORS = /[\s  -]/g;
const MIN_DIGITS = 2;
const VARIANT_COUNT = 100;

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

  const lastTwo = Number(withoutSeparators.slice(-2));
  const variantNumber = lastTwo === 0 ? VARIANT_COUNT : lastTwo;
  return ok({ digits: withoutSeparators, variantNumber });
}

/** Ключ детермінованого зерна рушія — лише номер варіанта, а не весь номер книжки. */
export function seedForVariant(variantNumber: number): string {
  return `rgr-variant:${variantNumber}`;
}
