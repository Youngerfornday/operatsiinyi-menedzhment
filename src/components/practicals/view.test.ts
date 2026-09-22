import { describe, expect, it } from 'vitest';
import { matrixConditionNote, practicalSections, practicalXpChip } from './view';

describe('practicalSections', () => {
  it('keeps the shared sections around the trainer ones', () => {
    const ids = practicalSections('matching-matrix').map((section) => section.id);
    expect(ids).toEqual(['meta', 'umova', 'trenazher', 'kompanii', 'ese', 'rubryka', 'dani']);
  });

  it('puts the data section last', () => {
    expect(practicalSections('matching-matrix').at(-1)?.label).toBe('Дані, формули й джерела');
  });

  it('never repeats an anchor', () => {
    for (const kind of ['matching-matrix'] as const) {
      const ids = practicalSections(kind).map((section) => section.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe('practicalXpChip', () => {
  it('names the matrix in the chip of the matrix practical', () => {
    expect(practicalXpChip('matching-matrix')).toContain('матрицю');
  });
});

describe('matrixConditionNote', () => {
  it('counts the matrix cells and names the rubric criterion', () => {
    const note = matrixConditionNote({ features: 12, models: 4, cells: 48, rubricTitle: 'Матриця моделей' });
    expect(note).toContain('12 ознак × 4 моделі = 48 формулювань');
    expect(note).toContain('«Матриця моделей»');
  });

  it('says the second attempt is the graded one', () => {
    const note = matrixConditionNote({ features: 8, models: 3, cells: 24, rubricTitle: 'Критерій' });
    expect(note).toContain('оцінюється друга');
  });
});
