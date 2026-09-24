/**
 * Рушій сітьового планування проєкту: критичний шлях (CPM) і ймовірність дотримання строку (PERT)
 * (docs/research/formula-baseline.md, розділ 7, коди PRJ-01..09) плюс відтворюваний генератор варіантів.
 * Чистий TS без DOM — для сайту й SCORM.
 */
export { computeNetwork } from './network';
export { activityVariance, computePertProject, expectedTime, onTimeProbability, projectZ, standardNormalCdf } from './pert';
export { CPM_PERT_ERROR_MESSAGES, type CpmPertError, type CpmPertErrorCode } from './errors';
export { createCpmPertVariant, type CpmPertTaskChoice } from './generator';
export type { Activity, ActivitySchedule, CpmPertAnswerField, CpmPertGivenItem, CpmPertMethod, CpmPertVariant, NetworkResult, PertActivityResult, PertEstimate, PertProjectResult } from './types';
