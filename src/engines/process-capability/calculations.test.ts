import { describe, expect, it } from 'vitest';
import { processCapabilityCp, processCapabilityCpk } from './calculations';

/**
 * Фікстура — WorkedExample code="QC-04" лекції теми 8: поле допуску 495–505 г (ширина 10 г), σ = 1,2 г.
 * Процес А центрований (μ = 500): Cp = Cpk = 1,39. Процес Б зсунутий (μ = 502,5): Cp = 1,39, Cpk = 0,69.
 */
describe('processCapabilityCp (QC-04)', () => {
  it('Cp = (USL − LSL) / (6σ) — 10 / (6·1,2) ≈ 1,39, однаковий для обох процесів', () => {
    const result = processCapabilityCp(505, 495, 1.2);
    expect(result.ok && result.value).toBeCloseTo(1.39, 2);
  });

  it('відхиляє невалідне поле допуску (USL ≤ LSL)', () => {
    expect(processCapabilityCp(495, 505, 1.2)).toMatchObject({ ok: false, error: { code: 'invalid-tolerance-field' } });
  });

  it('відхиляє непозитивне σ', () => {
    expect(processCapabilityCp(505, 495, 0)).toMatchObject({ ok: false, error: { code: 'non-positive-sigma' } });
  });
});

describe('processCapabilityCpk (QC-05)', () => {
  it('процес А центрований (μ = 500): Cpk = 1,39, дорівнює Cp', () => {
    const result = processCapabilityCpk(505, 495, 500, 1.2);
    expect(result.ok && result.value).toBeCloseTo(1.39, 2);
  });

  it('процес Б зсунутий (μ = 502,5): Cpk = 0,69, менший за Cp', () => {
    const result = processCapabilityCpk(505, 495, 502.5, 1.2);
    expect(result.ok && result.value).toBeCloseTo(0.69, 2);
  });

  it('відхиляє невалідне поле допуску і непозитивне σ', () => {
    expect(processCapabilityCpk(495, 505, 500, 1.2)).toMatchObject({ ok: false, error: { code: 'invalid-tolerance-field' } });
    expect(processCapabilityCpk(505, 495, 500, 0)).toMatchObject({ ok: false, error: { code: 'non-positive-sigma' } });
  });
});
