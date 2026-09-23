import { describe, expect, it } from 'vitest';
import { explodeBom, grossRequirement, lotForLotOrder, netRequirement, releasePeriod } from './calculations';
import type { MrpExplosionInput } from './types';

/**
 * Фікстури — вивірені числа з content/modules/m2/t06/lecture.mdx, WorkedExample code="MRP-01"
 * («Розгортання потреби за триярусною специфікацією виробу»): MPS А = 100 шт., запас А = 10 шт.,
 * B = 30 шт., C = 0 шт., D = 100 шт.; норми B/А = 2, C/А = 3, D/B = 4.
 */
describe('grossRequirement (MRP-01)', () => {
  it('90 × 2 = 180 (норма B/А з лекції)', () => {
    expect(grossRequirement(90, 2)).toEqual({ ok: true, value: 180 });
  });

  it('90 × 3 = 270 (норма C/А з лекції)', () => {
    expect(grossRequirement(90, 3)).toEqual({ ok: true, value: 270 });
  });

  it('відхиляє від’ємне планове замовлення батька', () => {
    expect(grossRequirement(-1, 2)).toMatchObject({ ok: false, error: { code: 'negative-value' } });
  });

  it('відхиляє нульову й від’ємну норму витрати', () => {
    expect(grossRequirement(90, 0)).toMatchObject({ ok: false, error: { code: 'non-positive-quantity-per-parent' } });
    expect(grossRequirement(90, -2)).toMatchObject({ ok: false, error: { code: 'non-positive-quantity-per-parent' } });
  });
});

describe('netRequirement (MRP-02)', () => {
  it('180 − 30 = 150 (B з лекції)', () => {
    expect(netRequirement(180, 30)).toEqual({ ok: true, value: 150 });
  });

  it('прирівнює до нуля, коли запас перевищує брутто-потребу', () => {
    expect(netRequirement(50, 80)).toEqual({ ok: true, value: 0 });
  });

  it('270 − 0 = 270 (C з лекції: запас відсутній)', () => {
    expect(netRequirement(270, 0)).toEqual({ ok: true, value: 270 });
  });

  it('відхиляє від’ємну брутто-потребу чи запас', () => {
    expect(netRequirement(-1, 0)).toMatchObject({ ok: false, error: { code: 'negative-value' } });
    expect(netRequirement(10, -1)).toMatchObject({ ok: false, error: { code: 'negative-value' } });
  });
});

describe('lotForLotOrder (MRP-03)', () => {
  it('дорівнює нетто-потребі (500 з лекції для D)', () => {
    expect(lotForLotOrder(500)).toEqual({ ok: true, value: 500 });
  });

  it('нуль лишається нулем', () => {
    expect(lotForLotOrder(0)).toEqual({ ok: true, value: 0 });
  });

  it('відхиляє від’ємну нетто-потребу', () => {
    expect(lotForLotOrder(-5)).toMatchObject({ ok: false, error: { code: 'negative-value' } });
  });
});

describe('releasePeriod', () => {
  it('3 − 2 = 1', () => {
    expect(releasePeriod(3, 2)).toEqual({ ok: true, value: 1 });
  });

  it('не обмежує знизу нулем: функція лише віднімає, без штучного клемпінгу', () => {
    expect(releasePeriod(1, 5)).toEqual({ ok: true, value: -4 });
  });

  it('відхиляє від’ємний час постачання', () => {
    expect(releasePeriod(3, -1)).toMatchObject({ ok: false, error: { code: 'negative-lead-time' } });
  });
});

