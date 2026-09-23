import { describe, expect, it } from 'vitest';
import { baseline, course, file } from './__fixtures__/baseline.mjs';
import { lintContent } from './lint.mjs';

describe('lintContent', () => {
  it('collects findings of every rule in one pass', () => {
    const lecture = file('content/modules/m1/t01/lecture.mdx', [
      '---',
      'id: t01',
      'keyTerms:',
      '  - eoq',
      'refs:',
      '  - source: Старченко Г.В. та ін., 2020',
      '    locator: розділ «Запаси», формула EOQ (EOQ-01)',
      "    checkedAt: '2026-09-15'",
      'updatedAt: 2026-09-16',
      '---',
      'Toyota змінила виробничі процеси через причини, повʼязані з конкуренцією.',
      '',
      'Показник: точні порогові частки ABC-аналізу за цим курсом становлять 80/15/5.',
      '',
      'Понад 97 % запасів належать до категорії C.',
      '',
      '<Term id="oee">загальна ефективність обладнання</Term>',
    ]);
    const findings = lintContent({ files: [lecture], baseline: baseline(), course, today: '2026-09-17' });
    expect([...new Set(findings.map((finding) => finding.rule))].sort()).toEqual([
      'case-caveat',
      'number-without-source',
      'ref-consistency',
      'term',
      'unconfirmed-zone',
    ]);
  });

  it('works without a course registry and with the current date', () => {
    const lecture = file('content/modules/m1/t01/lecture.mdx', ['<Term id="eoq">EOQ</Term>']);
    expect(lintContent({ files: [lecture], baseline: baseline() }).map((finding) => finding.rule)).toEqual(['term']);
  });

  it('returns nothing for clean content', () => {
    const clean = file('content/modules/m1/t01/lecture.mdx', ['---', 'id: t01', 'updatedAt: 2026-09-16', '---', 'Звичайний абзац.']);
    expect(lintContent({ files: [clean], baseline: baseline(), course, today: '2026-09-17' })).toEqual([]);
  });
});
