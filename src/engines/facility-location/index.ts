/**
 * Рушій вибору місця розташування: метод вагових коефіцієнтів і метод центру ваги
 * (docs/research/formula-baseline.md, LOC-01, LOC-02) плюс відтворюваний генератор варіантів.
 * Чистий TS без DOM — для сайту й SCORM.
 */
export { centerOfGravity, factorRatingScore, type Point, type WeightedPoint } from './calculations';
export { FACILITY_LOCATION_ERROR_MESSAGES, type FacilityLocationError, type FacilityLocationErrorCode } from './errors';
export { createFacilityLocationVariant, type FacilityLocationTaskChoice } from './generator';
export type { FacilityLocationAnswerField, FacilityLocationGivenItem, FacilityLocationMethod, FacilityLocationVariant } from './types';
