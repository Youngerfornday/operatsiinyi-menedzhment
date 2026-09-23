/**
 * Рушій нормування праці: оперативний час, штучний час, штучно-калькуляційний час і норма виробітку
 * (docs/research/formula-baseline.md, WM-01..04) плюс відтворюваний генератор варіантів.
 * Чистий TS без DOM — для сайту й SCORM.
 */
export { operativeTime, pieceRateTime, pieceTime, outputRate } from './calculations';
export { WORK_MEASUREMENT_ERROR_MESSAGES, type WorkMeasurementError, type WorkMeasurementErrorCode } from './errors';
export { createWorkMeasurementVariant, type WorkMeasurementTaskChoice } from './generator';
export type { WorkMeasurementAnswerField, WorkMeasurementGivenItem, WorkMeasurementMethod, WorkMeasurementVariant } from './types';
