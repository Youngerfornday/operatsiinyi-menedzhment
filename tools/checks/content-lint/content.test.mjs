import { describe, expect, it } from 'vitest';
import { contentFile, mdxBlocks, refineLine } from './content.mjs';

const YAML = [
  'topic: t01',
  'questions:',
  '  - id: q1',
  '    stem: >-',
  '      Довге питання про запаси,',
  '      у якому згадано формулу EOQ-01.',
  '    refs:',
  '      - source: Старченко Г.В. та ін., 2020',
  '        locator: розділ «Запаси», формула EOQ (EOQ-01)',
  '        checkedAt: 2026-09-15',
  '',
].join('\n');

describe('contentFile (yaml)', () => {
  const file = contentFile('content/banks/training/m1.yaml', YAML);

  it('collects string values with their keys, paths and lines', () => {
    const stem = file.units.find((unit) => unit.key === 'stem');
    expect(stem.line).toBe(4);
    expect(stem.path).toEqual(['questions', 'stem']);
    expect(stem.text).toContain('EOQ-01');
    expect(file.units.some((unit) => unit.text === 'topic')).toBe(false);
  });

  it('gives every value the record it belongs to — the item of the top-level sequence', () => {
    const locator = file.units.find((unit) => unit.key === 'locator');
    expect(locator.container).toContain('source: Старченко Г.В. та ін., 2020');
    expect(locator.container).not.toContain('stem:');
    expect(locator.record).toContain('stem:');
  });

  it('exposes maps so that refs blocks can be found by their keys', () => {
    const ref = file.maps.find((node) => 'locator' in node.keys && 'checkedAt' in node.keys);
    expect(ref.line).toBe(8);
    expect(ref.keys.checkedAt).toBe('2026-09-15');
  });

  it('refines the line of a mention inside a folded scalar', () => {
    const stem = file.units.find((unit) => unit.key === 'stem');
    expect(refineLine(file, stem, 'EOQ-01')).toBe(6);
    expect(refineLine(file, stem, 'немає такого тексту')).toBe(stem.line);
  });
});

const MDX = [
  '---',
  'id: t01',
  'updatedAt: 2026-09-16',
  '---',
  'import Fig from "./fig.svg";',
  '',
  'Перший абзац із <Term id="corporation">корпорацією</Term>.',
  '',
  '<CaseStudy title="ПриватБанк">',
  '  <p>Другий абзац.</p>',
  '</CaseStudy>',
  '',
].join('\n');

describe('contentFile (mdx)', () => {
  const file = contentFile('content/modules/m1/t01/lecture.mdx', MDX);

  it('parses frontmatter with real line numbers and keeps the body line by line', () => {
    expect(file.data.id).toBe('t01');
    expect(file.units.find((unit) => unit.key === 'updatedAt').line).toBe(3);
    expect(file.units.find((unit) => unit.text.startsWith('Перший абзац')).line).toBe(7);
  });

  it('uses the paragraph as the record of a body line', () => {
    const line = file.units.find((unit) => unit.text.includes('Другий абзац'));
    expect(line.line).toBe(10);
    expect(line.record).toContain('<CaseStudy');
  });
});

describe('mdxBlocks', () => {
  it('splits text into blocks of adjacent non-empty lines', () => {
    expect(mdxBlocks('a\nb\n\nc')).toEqual([
      { line: 1, endLine: 2, text: 'a\nb' },
      { line: 4, endLine: 4, text: 'c' },
    ]);
  });
});
