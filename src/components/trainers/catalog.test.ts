import { describe, expect, it } from 'vitest';
import { createEmptyProgress } from '../../engines/progress';
import { CALCULATOR_TRAINERS, MATRIX_TRAINER, PRACTICAL_TRAINERS, practicalLabel, practicalPath, publishedTrainer, topicTrainerActivityIds, trainerKindLabel } from './catalog';
import { practicumNote, practicumProgress } from './practicum-progress';

const PRACTICALS = [
  { id: 'p01', topics: ['t01', 't02'], trainers: ['model-matrix'] },
  { id: 'p04', topics: ['t05'], trainers: ['forecasting'] },
];

describe('каталог тренажерів', () => {
  it('немає тренажерів-калькуляторів, доки перший з них не додано', () => {
    expect(CALCULATOR_TRAINERS).toEqual([]);
  });

  it('матриця моделей — єдиний тренажер на сторінці практичної, і в неї є ID активності', () => {
    expect(MATRIX_TRAINER.activityId).toBe('p01-model-matrix');
    expect(PRACTICAL_TRAINERS).toEqual([MATRIX_TRAINER]);
  });

  it('опубліковані тренажери знаходяться за ID реєстру, неопубліковані — ні', () => {
    expect(publishedTrainer('model-matrix')).toMatchObject({ path: 'praktychni/p01/#trenazher', activityId: 'p01-model-matrix' });
    expect(publishedTrainer('forecasting')).toBeNull();
  });

  it('тема отримує активності опублікованих тренажерів своїх практичних', () => {
    expect(topicTrainerActivityIds(PRACTICALS, 't02')).toEqual(['p01-model-matrix']);
    expect(topicTrainerActivityIds(PRACTICALS, 't05')).toEqual([]);
  });

  it('підписи й шляхи', () => {
    expect(trainerKindLabel('model-matrix')).toBe('матриця моделей (зіставлення)');
    expect(trainerKindLabel('unknown-kind')).toBe('unknown-kind');
    expect(trainerKindLabel('toString')).toBe('toString');
    expect(practicalPath('p01')).toBe('praktychni/p01/');
    expect(practicalLabel('p08')).toBe('П8');
  });
});

describe('practicumProgress', () => {
  const now = new Date('2026-09-17T10:00:00.000Z');
  const activity = { attempts: 1, bestScore: 1, completedAt: now.toISOString() };

  it('немає тренажерів — null; жодного, частина, усі', () => {
    const empty = createEmptyProgress(now);
    expect(practicumProgress(empty, [])).toBeNull();
    expect(practicumProgress(empty, ['p01-model-matrix'])).toEqual({ state: 'todo', done: 0, total: 1 });

    const one = { ...empty, activities: { 'p01-model-matrix': activity } };
    const partial = practicumProgress(one, ['p01-model-matrix', 'p04-forecasting']);
    expect(partial).toEqual({ state: 'doing', done: 1, total: 2 });
    expect(partial && practicumNote(partial)).toBe('1 із 2');

    const full = practicumProgress(one, ['p01-model-matrix']);
    expect(full).toEqual({ state: 'done', done: 1, total: 1 });
    expect(full && practicumNote(full)).toBeUndefined();
  });
});
