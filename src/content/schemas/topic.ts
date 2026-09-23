import { z } from 'zod';
import {
  IsoDateSchema,
  KebabIdSchema,
  LearningOutcomeIdSchema,
  NonEmptyTextSchema,
  RefSchema,
  TopicIdSchema,
  uniqueArray,
} from './primitives';

const MAX_DESCRIPTION_LENGTH = 300;

/**
 * Frontmatter `content/modules/mN/tNN/lecture.mdx`.
 * Назва, slug і модуль беруться з реєстру course.yaml за `id`, щоб не дублювати їх у двох місцях.
 */
export const TopicFrontmatterSchema = z.object({
  id: TopicIdSchema,
  description: NonEmptyTextSchema.max(MAX_DESCRIPTION_LENGTH),
  learningOutcomes: uniqueArray(LearningOutcomeIdSchema, 'ПРН теми').default([]),
  keyTerms: uniqueArray(KebabIdSchema, 'Ключові терміни').default([]),
  readingMinutes: z.int().positive().optional(),
  refs: z.array(RefSchema).default([]),
  status: z.enum(['draft', 'review', 'verified']).default('draft'),
  updatedAt: IsoDateSchema,
});

export type TopicFrontmatter = z.infer<typeof TopicFrontmatterSchema>;
