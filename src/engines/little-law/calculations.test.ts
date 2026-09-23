import { describe, expect, it } from 'vitest';
import { littleLawThroughput, littleLawTime, littleLawWip } from './calculations';

/**
 * Фікстури — вивірені числа з content/modules/m1/t03/lecture.mdx, WorkedExample code="CAP-04":
 * цех (λ = 40 замовлень/добу, L = 100 → W = 2,5 доби; L = 60 → W = 1,5 доби) і лікарня
 * (λ = 6 пацієнтів/год, W = 4 год → L = 24 пацієнти).
 */
describe('littleLawWip (CAP-04, L = λ · W)', () => {
  it('24 пацієнти у відділенні за λ = 6 пацієнтів/год і W = 4 год', () => {
    expect(littleLawWip(6, 4)).toEqual({ ok: true, value: 24 });
  });

  it('відхиляє від’ємну пропускну здатність чи час перебування', () => {
    expect(littleLawWip(-1, 4)).toMatchObject({ ok: false, error: { code: 'negative-value' } });
    expect(littleLawWip(6, -1)).toMatchObject({ ok: false, error: { code: 'negative-value' } });
  });

  it('нуль — валідне значення (порожня система)', () => {
    expect(littleLawWip(0, 4)).toEqual({ ok: true, value: 0 });
  });
});

describe('littleLawTime (CAP-04, W = L / λ)', () => {
  it('2,5 доби за L = 100 замовлень і λ = 40 замовлень/добу', () => {
    expect(littleLawTime(100, 40)).toEqual({ ok: true, value: 2.5 });
  });

  it('1,5 доби, якщо незавершене виробництво скоротити до 60 замовлень при тій самій пропускній здатності', () => {
    expect(littleLawTime(60, 40)).toEqual({ ok: true, value: 1.5 });
  });

  it('відхиляє від’ємне незавершене виробництво й невалідну пропускну здатність', () => {
    expect(littleLawTime(-1, 40)).toMatchObject({ ok: false, error: { code: 'negative-value' } });
    expect(littleLawTime(100, 0)).toMatchObject({ ok: false, error: { code: 'non-positive-denominator' } });
    expect(littleLawTime(100, -5)).toMatchObject({ ok: false, error: { code: 'non-positive-denominator' } });
  });
});

describe('littleLawThroughput (CAP-04, λ = L / W)', () => {
  it('6 пацієнтів/год за L = 24 пацієнти і W = 4 год', () => {
    expect(littleLawThroughput(24, 4)).toEqual({ ok: true, value: 6 });
  });

  it('відхиляє від’ємне незавершене виробництво й невалідний час перебування', () => {
    expect(littleLawThroughput(-1, 4)).toMatchObject({ ok: false, error: { code: 'negative-value' } });
    expect(littleLawThroughput(24, 0)).toMatchObject({ ok: false, error: { code: 'non-positive-denominator' } });
    expect(littleLawThroughput(24, -1)).toMatchObject({ ok: false, error: { code: 'non-positive-denominator' } });
  });
});
