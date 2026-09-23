/**
 * Рушій агрегатного планування: стратегія погоні за попитом, стратегія рівномірного виробництва
 * й порівняння їхніх сумарних витрат (docs/research/formula-baseline.md, розділ 12, коди AGG-01…AGG-03)
 * плюс відтворюваний генератор варіантів. Чистий TS без DOM — для сайту й SCORM.
 */
export { chaseStrategyWorkforce, evaluatePlan, levelStrategyWorkforce, type AggregatePlanCostParams, type AggregatePlanResult } from './calculations';
export { AGGREGATE_PLANNING_ERROR_MESSAGES, type AggregatePlanningError, type AggregatePlanningErrorCode } from './errors';
export { createAggregatePlanningVariant, type AggregatePlanningTaskChoice } from './generator';
export type { AggregatePlanningAnswerField, AggregatePlanningGivenItem, AggregatePlanningMethod, AggregatePlanningVariant } from './types';