describe('explodeBom — worked-приклад лекції (MRP-01 + MRP-02 + MRP-03)', () => {
  const input: MrpExplosionInput = {
    a: { id: 'a', title: 'Виріб А', quantityPerParent: 1, leadTime: 1, onHand: 10 },
    b: { id: 'b', title: 'Вузол B', quantityPerParent: 2, leadTime: 2, onHand: 30 },
    c: { id: 'c', title: 'Деталь C', quantityPerParent: 3, leadTime: 1, onHand: 0 },
    d: { id: 'd', title: 'Деталь D', quantityPerParent: 4, leadTime: 1, onHand: 100 },
    mpsQuantity: 100,
    duePeriod: 10,
  };

  it('А: нетто 90, планове замовлення 90', () => {
    const result = explodeBom(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [a] = result.value;
    expect(a).toMatchObject({ id: 'a', grossRequirement: 100, onHand: 10, netRequirement: 90, plannedOrder: 90 });
    expect(a!.releasePeriod).toBe(10 - 1);
  });

  it('B: брутто 180, нетто 150, планове замовлення 150, запуск зсунуто від запуску А', () => {
    const result = explodeBom(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [a, b] = result.value;
    expect(b).toMatchObject({ id: 'b', grossRequirement: 180, onHand: 30, netRequirement: 150, plannedOrder: 150 });
    expect(b!.releasePeriod).toBe(a!.releasePeriod - 2);
  });

  it('C: брутто 270, нетто 270 (запас 0), планове замовлення 270', () => {
    const result = explodeBom(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [a, , c] = result.value;
    expect(c).toMatchObject({ id: 'c', grossRequirement: 270, onHand: 0, netRequirement: 270, plannedOrder: 270 });
    expect(c!.releasePeriod).toBe(a!.releasePeriod - 1);
  });

  it('D: брутто 600, нетто 500, планове замовлення 500, запуск зсунуто від запуску B', () => {
    const result = explodeBom(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [, b, , d] = result.value;
    expect(d).toMatchObject({ id: 'd', grossRequirement: 600, onHand: 100, netRequirement: 500, plannedOrder: 500 });
    expect(d!.releasePeriod).toBe(b!.releasePeriod - 1);
  });

  it('відхиляє від’ємну потребу MPS', () => {
    expect(explodeBom({ ...input, mpsQuantity: -1 })).toMatchObject({ ok: false, error: { code: 'negative-value' } });
  });

  it('поширює помилку рівня А (від’ємний час постачання) і не рахує далі', () => {
    const broken: MrpExplosionInput = { ...input, a: { ...input.a, leadTime: -1 } };
    expect(explodeBom(broken)).toMatchObject({ ok: false, error: { code: 'negative-lead-time' } });
  });

  it('поширює помилку рівня B (нульова норма витрати B/А)', () => {
    const broken: MrpExplosionInput = { ...input, b: { ...input.b, quantityPerParent: 0 } };
    expect(explodeBom(broken)).toMatchObject({ ok: false, error: { code: 'non-positive-quantity-per-parent' } });
  });

  it('поширює помилку рівня D (нульова норма витрати D/B)', () => {
    const broken: MrpExplosionInput = { ...input, d: { ...input.d, quantityPerParent: 0 } };
    expect(explodeBom(broken)).toMatchObject({ ok: false, error: { code: 'non-positive-quantity-per-parent' } });
  });

  it('поширює помилку рівня C (нульова норма витрати C/А)', () => {
    const broken: MrpExplosionInput = { ...input, c: { ...input.c, quantityPerParent: 0 } };
    expect(explodeBom(broken)).toMatchObject({ ok: false, error: { code: 'non-positive-quantity-per-parent' } });
  });

  it('поширює помилку рівня B (від’ємний час постачання)', () => {
    const broken: MrpExplosionInput = { ...input, b: { ...input.b, leadTime: -1 } };
    expect(explodeBom(broken)).toMatchObject({ ok: false, error: { code: 'negative-lead-time' } });
  });

  it('поширює помилку рівня C (від’ємний час постачання)', () => {
    const broken: MrpExplosionInput = { ...input, c: { ...input.c, leadTime: -1 } };
    expect(explodeBom(broken)).toMatchObject({ ok: false, error: { code: 'negative-lead-time' } });
  });

  it('поширює помилку рівня D (від’ємний час постачання)', () => {
    const broken: MrpExplosionInput = { ...input, d: { ...input.d, leadTime: -1 } };
    expect(explodeBom(broken)).toMatchObject({ ok: false, error: { code: 'negative-lead-time' } });
  });
});
