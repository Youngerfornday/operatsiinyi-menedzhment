import { describe, expect, it } from 'vitest';
import { formatFindings, lintMdx, lintYaml, proseOfMdx } from './typography-rules.mjs';

describe('lintYaml', () => {
  const source = ['topic: t01', 'terms:', '  - id: x', "    term: Об'єкт", '    definition: "Норма № 5"', 'note: ok'].join('\n');

  it('reports visible typography faults in string values with their line numbers', () => {
    expect(lintYaml(source)).toEqual([{ line: 4, actual: "Об'єкт", expected: 'Об’єкт' }]);
  });

  it('reports missing non-breaking spaces only in strict mode', () => {
    const strict = lintYaml(source, { nbsp: true });
    expect(strict.map((f) => f.line)).toEqual([4, 5]);
    expect(strict[1]?.expected).toBe('Норма № 5');
  });

  it('ignores keys, syntax quotes and urls', () => {
    const yaml = ['url: "https://zakon.rada.gov.ua/laws/show/2465-20"', 'title: «Уже добре»', 'list:', '  - "просто рядок"'].join('\n');
    expect(lintYaml(yaml)).toEqual([]);
  });

  it('does not flag ISO dates, kebab-case ids, outcome codes, act codes or hyphenated keys', () => {
    const yaml = [
      'checked-at: 2026-09-15',
      'checkedAt: 2026-09-01',
      'id: law-2465-ix',
      'learningOutcomes:',
      '  - prn03',
      'act: Закон № 2465-IX (z1307-23, 448/96-ВР), п. 2-1',
      'isbn: 978-617-7360-05-2',
      'title: S. Prt. 107-70; Pub. L. 107-204; No. 12-45',
      'range: 2020-2026 рр.',
    ].join('\n');
    expect(lintYaml(yaml)).toEqual([{ line: 9, actual: '2020-2026 рр.', expected: '2020–2026 рр.' }]);
  });
});

describe('lintYaml: назви джерел', () => {
  it('does not flag spaced hyphens in title and source fields (official wording), but flags them in other fields', () => {
    const yaml = [
      'sources:',
      '  - id: iso-9001-2015',
      '    title: ISO 9001:2015 Quality management systems - Requirements',
      '    note: коментар - пояснення',
      'refs:',
      '  - source: Старченко Г.В. та ін. - Операційний менеджмент',
      '    locator: розділ 3',
    ].join('\n');
    expect(lintYaml(yaml)).toEqual([{ line: 4, actual: 'коментар - пояснення', expected: 'коментар — пояснення' }]);
  });
});

describe('lintMdx', () => {
  const source = [
    '---',
    'id: t01',
    "description: Об'єкт у статуті",
    'updatedAt: 2026-09-15',
    '---',
    'import { x } from "./x"',
    '',
    '## Заголовок з "лапками"',
    '',
    'Текст із `кодом "x"` і "лапками".',
    '',
    '```',
    'a - "b"',
    '```',
    '',
    '<Formula label="Кворум - S">S·k / (N + 1) + 1</Formula>',
    '',
    '<Term id="corp">корпорації</Term> в 2023 р.',
  ].join('\n');

  it('checks frontmatter strings, prose lines and jsx attribute values, skipping code, esm and tag syntax', () => {
    const findings = lintMdx(source);
    expect(findings.map((f) => f.line)).toEqual([3, 8, 10, 16]);
    expect(findings[0]).toMatchObject({ actual: "Об'єкт у статуті", expected: 'Об’єкт у статуті' });
    expect(findings[1]?.expected).toBe('## Заголовок з «лапками»');
    expect(findings[2]?.expected).toContain('«лапками»');
    expect(findings[3]?.expected).toContain('Кворум — S');
  });

  it('reports missing non-breaking spaces only in strict mode', () => {
    expect(lintMdx(source).some((f) => f.line === 18)).toBe(false);
    const strict = lintMdx(source, { nbsp: true });
    expect(strict.find((f) => f.line === 18)?.expected).toContain('в 2023 р.');
  });

  it('masks removed regions without shifting line numbers', () => {
    const prose = proseOfMdx(source);
    expect(prose.split('\n')).toHaveLength(source.split('\n').length);
    expect(prose).not.toContain('import');
    expect(prose).not.toContain('Formula');
    // Значення атрибутів перевіряються окремо від прози (знахідка рядка 16 — у першому тесті).
    expect(prose).not.toContain('Кворум');
  });

  it('does not flag a real single space before an em dash right after a closing JSX tag', () => {
    // Регресія: тег раніше маскувався пробілами, які зливалися із сусіднім реальним пробілом перед тире
    // («…</Term> — …»), і лінт бачив хибне «зайве» тире там, де в джерелі був рівно один пробіл.
    const termSource = '<Term id="operations-system">Операційна система</Term> — повна система.';
    expect(lintMdx(termSource)).toEqual([]);
  });

  it('still flags real faults right next to a JSX tag', () => {
    const doubleSpace = lintMdx('<Term id="a">Система</Term>  — подвійний пробіл.');
    expect(doubleSpace).toHaveLength(1);
    const range = lintMdx('У <strong>2020-2026</strong> роках і <Term id="a">2020-2026</Term>.');
    expect(range[0]?.expected).toBe('У 2020–2026 роках і 2020–2026.');
    const quotes = lintMdx('Слово "<Term id="a">Система</Term>" у лапках.');
    expect(quotes[0]?.expected).toBe('Слово «Система» у лапках.');
  });

  it('checks attribute values on their own line numbers', () => {
    const findings = lintMdx(['Текст.', '<Callout title="Назва - з дефісом">Тіло</Callout>'].join('\n'));
    expect(findings).toEqual([{ line: 2, actual: 'Назва - з дефісом', expected: 'Назва — з дефісом' }]);
  });

  it('does not flag a term definition dash as an extra space run (masked </Term> is not a real space)', () => {
    // Регресія: closing-тег безпосередньо перед " — " раніше маскувався пробілами, тож
    // «пробіл(и) стертого тега» + реальний пробіл перед тире зливались і хибно спрацьовувало
    // правило згортання пробілів навколо тире (SPACED_DASH у src/lib/typography/normalize.ts).
    const termSource = '<Term id="x">Термін</Term> — це визначення.';
    expect(lintMdx(termSource)).toEqual([]);
  });
});

describe('formatFindings', () => {
  it('renders a Ukrainian report and makes non-breaking spaces visible', () => {
    const [line] = formatFindings('content/x.yaml', [{ line: 2, actual: 'ст. 3', expected: 'ст. 3' }]);
    expect(line).toContain('content/x.yaml:2');
    expect(line).toContain('є:     ст. 3');
    expect(line).toContain('треба: ст.⍽3');
  });
});
