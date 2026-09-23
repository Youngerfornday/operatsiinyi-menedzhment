/**
 * Рушій придатності процесу: індекси Cp і Cpk (docs/research/formula-baseline.md, розділ 8, коди
 * QC-04, QC-05) плюс відтворюваний генератор варіантів. Чистий TS без DOM — для сайту й SCORM.
 */
export { processCapabilityCp, processCapabilityCpk } from './calculations';
export { PROCESS_CAPABILITY_ERROR_MESSAGES, type ProcessCapabilityError, type ProcessCapabilityErrorCode } from './errors';
export { createProcessCapabilityVariant, type ProcessCapabilityTaskChoice } from './generator';
export type { ProcessCapabilityAnswerField, ProcessCapabilityGivenItem, ProcessCapabilityMethod, ProcessCapabilitySignalQuestion, ProcessCapabilityVariant } from './types';
