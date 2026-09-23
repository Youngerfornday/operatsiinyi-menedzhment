import { describe, expect, it } from 'vitest';
import { activityVariance, computePertProject, expectedTime, onTimeProbability, projectZ, standardNormalCdf } from './pert';
import type { PertEstimate } from './types';

/**
 * Фікстура — WorkedExample code="PRJ-05" лекції теми 7: ті самі сім робіт запуску лінії пакування,
 * тепер із трьома оцінками замість однієї. Очікуваний результат: TE = 18 тижнів, σ² ≈ 2,111,
 * Z ≈ 1,38 для директивного строку 20 тижнів, імовірність ≈ 91,6 %.
 */
const LECTURE_ESTIMATES: readonly PertEstimate[] = [
  { id: 'A', optimistic: 1, mostLikely: 2, pessimistic: 3, predecessors: [] },
  { id: 'B', optimistic: 3, mostLikely: 5, pessimistic: 7, predecessors: ['A'] },
  { id: 'C', optimistic: 2, mostLikely: 4, pessimistic: 6, predecessors: ['A'] },
  { id: 'D', optimistic: 1, mostLikely: 3, pessimistic: 5, predecessors: ['B'] },
  { id: 'E', optimistic: 3, mostLikely: 6, pessimistic: 9, predecessors: ['C'] },
  { id: 'F', optimistic: 2, mostLikely: 4, pessimistic: 6, predecessors: ['D', 'E'] },
  { id: 'G', optimistic: 1, mostLikely: 2, pessimistic: 3, predecessors: ['F'] },
];

describe('expectedTime (PRJ-05)', () => {
  it('te = (o + 4m + p) / 6 — робота E: (3 + 24 + 9) / 6 = 6', () => {
    expect(expectedTime(3, 6, 9)).toBe(6);
  });
});

describe('activityVariance (PRJ-06)', () => {
  it('σ² = ((p − o) / 6)² — робота E: ((9 − 3) / 6)² = 1', () => {
    expect(activityVariance(3, 9)).toBe(1);
  });
});

describe('computePertProject', () => {
  it('рахує TE = 18 тижнів і критичний шлях A-C-E-F-G, як для точкових оцінок лекції', () => {
    const result = computePertProject(LECTURE_ESTIMATES);

    expect(result.ok && result.value.expectedDuration).toBe(18);
    expect(result.ok && result.value.network.criticalPath).toEqual(['A', 'C', 'E', 'F', 'G']);
  });

  it('рахує дисперсію проекту лише за роботами критичного шляху — σ² ≈ 2,111', () => {
    const result = computePertProject(LECTURE_ESTIMATES);

    expect(result.ok && result.value.variance).toBeCloseTo(2.111, 3);
  });

  it('відхиляє невалідні оцінки (p < m)', () => {
    const invalid: PertEstimate[] = [{ id: 'A', optimistic: 1, mostLikely: 5, pessimistic: 3, predecessors: [] }];
    expect(computePertProject(invalid)).toMatchObject({ ok: false, error: { code: 'invalid-pert-estimates' } });
  });

  it('відхиляє порожній перелік', () => {
    expect(computePertProject([])).toMatchObject({ ok: false, error: { code: 'empty-activities' } });
  });
});

describe('projectZ (PRJ-07)', () => {
  it('Z = (D − TE) / σ, округлений до 2 знаків — директивний строк 20 тижнів дає Z ≈ 1,38', () => {
    const project = computePertProject(LECTURE_ESTIMATES);
    const z = project.ok && projectZ(20, project.value.expectedDuration, project.value.sigma);
    expect(z && z.ok && z.value).toBeCloseTo(1.38, 2);
  });

  it('відхиляє невалідне (нульове) стандартне відхилення', () => {
    expect(projectZ(20, 18, 0)).toMatchObject({ ok: false, error: { code: 'non-positive-sigma' } });
  });
});

describe('standardNormalCdf', () => {
  it('Φ(0) = 0,5 — симетрія навколо середнього', () => {
    expect(standardNormalCdf(0)).toBeCloseTo(0.5, 6);
  });

  it('Φ(1,38) ≈ 0,9162, як за таблицею нормального розподілу в лекції', () => {
    expect(standardNormalCdf(1.38)).toBeCloseTo(0.9162, 3);
  });

  it('антисиметрична: Φ(−z) = 1 − Φ(z)', () => {
    expect(standardNormalCdf(-1.38)).toBeCloseTo(1 - standardNormalCdf(1.38), 9);
  });
});

describe('onTimeProbability (PRJ-07)', () => {
  it('дає ≈ 91,6 % для директивного строку 20 тижнів наскрізного прикладу', () => {
    const project = computePertProject(LECTURE_ESTIMATES);
    const probability = project.ok && onTimeProbability(20, project.value.expectedDuration, project.value.sigma);
    expect(probability && probability.ok && probability.value).toBeCloseTo(0.916, 2);
  });

  it('дає рівно 50 % для строку, що дорівнює очікуваній тривалості', () => {
    const project = computePertProject(LECTURE_ESTIMATES);
    const probability = project.ok && onTimeProbability(project.value.expectedDuration, project.value.expectedDuration, project.value.sigma);
    expect(probability && probability.ok && probability.value).toBeCloseTo(0.5, 6);
  });
});
