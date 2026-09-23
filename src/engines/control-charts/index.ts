/**
 * Рушій контрольних карт статистичного контролю процесу: x̄-R за кількісною ознакою (QC-01) і p-карта
 * за альтернативною ознакою (QC-02); docs/research/formula-baseline.md, розділ 8. Чистий TS без DOM.
 */
export { pChartLimits, xbarRLimits } from './calculations';
export { MAX_SUBGROUP_SIZE, MIN_SUBGROUP_SIZE, xbarRConstantsFor, type XbarRConstants } from './constants';
export { CONTROL_CHART_ERROR_MESSAGES, type ControlChartError, type ControlChartErrorCode } from './errors';
export { createControlChartVariant, type ControlChartTaskChoice } from './generator';
export type {
  ControlChartAnswerField,
  ControlChartGivenItem,
  ControlChartMethod,
  ControlChartSignalQuestion,
  ControlChartVariant,
  PChartLimits,
  XbarRLimits,
} from './types';
