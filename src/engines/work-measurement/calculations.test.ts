import { describe, expect, it } from 'vitest';
import { operativeTime, outputRate, pieceRateTime, pieceTime } from './calculations';

/**
 * Фікстури — вивірені числа з content/modules/m2/t05/lecture.mdx, WorkedExample code="WM-04":
 * То = 3,2 хв, Тд = 0,6 хв, обслуговування 4% і відпочинок 6% оперативного часу, Тпз = 18 хв на
 * партію з n = 40 шт., Тзм = 480 хв. Очікувано: Топ = 3,8; Тшт = 4,18; Тшт.к = 4,63; Нвир = 103.
 */
describe('operativeTime (WM-01)', () => {
  it('3,8 хв — сума основного і допоміжного часу', () => {
    const result = operativeTime(3.2, 0.6);
    expect(result.ok && result.value).toBeCloseTo(3.8, 9);
  });

  it('відхиляє від’ємні складові', () => {
    expect(operativeTime(-1, 0.6)).toMatchObject({ ok: false, error: { code: 'negative-value' } });
    expect(operativeTime(3.2, -0.6)).toMatchObject({ ok: false, error: { code: 'negative-value' } });
  });
});

describe('pieceTime (WM-02)', () => {
  it('4,18 хв при 4% на обслуговування і 6% на відпочинок оперативного часу', () => {
    const result = pieceTime(3.8, 0.04, 0.06);
    expect(result.ok && result.value).toBeCloseTo(4.18, 9);
  });

  it('відхиляє недодатний оперативний час і від’ємні частки', () => {
    expect(pieceTime(0, 0.04, 0.06)).toMatchObject({ ok: false, error: { code: 'non-positive-value' } });
    expect(pieceTime(3.8, -0.04, 0.06)).toMatchObject({ ok: false, error: { code: 'negative-value' } });
  });

  it('відхиляє суму часток, що дорівнює або перевищує 100% оперативного часу', () => {
    expect(pieceTime(3.8, 0.6, 0.4)).toMatchObject({ ok: false, error: { code: 'share-too-large' } });
  });
});

describe('pieceRateTime (WM-03)', () => {
  it('4,63 хв при підготовчо-завершальному часі 18 хв на партію з 40 шт.', () => {
    const result = pieceRateTime(4.18, 18, 40);
    expect(result.ok && result.value).toBeCloseTo(4.63, 9);
  });

  it('відхиляє недодатний штучний час, від’ємний підготовчий час і недодатний розмір партії', () => {
    expect(pieceRateTime(0, 18, 40)).toMatchObject({ ok: false, error: { code: 'non-positive-value' } });
    expect(pieceRateTime(4.18, -1, 40)).toMatchObject({ ok: false, error: { code: 'negative-value' } });
    expect(pieceRateTime(4.18, 18, 0)).toMatchObject({ ok: false, error: { code: 'non-positive-denominator' } });
  });
});

describe('outputRate (WM-04)', () => {
  it('103 придатних вироби за зміну (округлення вниз)', () => {
    expect(outputRate(480, 4.63)).toEqual({ ok: true, value: 103 });
  });

  it('ціла частка не губиться через похибку double: 450 / 6,25 = 72, а не 71', () => {
    // Тшт.к = 5,75 + 15 / 30 рахується в double як 6,250000000000001, і 450 / Тшт.к виходить 71,999…
    expect(outputRate(450, 5.750000000000001 + 15 / 30)).toEqual({ ok: true, value: 72 });
  });

  it('відхиляє недодатний змінний фонд і недодатний штучно-калькуляційний час', () => {
    expect(outputRate(0, 4.63)).toMatchObject({ ok: false, error: { code: 'non-positive-denominator' } });
    expect(outputRate(480, 0)).toMatchObject({ ok: false, error: { code: 'non-positive-value' } });
  });
});
