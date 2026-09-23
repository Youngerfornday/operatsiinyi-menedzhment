import { err, type Result } from '../shared/result';

/**
 * Помилки рушія сітьового планування: побудова мережі (CPM) і оцінка ймовірності строку (PERT)
 * (docs/research/formula-baseline.md, розділ 7, коди PRJ-01..09). Винятків немає — лише Result з кодом.
 */
export type CpmPertErrorCode =
  | 'empty-activities'
  | 'duplicate-id'
  | 'unknown-predecessor'
  | 'cycle-detected'
  | 'non-positive-duration'
  | 'invalid-pert-estimates'
  | 'non-positive-sigma'
  | 'multiple-critical-paths';

export interface CpmPertError {
  readonly code: CpmPertErrorCode;
  readonly message: string;
}

export const CPM_PERT_ERROR_MESSAGES: Readonly<Record<CpmPertErrorCode, string>> = {
  'empty-activities': 'Потрібна щонайменше одна робота мережі.',
  'duplicate-id': 'Коди робіт мережі мають бути унікальними.',
  'unknown-predecessor': 'Попередник роботи посилається на код, якого немає в переліку робіт.',
  'cycle-detected': 'Мережа робіт містить цикл — попередники не утворюють коректний граф без циклів.',
  'non-positive-duration': 'Тривалість роботи має бути більшою за нуль.',
  'invalid-pert-estimates': 'Оцінки PERT мають задовольняти o ≤ m ≤ p, усі більші за нуль.',
  'non-positive-sigma': 'Стандартне відхилення критичного шляху має бути більшим за нуль.',
  'multiple-critical-paths': 'Мережа має кілька критичних шляхів однакової тривалості — база не визначає, дисперсію якого з них рахувати.',
};

export function fail(code: CpmPertErrorCode): { readonly ok: false; readonly error: CpmPertError } {
  return err({ code, message: CPM_PERT_ERROR_MESSAGES[code] });
}

export type CpmPertResult<T> = Result<T, CpmPertError>;
