/**
 * Рушій EOQ: оптимальний розмір замовлення, точка замовлення зі страховим запасом і чутливість
 * сумарних витрат до розміру партії (docs/research/formula-baseline.md, розділ 1, коди EOQ-01, EOQ-03,
 * EOQ-04) плюс відтворюваний генератор варіантів. Чистий TS без DOM — для сайту й SCORM.
 */
export {
  annualHoldingCost,
  annualOrderingCost,
  economicOrderQuantity,
  reorderPoint,
  safetyStock,
  totalAnnualInventoryCost,
} from './calculations';
export { EOQ_ERROR_MESSAGES, type EoqError, type EoqErrorCode } from './errors';
export { createEoqVariant, type EoqTaskChoice } from './generator';
export type { EoqAnswerField, EoqGivenItem, EoqMethod, EoqVariant } from './types';
