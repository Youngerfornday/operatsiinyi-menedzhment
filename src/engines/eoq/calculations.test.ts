import { describe, expect, it } from 'vitest';
import { annualHoldingCost, annualOrderingCost, economicOrderQuantity, reorderPoint, safetyStock, totalAnnualInventoryCost } from './calculations';

describe('economicOrderQuantity (EOQ-01)', () => {
  it('Q* ≈ 600 для D=7200, S=450, H=18', () => {
    const result = economicOrderQuantity(7_200, 450, 18);
    expect(result.ok && result.value).toBeCloseTo(600, 9);
  });

  it('відхиляє від’ємний попит і від’ємну вартість замовлення', () => {
    expect(economicOrderQuantity(-1, 100, 10)).toMatchObject({ ok: false, error: { code: 'negative-value' } });
    expect(economicOrderQuantity(100, -1, 10)).toMatchObject({ ok: false, error: { code: 'negative-value' } });
  });

  it('відхиляє нульову й від’ємну вартість зберігання', () => {
    expect(economicOrderQuantity(100, 10, 0)).toMatchObject({ ok: false, error: { code: 'non-positive-holding-cost' } });
    expect(economicOrderQuantity(100, 10, -5)).toMatchObject({ ok: false, error: { code: 'non-positive-holding-cost' } });
  });
});

describe('reorderPoint (EOQ-03)', () => {
  it('ROP = 144 для d̄=24, L=6', () => {
    expect(reorderPoint(24, 6)).toEqual({ ok: true, value: 144 });
  });

  it('відхиляє від’ємний середній попит', () => {
    expect(reorderPoint(-1, 6)).toMatchObject({ ok: false, error: { code: 'negative-value' } });
  });

  it('відхиляє нульовий і від’ємний час постачання', () => {
    expect(reorderPoint(24, 0)).toMatchObject({ ok: false, error: { code: 'non-positive-lead-time' } });
    expect(reorderPoint(24, -1)).toMatchObject({ ok: false, error: { code: 'non-positive-lead-time' } });
  });
});

describe('safetyStock (EOQ-04)', () => {
  it('SS = 33 для z=1,65, σ=20', () => {
    expect(safetyStock(1.65, 20)).toEqual({ ok: true, value: 33 });
  });

  it('відхиляє від’ємний z-коефіцієнт і від’ємне стандартне відхилення', () => {
    expect(safetyStock(-1, 20)).toMatchObject({ ok: false, error: { code: 'negative-value' } });
    expect(safetyStock(1.65, -1)).toMatchObject({ ok: false, error: { code: 'negative-value' } });
  });

  it('нульові значення дають нульовий страховий запас', () => {
    expect(safetyStock(0, 0)).toEqual({ ok: true, value: 0 });
  });
});

describe('annualOrderingCost', () => {
  it('(D/Q)·S: 7200/600 · 450 = 5 400', () => {
    expect(annualOrderingCost(7_200, 600, 450)).toEqual({ ok: true, value: 5_400 });
  });

  it('відхиляє від’ємний попит і від’ємну вартість замовлення', () => {
    expect(annualOrderingCost(-1, 600, 450)).toMatchObject({ ok: false, error: { code: 'negative-value' } });
    expect(annualOrderingCost(7_200, 600, -1)).toMatchObject({ ok: false, error: { code: 'negative-value' } });
  });

  it('відхиляє нульовий і від’ємний розмір замовлення', () => {
    expect(annualOrderingCost(7_200, 0, 450)).toMatchObject({ ok: false, error: { code: 'non-positive-order-quantity' } });
    expect(annualOrderingCost(7_200, -1, 450)).toMatchObject({ ok: false, error: { code: 'non-positive-order-quantity' } });
  });
});

describe('annualHoldingCost', () => {
  it('(Q/2)·H: 600/2 · 18 = 5 400', () => {
    expect(annualHoldingCost(600, 18)).toEqual({ ok: true, value: 5_400 });
  });

  it('відхиляє від’ємний розмір замовлення', () => {
    expect(annualHoldingCost(-1, 18)).toMatchObject({ ok: false, error: { code: 'negative-value' } });
  });

  it('відхиляє нульову й від’ємну вартість зберігання', () => {
    expect(annualHoldingCost(600, 0)).toMatchObject({ ok: false, error: { code: 'non-positive-holding-cost' } });
    expect(annualHoldingCost(600, -1)).toMatchObject({ ok: false, error: { code: 'non-positive-holding-cost' } });
  });
});

describe('totalAnnualInventoryCost', () => {
  it('сума витрат на оформлення й зберігання дорівнює мінімуму при Q = EOQ (5 400 + 5 400 = 10 800)', () => {
    expect(totalAnnualInventoryCost(7_200, 600, 450, 18)).toEqual({ ok: true, value: 10_800 });
  });

  it('поширює помилку оформлення замовлення (перевіряється першою)', () => {
    expect(totalAnnualInventoryCost(-1, 600, 450, 18)).toMatchObject({ ok: false, error: { code: 'negative-value' } });
    expect(totalAnnualInventoryCost(7_200, 0, 450, 18)).toMatchObject({ ok: false, error: { code: 'non-positive-order-quantity' } });
  });

  it('поширює помилку зберігання, коли оформлення пораховано без помилок', () => {
    expect(totalAnnualInventoryCost(7_200, 600, 450, 0)).toMatchObject({ ok: false, error: { code: 'non-positive-holding-cost' } });
  });
});
