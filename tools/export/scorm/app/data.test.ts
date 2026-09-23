import { describe, expect, test } from 'vitest';
import { packageDataScript, parsePackageData, type ScormPackageData } from './data.ts';

const MATRIX: ScormPackageData = {
  kind: 'matrix',
  activityId: 'p01-matching-matrix',
  masteryPercent: 90,
  practicalId: 'p01',
  matrix: { models: [], features: [] },
  sources: {},
  rubric: { title: 'Матриця моделей', bands: [] },
  companyTasks: [],
};

describe('packageDataScript', () => {
  test('escapes < so content cannot close the script element', () => {
    // Arrange
    const data = { ...MATRIX, activityId: '</script><script>alert(1)</script>' };

    // Act
    const script = packageDataScript(data);

    // Assert
    expect(script).not.toContain('<');
    expect(JSON.parse(script)).toEqual(data);
  });
});

describe('parsePackageData', () => {
  test('returns data of the expected kind', () => {
    expect(parsePackageData(packageDataScript(MATRIX), 'matrix')).toEqual(MATRIX);
  });

  test.each([
    ['not json', null, /коректного JSON/],
    ['wrong kind', JSON.stringify({ kind: 'legacy', activityId: 'x', masteryPercent: 90 }), /не належать тренажеру «matrix»/],
    ['no mastery', JSON.stringify({ kind: 'matrix', activityId: 'x' }), /прохідного бала/],
    ['mastery out of range', JSON.stringify({ kind: 'matrix', activityId: 'x', masteryPercent: 140 }), /прохідного бала/],
  ])('rejects %s', (_label, text, message) => {
    expect(() => parsePackageData(text, 'matrix')).toThrow(message);
  });

  test('requires matrix, rubric, sources and company tasks for the matrix package', () => {
    // Arrange
    const incomplete = JSON.stringify({ kind: 'matrix', activityId: 'p01-matching-matrix', masteryPercent: 90, matrix: {} });

    // Act and Assert
    expect(() => parsePackageData(incomplete, 'matrix')).toThrow(/матриці, рубрики чи джерел/);
  });
});
