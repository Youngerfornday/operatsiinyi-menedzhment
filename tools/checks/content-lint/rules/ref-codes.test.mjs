import { describe, expect, it } from 'vitest';
import { baseline, file } from '../__fixtures__/baseline.mjs';
import { checkRefCodes } from './ref-codes.mjs';

describe('checkRefCodes', () => {
  const base = baseline();

  it('reports a code absent from both baselines', () => {
    const bank = file('content/banks/training/m1.yaml', [
      'questions:',
      '  - id: q1',
      '    refs:',
      '      - source: Старченко Г.В. та ін., 2020',
      '        locator: розділ «Запаси» (EOQ-99)',
      "        checkedAt: '2026-09-15'",
    ]);
    const findings = checkRefCodes([bank], base);
    expect(findings).toMatchObject([{ level: 'error', rule: 'ref-code', line: 5 }]);
    expect(findings[0].message).toContain('EOQ-99');
  });

  it('reports a source that does not match the baseline for the code', () => {
    const bank = file('content/banks/training/m1.yaml', [
      'questions:',
      '  - id: q1',
      '    refs:',
      '      - source: Інший підручник, 1999',
      '        locator: розділ «Запаси» (EOQ-01)',
      "        checkedAt: '2026-09-15'",
    ]);
    const findings = checkRefCodes([bank], base);
    expect(findings).toMatchObject([{ level: 'error', rule: 'ref-code', line: 4 }]);
    expect(findings[0].message).toContain('Старченко');
  });

  it('accepts a known code with a matching source', () => {
    const bank = file('content/banks/training/m1.yaml', [
      'questions:',
      '  - id: q1',
      '    refs:',
      '      - source: Старченко Г.В. та ін., 2020',
      '        locator: розділ «Запаси», формула EOQ (EOQ-01)',
      "        checkedAt: '2026-09-15'",
    ]);
    expect(checkRefCodes([bank], base)).toEqual([]);
  });

  it('reports an unknown code in <Formula> and <WorkedExample> attributes', () => {
    const lecture = file('content/modules/m1/t01/lecture.mdx', [
      '<Formula code="EOQ-01">Q = √(2DS/H)</Formula>',
      '',
      '<WorkedExample code="CAP-99">Приклад.</WorkedExample>',
    ]);
    const findings = checkRefCodes([lecture], base);
    expect(findings).toMatchObject([{ level: 'error', line: 3 }]);
    expect(findings[0].message).toContain('CAP-99');
    expect(findings[0].message).toContain('WorkedExample');
  });

  it('reports an unrecognised code mentioned in prose only when its family is known', () => {
    const lecture = file('content/modules/m1/t01/lecture.mdx', [
      'Формула (EOQ-77) наводиться нижче.',
      '',
      'Компанія X-01 запустила новий продукт.',
    ]);
    const findings = checkRefCodes([lecture], base);
    expect(findings).toMatchObject([{ level: 'error', line: 1 }]);
    expect(findings[0].message).toContain('EOQ-77');
  });

  it('accepts a baseline mention in prose that names a known code', () => {
    const lecture = file('content/modules/m1/t01/lecture.mdx', [
      'Формула наведена в formula-baseline EOQ-01 і в standards-baseline, ISO-9001-11.',
    ]);
    expect(checkRefCodes([lecture], base)).toEqual([]);
  });
});
