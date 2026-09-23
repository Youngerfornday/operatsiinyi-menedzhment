import { describe, expect, it } from 'vitest';
import { centerOfGravity, factorRatingScore } from './calculations';

/**
 * Фікстури — вивірені числа з content/modules/m2/t05/lecture.mdx:
 * WorkedExample code="LOC-01" (вибір складу методом вагових коефіцієнтів) і
 * WorkedExample code="LOC-02" (розташування складу методом центру ваги).
 */
describe('factorRatingScore (LOC-01)', () => {
  it('майданчик А набирає 71,5 бала', () => {
    const result = factorRatingScore([0.4, 0.35, 0.25], [80, 70, 60]);
    expect(result.ok && result.value).toBeCloseTo(71.5, 9);
  });

  it('майданчик Б набирає 76,25 бала', () => {
    const result = factorRatingScore([0.4, 0.35, 0.25], [60, 85, 90]);
    expect(result.ok && result.value).toBeCloseTo(76.25, 9);
  });

  it('відхиляє порожні масиви й розбіжну довжину', () => {
    expect(factorRatingScore([], [])).toMatchObject({ ok: false, error: { code: 'empty-factors' } });
    expect(factorRatingScore([0.5, 0.5], [80])).toMatchObject({ ok: false, error: { code: 'length-mismatch' } });
  });

  it('відхиляє від’ємну вагу чи оцінку', () => {
    expect(factorRatingScore([-0.5, 1.5], [80, 20])).toMatchObject({ ok: false, error: { code: 'negative-value' } });
    expect(factorRatingScore([0.5, 0.5], [-10, 20])).toMatchObject({ ok: false, error: { code: 'negative-value' } });
  });
});

describe('centerOfGravity (LOC-02)', () => {
  const points = [
    { x: 20, y: 60, weight: 50 },
    { x: 70, y: 20, weight: 80 },
    { x: 40, y: 90, weight: 30 },
  ];

  it('оптимальна точка приблизно (48,75; 45,625)', () => {
    const result = centerOfGravity(points);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.x).toBeCloseTo(48.75, 9);
    expect(result.value.y).toBeCloseTo(45.625, 9);
  });

  it('відхиляє порожній список точок', () => {
    expect(centerOfGravity([])).toMatchObject({ ok: false, error: { code: 'empty-points' } });
  });

  it('відхиляє від’ємну вагу точки', () => {
    expect(centerOfGravity([{ x: 0, y: 0, weight: -5 }])).toMatchObject({ ok: false, error: { code: 'negative-value' } });
  });

  it('відхиляє нульовий сумарний обсяг перевезень', () => {
    expect(centerOfGravity([{ x: 10, y: 10, weight: 0 }])).toMatchObject({ ok: false, error: { code: 'non-positive-weight' } });
  });
});
