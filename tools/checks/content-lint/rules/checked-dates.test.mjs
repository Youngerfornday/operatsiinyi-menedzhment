import { describe, expect, it } from 'vitest';
import { baseline, file } from '../__fixtures__/baseline.mjs';
import { checkCheckedDates, todayIso } from './checked-dates.mjs';

const ref = (code, date) => [
  'refs:',
  '  - source: Старченко Г.В. та ін., 2020',
  `    locator: розділ «Запаси» (${code})`,
  `    checkedAt: '${date}'`,
];

describe('checkCheckedDates', () => {
  const base = baseline();
  const today = '2026-09-17';

  it('reports a date that contradicts the rule of the baseline document', () => {
    const findings = checkCheckedDates([file('content/banks/training/m1.yaml', ref('EOQ-01', '2026-09-14'))], base, today);
    expect(findings).toMatchObject([{ level: 'error', rule: 'checked-date', line: 4 }]);
    expect(findings[0].message).toContain('2026-09-15');
    expect(findings[0].message).toContain('formula-baseline.md');
  });

  it('accepts the date recorded on the code row, and the section fallback date', () => {
    expect(checkCheckedDates([file('content/banks/training/m1.yaml', ref('EOQ-01', '2026-09-15'))], base, today)).toEqual([]);
    expect(checkCheckedDates([file('content/banks/training/m1.yaml', ref('CAP-03', '2026-09-16'))], base, today)).toEqual([]);
    expect(checkCheckedDates([file('content/banks/training/m1.yaml', ref('EOQ-04', '2026-09-14'))], base, today)).toEqual([]);
    expect(checkCheckedDates([file('content/banks/training/m1.yaml', ref('ISO-9001-11', '2026-09-15'))], base, today)).toEqual([]);
  });

  it('reports a future check date of a code reference and of a source', () => {
    const future = checkCheckedDates([file('content/banks/training/m1.yaml', ref('EOQ-01', '2026-10-01'))], base, today);
    expect(future.map((finding) => finding.message)).toEqual([
      expect.stringContaining('у майбутньому'),
      expect.stringContaining('formula-baseline.md фіксує'),
    ]);
    const sources = file('content/modules/m1/t01/sources.yaml', [
      'topic: t01',
      'sources:',
      '  - id: starchenko-2020',
      '    url: https://example.org/b',
      "    checkedAt: '2026-12-31'",
    ]);
    expect(checkCheckedDates([sources], base, today)).toMatchObject([{ level: 'error', line: 3 }]);
  });

  it('checks the date of a <StandardRef> tag and accepts the section-level 2026-09-16 check of CAP-03', () => {
    const lecture = file('content/modules/m1/t01/lecture.mdx', [
      '<StandardRef source="Гевко І., 2017" locator="розділ «Продуктивність» (CAP-03)" checkedAt="2026-09-16">Норма.</StandardRef>',
      '',
      '<StandardRef source="Старченко Г.В. та ін., 2020" locator="розділ «Запаси» (EOQ-01)" checkedAt="2026-09-16">Норма.</StandardRef>',
    ]);
    expect(checkCheckedDates([lecture], base, today)).toMatchObject([{ level: 'error', line: 3, message: expect.stringContaining('EOQ-01') }]);
  });

  it('ignores a code that is not in either baseline (left to ref-code)', () => {
    expect(checkCheckedDates([file('content/banks/training/m1.yaml', ref('EOQ-99', '2026-09-15'))], base, today)).toEqual([]);
  });

  it('defaults to the current day', () => {
    expect(todayIso(new Date('2026-09-17T10:00:00Z'))).toBe('2026-09-17');
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
