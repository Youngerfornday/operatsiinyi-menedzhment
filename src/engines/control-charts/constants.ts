/**
 * Табличні константи A2, D3, D4 контрольної карти x̄-R за розміром підгрупи n. Формула карти
 * підтверджена (QC-01, docs/research/formula-baseline.md), але самі значення констант — стандартна
 * таблиця статистичного контролю процесу (Shewhart/Western Electric), однакова в усіх підручниках SPC;
 * docs/research/formula-baseline.md, розділ «Не підтверджено», п. 2 явно залишає її поза базою курсу —
 * «брати лише з таблиці підручника, який використовує викладач». Лекція теми 8 (Formula code="QC-01")
 * формулює те саме: константи «беруться зі стандартної таблиці SPC підручника, який використовує
 * викладач». Значення нижче — загальновідома стандартна таблиця, а не факт, приписаний джерелу курсу.
 */
export interface XbarRConstants {
  readonly a2: number;
  readonly d3: number;
  readonly d4: number;
}

export const MIN_SUBGROUP_SIZE = 2;
export const MAX_SUBGROUP_SIZE = 10;

const XBAR_R_CONSTANTS: Readonly<Record<number, XbarRConstants>> = {
  2: { a2: 1.88, d3: 0, d4: 3.267 },
  3: { a2: 1.023, d3: 0, d4: 2.574 },
  4: { a2: 0.729, d3: 0, d4: 2.282 },
  5: { a2: 0.577, d3: 0, d4: 2.114 },
  6: { a2: 0.483, d3: 0, d4: 2.004 },
  7: { a2: 0.419, d3: 0.076, d4: 1.924 },
  8: { a2: 0.373, d3: 0.136, d4: 1.864 },
  9: { a2: 0.337, d3: 0.184, d4: 1.816 },
  10: { a2: 0.308, d3: 0.223, d4: 1.777 },
};

export function xbarRConstantsFor(subgroupSize: number): XbarRConstants | null {
  return XBAR_R_CONSTANTS[subgroupSize] ?? null;
}
