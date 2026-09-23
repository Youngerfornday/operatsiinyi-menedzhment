import { describe, expect, it } from 'vitest';
import { calculationConditionNote, matrixConditionNote, practicalSections, practicalXpChip } from './view';

describe('practicalSections', () => {
  it('keeps the shared sections around the trainer ones', () => {
    const ids = practicalSections('matching-matrix').map((section) => section.id);
    expect(ids).toEqual(['meta', 'umova', 'trenazher', 'kompanii', 'ese', 'rubryka', 'dani']);
  });

  it('puts the data section last', () => {
    expect(practicalSections('matching-matrix').at(-1)?.label).toBe('Дані, формули й джерела');
  });

  it('never repeats an anchor', () => {
    for (const kind of ['matching-matrix', 'calculation-tasks'] as const) {
      const ids = practicalSections(kind).map((section) => section.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('gives the calculator trainer its own single section before essay and rubric', () => {
    expect(practicalSections('calculation-tasks').map((section) => section.id)).toEqual(['meta', 'umova', 'trenazher', 'ese', 'rubryka', 'dani']);
  });

  it('gives each calculator trainer its own section when a practical has several (p03)', () => {
    const trainers = [
      { id: 'trenazher-little-law', label: 'Тренажер: закон Літтла' },
      { id: 'trenazher-production-cycle', label: 'Тренажер: тривалість виробничого циклу' },
    ];
    expect(practicalSections('calculation-tasks', trainers).map((section) => section.id)).toEqual([
      'meta',
      'umova',
      'trenazher-little-law',
      'trenazher-production-cycle',
      'ese',
      'rubryka',
      'dani',
    ]);
  });
});

describe('practicalXpChip', () => {
  it('names the matrix in the chip of the matrix practical', () => {
    expect(practicalXpChip('matching-matrix')).toContain('матрицю');
  });

  it('falls back to a generic task chip for the calculator trainer', () => {
    expect(practicalXpChip('calculation-tasks')).toBe('до 60 XP за задачі тренажера');
  });

  it('multiplies the XP by the number of calculator trainers on the page (p03 has two)', () => {
    expect(practicalXpChip('calculation-tasks', 2)).toBe('до 120 XP за задачі тренажера');
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

describe('calculationConditionNote', () => {
  it('names the number of task types', () => {
    expect(calculationConditionNote(7)).toContain('7 типів задач');
  });
});
