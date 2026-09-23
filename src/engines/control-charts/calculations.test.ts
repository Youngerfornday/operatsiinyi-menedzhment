import { describe, expect, it } from 'vitest';
import { pChartLimits, xbarRLimits } from './calculations';

describe('xbarRLimits (QC-01)', () => {
  it('n = 5: A2 = 0,577, D3 = 0, D4 = 2,114 — X̿ = 100, R̄ = 4', () => {
    const result = xbarRLimits(100, 4, 5);

    expect(result.ok && result.value.centerXbar).toBe(100);
    expect(result.ok && result.value.upperXbar).toBeCloseTo(102.308, 9);
    expect(result.ok && result.value.lowerXbar).toBeCloseTo(97.692, 9);
    expect(result.ok && result.value.upperRange).toBeCloseTo(8.456, 9);
    expect(result.ok && result.value.lowerRange).toBe(0);
  });

  it('відхиляє неприпустимий розмір підгрупи (0 і поза таблицею)', () => {
    expect(xbarRLimits(100, 4, 0)).toMatchObject({ ok: false, error: { code: 'non-positive-subgroup-size' } });
    expect(xbarRLimits(100, 4, 25)).toMatchObject({ ok: false, error: { code: 'unsupported-subgroup-size' } });
  });

  it('відхиляє від’ємний середній розмах', () => {
    expect(xbarRLimits(100, -1, 5)).toMatchObject({ ok: false, error: { code: 'negative-range' } });
  });
});

describe('pChartLimits (QC-02)', () => {
  /** Фікстура — WorkedExample code="QC-02" лекції теми 8: p̄ = 0,075, n = 100, UCLp = 15,4 %, LCLp = 0 %. */
  it('p̄ = 0,075, n = 100 дає UCLp ≈ 15,4 % і LCLp обрізану до 0', () => {
    const result = pChartLimits(0.075, 100);

    expect(result.ok && result.value.upper).toBeCloseTo(0.154, 3);
    expect(result.ok && result.value.lower).toBe(0);
  });

  it('відхиляє частку поза межами [0, 1]', () => {
    expect(pChartLimits(-0.1, 100)).toMatchObject({ ok: false, error: { code: 'invalid-proportion' } });
    expect(pChartLimits(1.1, 100)).toMatchObject({ ok: false, error: { code: 'invalid-proportion' } });
  });

  it('відхиляє неприпустимий розмір підгрупи', () => {
    expect(pChartLimits(0.05, 0)).toMatchObject({ ok: false, error: { code: 'non-positive-subgroup-size' } });
  });
});
