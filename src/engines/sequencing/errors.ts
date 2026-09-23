import { err, type Result } from '../shared/result';

/**
 * Помилки рушія черговості: невалідна черга робіт для правил SPT/EDD/FCFS
 * (docs/research/formula-baseline.md, розділ 5, коди SCH-01, SCH-02, SCH-04). Винятків немає —
 * лише Result з кодом і повідомленням.
 */
export type SequencingErrorCode = 'empty-jobs' | 'negative-value' | 'duplicate-id';

export interface SequencingError {
  readonly code: SequencingErrorCode;
  readonly message: string;
}

export const SEQUENCING_ERROR_MESSAGES: Readonly<Record<SequencingErrorCode, string>> = {
  'empty-jobs': 'Потрібна щонайменше одна робота в черзі.',
  'negative-value': 'Тривалість обробки має бути більшою за нуль, строк — не від’ємним.',
  'duplicate-id': 'ID робіт мають бути унікальними.',
};

export function fail(code: SequencingErrorCode): { readonly ok: false; readonly error: SequencingError } {
  return err({ code, message: SEQUENCING_ERROR_MESSAGES[code] });
}

export type SequencingResult<T> = Result<T, SequencingError>;
