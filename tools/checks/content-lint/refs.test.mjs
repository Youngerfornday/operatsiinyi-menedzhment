import { describe, expect, it } from 'vitest';
import { file } from './__fixtures__/baseline.mjs';
import { baselineMentionsIn, codeAttrRefsOf, codesIn, refsOf, sourceCheckedDates } from './refs.mjs';

describe('refsOf', () => {
  it('reads refs maps with the lines of locator and checkedAt', () => {
    const bank = file('content/banks/training/m1.yaml', [
      'questions:',
      '  - id: q1',
      '    refs:',
      '      - source: Старченко Г.В. та ін., 2020',
      '        locator: розділ «Запаси», формула EOQ (EOQ-01)',
      "        checkedAt: '2026-09-15'",
      '        url: https://example.org/eoq',
    ]);
    expect(refsOf(bank)).toEqual([{
      line: 4, endLine: 7, locatorLine: 5, dateLine: 6,
      source: 'Старченко Г.В. та ін., 2020', locator: 'розділ «Запаси», формула EOQ (EOQ-01)', checkedAt: '2026-09-15', url: 'https://example.org/eoq', codes: ['EOQ-01'],
    }]);
  });

  it('treats a <StandardRef> tag in the lecture body as a code reference', () => {
    const lecture = file('content/modules/m1/t01/lecture.mdx', [
      '---',
      'id: t01',
      '---',
      'Абзац.',
      '',
      '<StandardRef source="ISO 9001:2015 / ДСТУ ISO 9001:2015" locator="п. 8.5.1 (ISO-9001-11)"',
      '  url="https://example.org/9001" checkedAt="2026-09-16">',
      '  Текст пункту.',
      '</StandardRef>',
      '',
      '<StandardRef locator="розділ «Запаси» (EOQ-01)">Текст.</StandardRef>',
    ]);
    expect(refsOf(lecture)).toEqual([{
      line: 6, endLine: 7, locatorLine: 6, dateLine: 6,
      source: 'ISO 9001:2015 / ДСТУ ISO 9001:2015', locator: 'п. 8.5.1 (ISO-9001-11)', checkedAt: '2026-09-16', url: 'https://example.org/9001', codes: ['ISO-9001-11'],
    }]);
  });

  it('does not look for <StandardRef> tags in YAML', () => {
    expect(refsOf(file('content/course.yaml', ['note: \'<StandardRef locator="п. 4 (ISO-9001-01)" checkedAt="2026-09-14">\'']))).toEqual([]);
  });
});

describe('codeAttrRefsOf', () => {
  it('reads the code attribute of <Formula> and <WorkedExample> tags', () => {
    const lecture = file('content/modules/m1/t01/lecture.mdx', [
      'Текст.',
      '',
      '<Formula code="EOQ-01" label="Економічний розмір замовлення">Q = √(2DS/H)</Formula>',
      '',
      '<WorkedExample code="CAP-03">Приклад розрахунку OEE.</WorkedExample>',
    ]);
    expect(codeAttrRefsOf(lecture)).toEqual([
      { line: 3, component: 'Formula', code: 'EOQ-01' },
      { line: 5, component: 'WorkedExample', code: 'CAP-03' },
    ]);
  });

  it('ignores a <Formula> tag without a code attribute', () => {
    expect(codeAttrRefsOf(file('content/modules/m1/t01/lecture.mdx', ['<Formula label="X">Y</Formula>']))).toEqual([]);
  });
});

describe('code helpers', () => {
  it('finds codes and baseline mentions in prose', () => {
    expect(codesIn('п. 8.5.1 (ISO-9001-11, EOQ-01, ISO-9001-11)')).toEqual(['ISO-9001-11', 'EOQ-01']);
    expect(baselineMentionsIn('за formula-baseline EOQ-01 і standards-baseline, ISO-9001-11')).toEqual(['EOQ-01', 'ISO-9001-11']);
  });

  it('lists check dates of sources but not of code references', () => {
    const practical = file('content/practicals/p01.yaml', [
      'sources:',
      '  - id: iso-9001',
      '    title: ISO 9001:2015',
      '    url: https://example.org/9001',
      "    checkedAt: '2026-09-15'",
      '  - url: https://example.org/untitled',
      "    checkedAt: '2026-09-15'",
      'refs:',
      '  - locator: п. 4 (ISO-9001-01)',
      '    url: https://example.org/4',
      "    checkedAt: '2026-09-14'",
    ]);
    expect(sourceCheckedDates(practical)).toEqual([
      { line: 2, checkedAt: '2026-09-15', id: 'iso-9001', title: 'ISO 9001:2015' },
      { line: 6, checkedAt: '2026-09-15', id: '', title: '' },
    ]);
  });
});
