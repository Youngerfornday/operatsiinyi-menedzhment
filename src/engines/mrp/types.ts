/**
 * Тип варіанта тренажера MRP: не залежить від React чи схеми контенту, щоб той самий варіант можна
 * було відтворити і в SCORM-пакеті. На відміну від `productivity`, тут лише один метод (розгортання
 * специфікації), тому варіант не містить дискримінанта методу — лише фіксовану триярусну структуру.
 */
export type MrpItemKey = 'a' | 'b' | 'c' | 'd';

export interface MrpBomItem {
  readonly id: MrpItemKey;
  readonly title: string;
  /** Кількість одиниць цього компонента на одну одиницю батьківського рівня; для кореня (a) не використовується. */
  readonly quantityPerParent: number;
  /** Час постачання чи виробництва, тижнів. */
  readonly leadTime: number;
  readonly onHand: number;
}

export interface MrpExplosionInput {
  readonly a: MrpBomItem;
  readonly b: MrpBomItem;
  readonly c: MrpBomItem;
  readonly d: MrpBomItem;
  /** Потреба в готовому виробі А з основного плану-графіка (MPS). */
  readonly mpsQuantity: number;
  /** Тиждень, на який потрібна ця кількість А. */
  readonly duePeriod: number;
}

export interface MrpItemResult {
  readonly id: MrpItemKey;
  readonly title: string;
  readonly grossRequirement: number;
  readonly onHand: number;
  readonly netRequirement: number;
  /** «Партія за партією» (MRP-03): дорівнює нетто-потребі. */
  readonly plannedOrder: number;
  readonly leadTime: number;
  /** Тиждень, на який слід запустити це замовлення (потреба мінус час постачання). */
  readonly releasePeriod: number;
}

export interface MrpGivenItem {
  readonly label: string;
  readonly value: string;
}

export interface MrpAnswerField {
  readonly id: string;
  readonly label: string;
  readonly unit: string;
  readonly expected: number;
  readonly tolerance: number;
}

export interface MrpVariant {
  readonly variantId: string;
  readonly method: 'bom-explosion';
  readonly prompt: string;
  readonly given: readonly MrpGivenItem[];
  readonly answers: readonly MrpAnswerField[];
  readonly solution: readonly string[];
}
