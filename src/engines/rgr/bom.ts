import { randomInt, type RandomSource } from '../shared/random';
import type { BomItem } from './types';

/**
 * Специфікація виробу (BOM) для розвертання матеріальної потреби (MRP-01..03): структура з трьох
 * рівнів фіксована (кінцевий виріб → два вузли → один субвузол), варіюються лише кількості на
 * батьківський виріб, строки постачання й наявний запас.
 */
const BOM_STRUCTURE: ReadonlyArray<{ readonly id: string; readonly name: string; readonly parentId: string | null }> = [
  { id: 'P', name: 'Готовий виріб', parentId: null },
  { id: 'A', name: 'Вузол A', parentId: 'P' },
  { id: 'B', name: 'Вузол B', parentId: 'P' },
  { id: 'A1', name: 'Деталь A1 (входить у вузол A)', parentId: 'A' },
];

export function createBom(random: RandomSource): BomItem[] {
  return BOM_STRUCTURE.map((item) => ({
    ...item,
    quantityPerParent: item.parentId === null ? 1 : randomInt(random, 2, 4),
    leadTimeWeeks: randomInt(random, 1, 3),
    onHand: item.parentId === null ? 0 : 10 * randomInt(random, 0, 6),
    lotSizingRule: 'lot-for-lot',
  }));
}

const WEEKS = 6;
const WEEKLY_ROUNDING = 10;

/** Тижневий план випуску кінцевого виробу (для нетто-потреби по всьому дереву BOM). */
export function createMasterScheduleWeeks(random: RandomSource, baselineMonthlyDemand: number): number[] {
  const weeklyBase = Math.max(WEEKLY_ROUNDING, Math.round(baselineMonthlyDemand / 4 / WEEKLY_ROUNDING) * WEEKLY_ROUNDING);
  const weeks: number[] = [];
  for (let index = 0; index < WEEKS; index += 1) {
    const noise = WEEKLY_ROUNDING * randomInt(random, -2, 2);
    weeks.push(Math.max(WEEKLY_ROUNDING, weeklyBase + noise));
  }
  return weeks;
}
