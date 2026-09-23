import { describe, expect, it } from 'vitest';
import { createEmptyProgress } from '../../engines/progress';
import {
  CALCULATOR_TRAINERS,
  homeTrainerCards,
  MATRIX_TRAINER,
  PRACTICAL_TRAINERS,
  PRODUCTIVITY_TRAINER,
  PUBLISHED_PRACTICALS,
  practicalLabel,
  practicalPath,
  publishedTrainer,
  topicTrainerActivityIds,
  trainerKindLabel,
} from './catalog';
import { practicumNote, practicumProgress } from './practicum-progress';

const PRACTICALS = [
  { id: 'p02', topics: ['t02'], trainers: ['priorities-matrix'] },
  { id: 'p04', topics: ['t05'], trainers: ['not-a-trainer'] },
];

describe('каталог тренажерів', () => {
  it('немає тренажерів-калькуляторів, доки перший з них не додано', () => {
    expect(CALCULATOR_TRAINERS).toEqual([]);
  });

  it('матриця й продуктивність — перші тренажери практичних, і в кожного є ID активності', () => {
    expect(MATRIX_TRAINER.activityId).toBe('p02-matching-matrix');
    expect(PRODUCTIVITY_TRAINER.activityId).toBe('productivity');
    expect(PRACTICAL_TRAINERS.slice(0, 2)).toEqual([PRODUCTIVITY_TRAINER, MATRIX_TRAINER]);
  });

  it('ID реєстру тренажерів не повторюються', () => {
    const ids = PRACTICAL_TRAINERS.map((trainer) => trainer.registryId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(PRACTICAL_TRAINERS.filter((trainer) => trainer.path.includes('#trenazher-')).map((trainer) => [trainer.registryId, trainer] as const))(
    '%s веде на якір свого тренажера на сторінці своєї практичної, має ID активності й підпис виду',
    (registryId, trainer) => {
      expect(trainer.path).toBe(`praktychni/${trainer.practicalId}/#trenazher-${registryId}`);
      expect(trainer.activityId).toBe(registryId);
      expect(trainerKindLabel(registryId)).toBe('розрахункові задачі');
    },
  );

  it('опубліковано практичні з тренажерами', () => {
    expect(PUBLISHED_PRACTICALS).toEqual(expect.arrayContaining(['p01', 'p02', 'p03', 'p04', 'p05', 'p06']));
  });

  it('опубліковані тренажери знаходяться за ID реєстру, невідомі — ні', () => {
    expect(publishedTrainer('priorities-matrix')).toMatchObject({ path: 'praktychni/p02/#trenazher', activityId: 'p02-matching-matrix' });
    expect(publishedTrainer('productivity')).toMatchObject({ path: 'praktychni/p01/#trenazher', activityId: 'productivity' });
    expect(publishedTrainer('eoq')).toMatchObject({ path: 'praktychni/p06/#trenazher-eoq', activityId: 'eoq' });
    expect(publishedTrainer('not-a-trainer')).toBeNull();
  });

  it('тема отримує активності опублікованих тренажерів своїх практичних', () => {
    expect(topicTrainerActivityIds(PRACTICALS, 't02')).toEqual(['p02-matching-matrix']);
    expect(topicTrainerActivityIds(PRACTICALS, 't05')).toEqual([]);
  });

  it('підписи й шляхи', () => {
    expect(trainerKindLabel('productivity')).toBe('розрахункові задачі');
    expect(trainerKindLabel('priorities-matrix')).toBe('матриця зіставлення');
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
    expect(practicumProgress(empty, ['p02-matching-matrix'])).toEqual({ state: 'todo', done: 0, total: 1 });

    const one = { ...empty, activities: { 'p02-matching-matrix': activity } };
    const partial = practicumProgress(one, ['p02-matching-matrix', 'p04-forecasting']);
    expect(partial).toEqual({ state: 'doing', done: 1, total: 2 });
    expect(partial && practicumNote(partial)).toBe('1 із 2');

    const full = practicumProgress(one, ['p02-matching-matrix']);
    expect(full).toEqual({ state: 'done', done: 1, total: 1 });
    expect(full && practicumNote(full)).toBeUndefined();
  });
});

describe('homeTrainerCards', () => {
  it('показує тренажери опублікованих практичних, а не лише власні сторінки', () => {
    const cards = homeTrainerCards();
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.map((card) => card.key)).toContain('productivity');
    expect(cards.map((card) => card.key)).toContain('priorities-matrix');
    expect(cards.map((card) => card.key)).toContain('facility-location');
    expect(cards.map((card) => card.key)).toContain('line-balancing');
    expect(cards.map((card) => card.key)).toContain('work-measurement');
    expect(cards.map((card) => card.key)).toContain('eoq');
    expect(cards.map((card) => card.key)).toContain('mrp');
    expect(cards.map((card) => card.key)).toContain('sequencing');
    expect(cards.every((card) => card.path !== '' && card.title !== '')).toBe(true);
  });
});
