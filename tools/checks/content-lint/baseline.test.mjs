import { describe, expect, it } from 'vitest';
import { expectedDates, parseBaseline } from './baseline.mjs';

const FORMULA_MARKDOWN = [
  '# Formula baseline (фікстура)',
  '',
  'Дата перевірки: **2026-09-14**.',
  '',
  '## Правила використання',
  '',
  '1. Беруть формули лише з цього документа.',
  '',
  '## 1. Управління запасами',
  '',
  '| Норма | Локатор | Джерело | Перевірено |',
  '|---|---|---|---|',
  '| [EOQ-01] Економічний розмір замовлення | розділ «Запаси», формула EOQ | Старченко та ін., 2020 | 2026-09-15 |',
  '| [EOQ-04] Страховий запас | розділ «Запаси», страховий запас | Капінос, Бабій, 2013 |  |',
  '',
  '## 12. Розділ без дати рядка',
  '',
  'Перевірено 2026-09-16.',
  '',
  '| Норма | Локатор | Джерело | Перевірено |',
  '|---|---|---|---|',
  '| [PC-01] Послідовний рух партії | розділ «Цикл» | Гевко, 2017 |  |',
  '',
  '## Не підтверджено / потребує звірки викладачем',
  '',
  '1. **Точні порогові частки ABC-аналізу.** Схема підтверджена, порогові відсотки — ні.',
  '2. **Значення констант A2, D3, D4.** У джерелах курсу не звірено.',
  '',
  '## Джерела',
  '',
  '- Старченко Г.В. та ін. Операційний менеджмент, 2020.',
].join('\n');

const STANDARDS_MARKDOWN = [
  '# Standards baseline (фікстура)',
  '',
  'Дата перевірки: **2026-09-20**.',
  '',
  '## 1. ISO 9001:2015',
  '',
  '| Норма | Локатор | Джерело | Перевірено |',
  '|---|---|---|---|',
  '| [ISO-9001-11] Контроль виробництва | п. 8.5.1 | ISO 9001:2015 / ДСТУ ISO 9001:2015 | 2026-09-20 |',
  '',
  '## Не підтверджено / потребує звірки викладачем',
  '',
  '1. **Повний каталог KPI ISO 22400-2.** Не звірено.',
].join('\n');

const docs = () => [
  { name: 'formula-baseline.md', text: FORMULA_MARKDOWN },
  { name: 'standards-baseline.md', text: STANDARDS_MARKDOWN },
];

describe('parseBaseline', () => {
  it('reads code rows with name, locator, source and per-row checked date', () => {
    const baseline = parseBaseline(docs());
    const entry = baseline.codes.get('EOQ-01');
    expect(entry).toMatchObject({
      code: 'EOQ-01',
      name: 'Економічний розмір замовлення',
      locator: 'розділ «Запаси», формула EOQ',
      source: 'Старченко та ін., 2020',
      docName: 'formula-baseline.md',
    });
    expect(entry.dates).toEqual(new Set(['2026-09-15']));
  });

  it('falls back to the section checked date, then to the document base date', () => {
    const baseline = parseBaseline(docs());
    expect(baseline.codes.get('PC-01').dates).toEqual(new Set(['2026-09-16']));
    expect(baseline.codes.get('EOQ-04').dates).toEqual(new Set(['2026-09-14']));
  });

  it('merges codes and unconfirmed items from both documents, keeping their origin', () => {
    const baseline = parseBaseline(docs());
    expect(baseline.codes.has('ISO-9001-11')).toBe(true);
    expect(baseline.codes.get('ISO-9001-11').docName).toBe('standards-baseline.md');
    expect(baseline.unconfirmed).toHaveLength(3);
    expect(baseline.unconfirmed.map((item) => item.docName)).toEqual([
      'formula-baseline.md',
      'formula-baseline.md',
      'standards-baseline.md',
    ]);
    expect(baseline.unconfirmed[0].stems.length).toBeGreaterThan(0);
  });

  it('exposes expectedDates and an empty set for an unknown code', () => {
    const baseline = parseBaseline(docs());
    expect(expectedDates(baseline, 'EOQ-01')).toEqual(new Set(['2026-09-15']));
    expect(expectedDates(baseline, 'GHOST-01')).toEqual(new Set());
  });

  it('returns an empty baseline for an empty document list', () => {
    const baseline = parseBaseline([]);
    expect(baseline.codes.size).toBe(0);
    expect(baseline.unconfirmed).toEqual([]);
  });
});
