/**
 * Рушій балансування потокової лінії: такт (CAP-05), мінімальна кількість станцій (LB-01), розподіл
 * операцій за станціями за правилом найбільшої кількості наступних завдань (LB-05), ефективність,
 * втрати на простій і абсолютний час простою (LB-02..04) плюс відтворюваний генератор варіантів.
 * Чистий TS без DOM — для сайту й SCORM.
 */
export {
  assignStationsSequential,
  balanceDelay,
  idleTimePerCycle,
  lineBalancingEfficiency,
  minimumStations,
  taktTime,
} from './calculations';
export { LINE_BALANCING_ERROR_MESSAGES, type LineBalancingError, type LineBalancingErrorCode } from './errors';
export { createLineBalancingVariant, type LineBalancingTaskChoice } from './generator';
export type { LineBalancingAnswerField, LineBalancingGivenItem, LineBalancingMethod, LineBalancingVariant } from './types';
