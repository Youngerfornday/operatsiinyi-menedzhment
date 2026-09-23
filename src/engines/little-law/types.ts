/**
 * Тип варіанта задачі для закону Літтла (docs/research/formula-baseline.md, код CAP-04): не залежить
 * від React чи схеми контенту, щоб той самий варіант можна було відтворити і в SCORM-пакеті.
 */
import type { UkPluralForms } from '../../lib/plural';

export type LittleLawMethod = 'little-law';

/** Яку з трьох величин закону Літтла (L = λ · W) шукає студент у цьому варіанті. */
export type LittleLawUnknown = 'wip' | 'throughput' | 'time';

/** Пункт вихідних даних задачі для показу у фабулі («Пропускна здатність» → «40 замовлень за добу»). */
export interface LittleLawGivenItem {
  readonly label: string;
  readonly value: string;
}

/** Поле відповіді: студент вводить число, рушій звіряє з `expected` у межах `tolerance`. */
export interface LittleLawAnswerField {
  readonly id: string;
  readonly label: string;
  readonly unit: string;
  /** Форми одиниці для узгодження з числом у відгуку («2 доби», «5 діб»); без них — `unit` як є. */
  readonly unitForms?: UkPluralForms;
  readonly expected: number;
  readonly tolerance: number;
}

export interface LittleLawVariant {
  readonly variantId: string;
  readonly method: LittleLawMethod;
  /** Яку величину приховано — та сама, що й `resource` задачі в `content/practicals/p03.yaml`. */
  readonly unknown: LittleLawUnknown;
  readonly prompt: string;
  readonly given: readonly LittleLawGivenItem[];
  readonly answers: readonly LittleLawAnswerField[];
  readonly solution: readonly string[];
}
