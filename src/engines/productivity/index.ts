/**
 * Рушій продуктивності операційної системи: часткова й багатофакторна продуктивність, індекс її зміни,
 * використання й ефективність потужності (docs/research/formula-baseline.md, розділ 3, коди PROD-01..03,
 * CAP-01, CAP-02) плюс відтворюваний генератор варіантів. Чистий TS без DOM — для сайту й SCORM.
 */
export {
  capacityEfficiency,
  capacityUsage,
  multifactorProductivity,
  multifactorProductivityChange,
  partialProductivity,
  productivityIndex,
  type MultifactorPeriod,
  type ProductivityChange,
} from './calculations';
export { PRODUCTIVITY_ERROR_MESSAGES, type ProductivityError, type ProductivityErrorCode } from './errors';
export { createProductivityVariant, type ProductivityTaskChoice } from './generator';
export type { ProductivityAnswerField, ProductivityGivenItem, ProductivityMethod, ProductivityVariant } from './types';
