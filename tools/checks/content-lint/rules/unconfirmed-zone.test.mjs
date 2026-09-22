import { describe, expect, it } from 'vitest';
import { baseline, file } from '../__fixtures__/baseline.mjs';
import { checkUnconfirmedZone, hasNormMarker } from './unconfirmed-zone.mjs';

describe('checkUnconfirmedZone', () => {
  const base = baseline();

  it('warns when a definite claim touches an unconfirmed item of the formula baseline', () => {
    const lecture = file('content/modules/m1/t01/lecture.mdx', [
      'Показник: точні порогові частки ABC-аналізу за цим курсом становлять 80/15/5.',
    ]);
    const findings = checkUnconfirmedZone([lecture], base);
    expect(findings).toMatchObject([{ level: 'warning', rule: 'unconfirmed-zone', line: 1 }]);
    expect(findings[0].message).toContain('formula-baseline.md');
    expect(findings[0].hint).toContain('Пункт бази');
  });

  it('warns when a definite claim touches an unconfirmed item of the standards baseline', () => {
    const lecture = file('content/modules/m1/t01/lecture.mdx', [
      'Стандарт визначає повний каталог KPI ISO 22400-2 для виробництва.',
    ]);
    const findings = checkUnconfirmedZone([lecture], base);
    expect(findings).toMatchObject([{ level: 'warning', rule: 'unconfirmed-zone' }]);
    expect(findings[0].message).toContain('standards-baseline.md');
  });

  it('does not warn without a norm marker even if the wording matches', () => {
    const lecture = file('content/modules/m1/t01/lecture.mdx', [
      'Точні порогові частки ABC-аналізу тут не згадуються взагалі.',
    ]);
    expect(checkUnconfirmedZone([lecture], base)).toEqual([]);
  });

  it('does not warn about an unrelated sentence that only has a norm marker', () => {
    const lecture = file('content/modules/m1/t01/lecture.mdx', [
      'Формула EOQ обчислюється за відомими вхідними даними.',
    ]);
    expect(checkUnconfirmedZone([lecture], base)).toEqual([]);
  });

  it('skips the caveat field of the case registry', () => {
    const registry = file('content/course.yaml', [
      'cases:',
      '  - id: x',
      '    caveat: Показник точні порогові частки ABC-аналізу тут навмисно.',
    ]);
    expect(checkUnconfirmedZone([registry], base)).toEqual([]);
  });

  it('recognises the discipline norm markers', () => {
    expect(hasNormMarker('Коефіцієнт розраховано за формулою.')).toBe(true);
    expect(hasNormMarker('Стандарт ISO і ДСТУ визначають вимоги.')).toBe(true);
    expect(hasNormMarker('Звичайний абзац без маркерів.')).toBe(false);
  });
});
