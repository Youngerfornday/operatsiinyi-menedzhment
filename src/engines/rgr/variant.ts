import { createSeededRandom } from '../shared/random';
import { ok, type Result } from '../shared/result';
import { type GradebookError, parseGradebookNumber, seedForVariant } from './gradebook';
import { createStage1 } from './stage1';
import { createStage2 } from './stage2';
import { createStage3 } from './stage3';
import { createStage4 } from './stage4';
import type { RgrVariant } from './types';

/**
 * Один варіант РГР — усі чотири етапи для тієї самої дільниці, зібрані з єдиного зерна варіанта
 * (`seedForVariant`), тож числа різних етапів узгоджені між собою (той самий продукт, той самий
 * базовий попит).
 */
export function createRgrVariantForNumber(variantNumber: number): RgrVariant {
  const random = createSeededRandom(seedForVariant(variantNumber));
  const stage1 = createStage1(random);
  const stage2 = createStage2(random, stage1);
  const stage3 = createStage3(random, stage1);
  const stage4 = createStage4(random, stage1);
  return { variantNumber, stage1, stage2, stage3, stage4 };
}

/** Номер залікової книжки → повний варіант РГР. Помилки формату — `Result` українською. */
export function createRgrVariant(gradebookInput: string): Result<RgrVariant, GradebookError> {
  const parsed = parseGradebookNumber(gradebookInput);
  if (!parsed.ok) return parsed;
  return ok(createRgrVariantForNumber(parsed.value.variantNumber));
}
