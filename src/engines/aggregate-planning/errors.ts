import { err, type Result } from '../shared/result';

/**
 * Помилки рушія агрегатного планування: невалідні вхідні дані для формул AGG-01…AGG-03
 * (docs/research/formula-baseline.md, розділ 12). Винятків немає — лише Result з кодом і повідомленням.
 */
export type AggregatePlanningErrorCode = 'empty-horizon' | 'length-mismatch' | 'negative-value' | 'negative-cost' | 'non-positive-productivity';

export interface AggregatePlanningError {
  readonly code: AggregatePlanningErrorCode;
  readonly message: string;
}

export const AGGREGATE_PLANNING_ERROR_MESSAGES: Readonly<Record<AggregatePlanningErrorCode, string>> = {
  'empty-horizon': 'Горизонт планування має містити щонайменше один період.',
  'length-mismatch': 'Кількість періодів випуску (чи чисельності персоналу) має збігатися з кількістю періодів попиту.',
  'negative-value': 'Попит і чисельність персоналу не можуть бути від’ємними.',
  'negative-cost': 'Ставки витрат не можуть бути від’ємними.',
  'non-positive-productivity': 'Продуктивність одного робітника за період має бути більшою за нуль.',
};

export function fail(code: AggregatePlanningErrorCode): { readonly ok: false; readonly error: AggregatePlanningError } {
  return err({ code, message: AGGREGATE_PLANNING_ERROR_MESSAGES[code] });
}

export type AggregatePlanningResult<T> = Result<T, AggregatePlanningError>;
