/**
 * Рушій закону Літтла (docs/research/formula-baseline.md, код CAP-04: L = λ · W) плюс відтворюваний
 * генератор варіантів. Чистий TS без DOM — для сайту й SCORM.
 */
export { littleLawThroughput, littleLawTime, littleLawWip } from './calculations';
export { LITTLE_LAW_ERROR_MESSAGES, type LittleLawError, type LittleLawErrorCode } from './errors';
export { createLittleLawVariant, type LittleLawTaskChoice } from './generator';
export type { LittleLawAnswerField, LittleLawGivenItem, LittleLawMethod, LittleLawUnknown, LittleLawVariant } from './types';
