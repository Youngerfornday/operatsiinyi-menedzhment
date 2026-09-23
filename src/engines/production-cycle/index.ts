/**
 * Рушій тривалості виробничого циклу (docs/research/formula-baseline.md, коди PC-01, PC-02, PC-03:
 * послідовний, паралельний і паралельно-послідовний рух партії деталей) плюс відтворюваний генератор
 * варіантів. Чистий TS без DOM — для сайту й SCORM.
 */
export { mixedCycleTime, parallelCycleTime, productionCycleTimes, sequentialCycleTime, type ProductionCycleTimes } from './calculations';
export { PRODUCTION_CYCLE_ERROR_MESSAGES, type ProductionCycleError, type ProductionCycleErrorCode } from './errors';
export { createProductionCycleVariant, type ProductionCycleTaskChoice } from './generator';
export type { CycleOperation, ProductionCycleAnswerField, ProductionCycleGivenItem, ProductionCycleMethod, ProductionCycleVariant } from './types';
