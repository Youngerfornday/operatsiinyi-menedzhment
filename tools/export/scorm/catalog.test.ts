import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, test } from 'vitest';
import { MATRIX_TRAINER } from '../../../src/components/trainers/catalog.ts';
import { CourseSchema, type Course } from '../../../src/content/schemas/course.ts';
import type { PracticalFile } from '../../../src/content/schemas/practical.ts';
import { parseDataFile } from '../downloads-sources.ts';
import { DEFAULT_MASTERY_PERCENT, matrixCriterion, scormPackageSpecs } from './catalog.ts';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
let course: Course;

beforeAll(async () => {
  course = await parseDataFile(join(ROOT, 'content/course.yaml'), CourseSchema);
});

/**
 * Файл тренажера п02 (`content/practicals/p02.yaml`) — синтетична заготовка, а не реальний контент:
 * реєстр практичних (course.yaml) уже описує «п02. Операційна стратегія», а сам файл тренажера ще не
 * написаний в цьому лейні. Мінімальна форма, що задовольняє `PracticalFile`, аби перевірити логіку
 * складання специфікації пакета незалежно від того, чи вже опубліковано реальний вміст.
 */
const SOURCE_ID = 'osnovy-om';
const matrixFile: PracticalFile = {
  id: 'p02',
  title: 'Матриця операційних пріоритетів і рішень',
  intro: 'Зіставте операційні пріоритети з рішеннями операційного менеджменту.',
  status: 'draft',
  updatedAt: '2026-09-01',
  sources: [{ id: SOURCE_ID, type: 'book', title: 'Операційний менеджмент', authors: [], language: 'uk', url: 'https://example.com/', checkedAt: '2026-09-01' }],
  trainer: {
    kind: 'matching-matrix',
    models: [
      {
        id: 'model-a',
        title: 'Модель А',
        short: 'А',
        countries: ['Україна'],
        summary: 'Опис моделі А.',
        examples: [{ company: 'Компанія А', country: 'Україна', note: 'Приклад.', url: 'https://example.com/a', checkedAt: '2026-09-01' }],
      },
      {
        id: 'model-b',
        title: 'Модель Б',
        short: 'Б',
        countries: ['Україна'],
        summary: 'Опис моделі Б.',
        examples: [{ company: 'Компанія Б', country: 'Україна', note: 'Приклад.', url: 'https://example.com/b', checkedAt: '2026-09-01' }],
      },
    ],
    features: [
      {
        id: 'feature-1',
        title: 'Ознака 1',
        cells: [
          { model: 'model-a', statement: 'Формулювання А1', explanation: 'Пояснення А1.', source: SOURCE_ID, alsoSources: [] },
          { model: 'model-b', statement: 'Формулювання Б1', explanation: 'Пояснення Б1.', source: SOURCE_ID, alsoSources: [] },
        ],
      },
      {
        id: 'feature-2',
        title: 'Ознака 2',
        cells: [
          { model: 'model-a', statement: 'Формулювання А2', explanation: 'Пояснення А2.', source: SOURCE_ID, alsoSources: [] },
          { model: 'model-b', statement: 'Формулювання Б2', explanation: 'Пояснення Б2.', source: SOURCE_ID, alsoSources: [] },
        ],
      },
    ],
    companyTasks: [
      { id: 'task-1', company: 'Компанія X', description: 'Опис компанії X.', answer: 'model-a', keyFeatures: ['feature-1', 'feature-2'], explanation: 'Пояснення.', source: SOURCE_ID },
    ],
    essay: {
      prompt: 'Опишіть модель, найближчу до практики українських компаній.',
      maxWords: 300,
      expectations: ['Чітка теза', 'Щонайменше один аргумент'],
      hints: [],
    },
  },
};

describe('scormPackageSpecs', () => {
  test('packages the matrix trainer for every practical that has a trainer file', () => {
    // Act
    const specs = scormPackageSpecs(course, [matrixFile]);

    // Assert
    expect(specs.map((spec) => [spec.id, spec.kind, spec.practicalId])).toEqual([['p02-matrytsia-zistavlennia', 'matrix', 'p02']]);
  });

  test('skips practicals without a trainer file', () => {
    expect(scormPackageSpecs(course, [])).toEqual([]);
  });

  test('uses the same activity ID as the site, so progress events match', () => {
    const [matrix] = scormPackageSpecs(course, [matrixFile]);
    expect(matrix?.data.activityId).toBe(MATRIX_TRAINER.activityId);
  });

  test('takes the mastery percent from the top rubric band', () => {
    const [matrix] = scormPackageSpecs(course, [matrixFile]);
    expect(matrix?.masteryPercent).toBe(90);
    expect(matrix?.data.masteryPercent).toBe(90);
  });

  test('ships the matrix with typography, all cells, sources and company tasks', () => {
    // Act
    const [matrix] = scormPackageSpecs(course, [matrixFile]);

    // Assert
    expect(matrix?.data.kind).toBe('matrix');
    if (matrix?.data.kind !== 'matrix') return;
    expect(matrix.data.matrix.features).toHaveLength(matrixFile.trainer.kind === 'matching-matrix' ? matrixFile.trainer.features.length : 0);
    expect(Object.keys(matrix.data.sources)).toEqual(matrixFile.sources.map((source) => source.id));
    expect(matrix.data.companyTasks).toHaveLength(1);
    expect(matrix.title.replace(/\s/g, ' ')).toBe('П2. Операційна стратегія та операційні пріоритети підприємства');
    expect(matrix.module).toBe('m1');
  });
});

describe('matrixCriterion', () => {
  test('fails with an explanation when no rubric criterion has percent thresholds', () => {
    // Arrange
    const practical = course.practicals.find((candidate) => candidate.id === 'p03');
    if (!practical) throw new Error('немає p03');

    // Act and Assert
    expect(() => matrixCriterion(practical)).toThrow(/немає критерію з порогами/);
  });
});

describe('DEFAULT_MASTERY_PERCENT', () => {
  test('is a full score, used when a rubric band has no explicit percent', () => {
    expect(DEFAULT_MASTERY_PERCENT).toBe(100);
  });
});
