/**
 * Рушій черговості робіт (пріоритетні правила короткострокового планування): FCFS, SPT, EDD
 * (docs/research/formula-baseline.md, розділ 5, коди SCH-01 «SPT», SCH-02 «EDD», SCH-04 «завантаження»)
 * плюс відтворюваний генератор варіантів. Чистий TS без DOM — для сайту й SCORM.
 */
export { sequenceEdd, sequenceFcfs, sequenceSpt } from './calculations';
export { SEQUENCING_ERROR_MESSAGES, type SequencingError, type SequencingErrorCode } from './errors';
export { createSequencingVariant, type SequencingTaskChoice } from './generator';
export type { SequencedJob, SequencingAnswerField, SequencingJob, SequencingMethod, SequencingSummary, SequencingVariant } from './types';
