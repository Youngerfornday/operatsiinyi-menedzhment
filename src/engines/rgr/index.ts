/**
 * Рушій РГР «Операційний план дільниці підприємства» (content/course.yaml → grading.caseProject):
 * номер залікової книжки → детермінований варіант вихідних даних на всі чотири етапи роботи.
 * Чистий TypeScript без DOM і React — для React-острова сайту.
 */
export { computeCpm, createNetwork, type CpmActivityResult } from './network';
export {
  GRADEBOOK_ERROR_MESSAGES,
  parseGradebookNumber,
  seedForGradebookNumber,
  type GradebookError,
  type GradebookErrorCode,
  type GradebookNumber,
} from './gradebook';
export { createRgrVariant, createRgrVariantForDigits } from './variant';
export type {
  BomItem,
  CapabilityData,
  ControlChartData,
  ControlSubgroup,
  EnterpriseType,
  FacilityProfile,
  GivenRow,
  GivenSection,
  InventoryData,
  NetworkActivity,
  ProductivityBeforeAfter,
  RgrVariant,
  Stage1Data,
  Stage2AggregatePlan,
  Stage2Capacity,
  Stage2Data,
  Stage3Data,
  Stage4Data,
} from './types';
