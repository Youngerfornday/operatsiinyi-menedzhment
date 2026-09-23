/**
 * Рушій MRP (планування потреби в матеріалах): розгортання триярусної специфікації виробу —
 * брутто-потреба (MRP-01), нетто-потреба (MRP-02), розмір партії «партія за партією» (MRP-03)
 * (docs/research/formula-baseline.md, розділ 3) плюс відтворюваний генератор варіантів.
 * Чистий TS без DOM — для сайту й SCORM.
 */
export { explodeBom, grossRequirement, lotForLotOrder, netRequirement, releasePeriod } from './calculations';
export { MRP_ERROR_MESSAGES, type MrpError, type MrpErrorCode } from './errors';
export { createMrpVariant } from './generator';
export type { MrpAnswerField, MrpBomItem, MrpExplosionInput, MrpGivenItem, MrpItemKey, MrpItemResult, MrpVariant } from './types';
