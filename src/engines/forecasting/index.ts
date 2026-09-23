/**
 * Рушій прогнозування попиту: проста й зважена ковзна середня, експоненційне згладжування, MAD, MSE,
 * MAPE (docs/research/formula-baseline.md, розділ 2, коди FC-01…FC-06) плюс відтворюваний генератор
 * варіантів. Чистий TS без DOM — для сайту й SCORM.
 */
export {
  exponentialSmoothingForecast,
  exponentialSmoothingSeries,
  meanAbsoluteDeviation,
  meanAbsolutePercentageError,
  meanSquaredError,
  movingAverageForecast,
  weightedMovingAverageForecast,
} from './calculations';
export { FORECASTING_ERROR_MESSAGES, type ForecastingError, type ForecastingErrorCode } from './errors';
export { createForecastingVariant, type ForecastingTaskChoice } from './generator';
export type { ForecastingAnswerField, ForecastingGivenItem, ForecastingMethod, ForecastingVariant } from './types';
