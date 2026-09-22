import { describe, expect, it } from 'vitest';
import { file } from '../__fixtures__/baseline.mjs';
import { checkRefConsistency } from './ref-consistency.mjs';

describe('checkRefConsistency', () => {
  it('reports a code mentioned in the body but missing from frontmatter refs', () => {
    const lecture = file('content/modules/m1/t01/lecture.mdx', [
      '---',
      'id: t01',
      'refs: []',
      '---',
      'Формула EOQ наведена нижче (EOQ-01).',
    ]);
    const findings = checkRefConsistency([lecture]);
    expect(findings).toMatchObject([{ rule: 'ref-consistency', level: 'error' }]);
    expect(findings[0].message).toContain('відсутні у refs: EOQ-01');
  });

  it('reports a code in frontmatter refs that the body and slides never mention', () => {
    const lecture = file('content/modules/m1/t01/lecture.mdx', [
      '---',
      'id: t01',
      'refs:',
      '  - source: Старченко Г.В. та ін., 2020',
      '    locator: розділ «Запаси» (EOQ-01)',
      "    checkedAt: '2026-09-15'",
      '---',
      'Звичайний абзац без коду.',
    ]);
    const findings = checkRefConsistency([lecture]);
    expect(findings).toMatchObject([{ rule: 'ref-consistency', level: 'error' }]);
    expect(findings[0].message).toContain('не згадані в тексті/слайдах: EOQ-01');
  });

  it('accepts a matching code in the body, in slides and in frontmatter', () => {
    const lecture = file('content/modules/m1/t01/lecture.mdx', [
      '---',
      'id: t01',
      'refs:',
      '  - source: Старченко Г.В. та ін., 2020',
      '    locator: розділ «Запаси» (EOQ-01)',
      "    checkedAt: '2026-09-15'",
      '---',
      'Формула EOQ наведена нижче (EOQ-01).',
    ]);
    expect(checkRefConsistency([lecture])).toEqual([]);
  });

  it('collects codes from slides.yaml of the same topic', () => {
    const lecture = file('content/modules/m1/t01/lecture.mdx', [
      '---',
      'id: t01',
      'refs:',
      '  - source: Старченко Г.В. та ін., 2020',
      '    locator: розділ «Запаси» (EOQ-01)',
      "    checkedAt: '2026-09-15'",
      '---',
      'Немає коду в тексті.',
    ]);
    const slides = file('content/modules/m1/t01/slides.yaml', ['topic: t01', 'slides:', '  - id: s1', '    text: Формула (EOQ-01)']);
    expect(checkRefConsistency([lecture, slides])).toEqual([]);
  });

  it('ignores files outside a topic folder', () => {
    expect(checkRefConsistency([file('content/course.yaml', ['a: b'])])).toEqual([]);
  });
});
