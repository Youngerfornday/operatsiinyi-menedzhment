/**
 * Розбір docs/research/formula-baseline.md і docs/research/standards-baseline.md —
 * єдиних джерел кодів для курсу «Операційний менеджмент».
 * Витягує: коди рядків з назвою, локатором, джерелом і датою перевірки; розділ «Не підтверджено».
 * Формат документів описано в їхньому розділі «Правила використання»; парсер тримається саме цих домовленостей.
 * Обидва документи мають однаковий рядок коду: `| [КОД] Назва | Локатор | Джерело | Перевірено |`.
 */
import { normalizeText, signatureStems } from './text.mjs';

const BASE_DATE = /Дата перевірки:\s*\*\*(\d{4}-\d{2}-\d{2})\*\*/;
const SECTION = /^##\s+(.+?)\s*$/;
const SECTION_CHECKED = /^Перевірено\s+(\d{4}-\d{2}-\d{2})/i;
/** Рядок бази: `| [EOQ-01] Назва | Локатор | Джерело | Перевірено |`. */
const CODE_ROW = /^\|\s*\[([A-Z][A-Z0-9-]*-\d{2})\]\s*([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|/;
const UNCONFIRMED_ITEM = /^(\d+)\.\s+\*\*(.+?)\*\*(.*)$/;
const UNCONFIRMED_HEADING = 'Не підтверджено';
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Код бази: EOQ-01, ISO-9001-04, ISO-22400-01, DSTU-01. */
export const CODE_TOKEN = /\b([A-Z][A-Z0-9-]*-\d{2})\b/g;
/** Адреси прибираються перед пошуком кодів: у них трапляються схожі на код шматки. */
export const URL_IN_TEXT = /https?:\/\/\S+/g;

/** @typedef {{ code: string, line: number, name: string, locator: string, source: string, dates: Set<string>, section: string, row: string, docName: string }} CodeEntry */
/** @typedef {{ number: number, line: number, title: string, text: string, stems: string[], docName: string }} UnconfirmedItem */
/** @typedef {{ codes: Map<string, CodeEntry>, unconfirmed: UnconfirmedItem[] }} Baseline */

function addCode(codes, code, patch) {
  const current = codes.get(code) ?? {
    code, line: 0, name: '', locator: '', source: '', dates: new Set(), section: '', row: '', docName: patch.docName,
  };
  codes.set(code, {
    ...current,
    ...Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined && !(value instanceof Set))),
    dates: new Set([...current.dates, ...(patch.dates ?? [])]),
  });
}

/**
 * Розбирає один документ бази.
 * @param {string} text
 * @param {string} docName ім'я файла для повідомлень («formula-baseline.md»)
 */
function parseOne(text, docName) {
  const lines = text.split(/\r?\n/);
  const baseDate = BASE_DATE.exec(text)?.[1] ?? '';
  const codes = new Map();
  const unconfirmed = [];
  const sectionDates = new Map();
  let section = '';
  let inUnconfirmed = false;

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const heading = SECTION.exec(line);
    if (heading) {
      section = heading[1];
      inUnconfirmed = section.startsWith(UNCONFIRMED_HEADING);
    }
    const sectionChecked = SECTION_CHECKED.exec(line.trim());
    if (sectionChecked) sectionDates.set(section, sectionChecked[1]);

    const codeRow = CODE_ROW.exec(line);
    if (codeRow) {
      const [, code, name, locator, source, checkedAt] = codeRow;
      const trimmedDate = checkedAt.trim();
      addCode(codes, code, {
        line: lineNumber,
        name: name.trim(),
        locator: locator.trim(),
        source: source.trim(),
        section,
        row: line,
        dates: DATE.test(trimmedDate) ? [trimmedDate] : [],
        docName,
      });
    }

    if (inUnconfirmed) {
      const item = UNCONFIRMED_ITEM.exec(line.trim());
      if (item) {
        const [, number, title, rest] = item;
        unconfirmed.push({
          number: Number(number),
          line: lineNumber,
          title: title.replace(/[.,;:]\s*$/, ''),
          text: normalizeText(`${title} ${rest}`),
          stems: signatureStems(title),
          docName,
        });
      }
    }
  });

  for (const [code, entry] of codes) {
    if (entry.dates.size === 0) {
      const sectionDate = sectionDates.get(entry.section);
      codes.set(code, { ...entry, dates: new Set([sectionDate ?? baseDate]) });
    }
  }
  return { codes, unconfirmed };
}

/**
 * @param {Array<{ name: string, text: string }>} docs formula-baseline.md і standards-baseline.md
 * @returns {Baseline}
 */
export function parseBaseline(docs) {
  const codes = new Map();
  const unconfirmed = [];
  for (const { name, text } of docs) {
    const parsed = parseOne(text, name);
    for (const [code, entry] of parsed.codes) codes.set(code, entry);
    unconfirmed.push(...parsed.unconfirmed);
  }
  return { codes, unconfirmed };
}

/** Дати, дозволені для коду: колонка «Перевірено» його рядка, інакше дата розділу, інакше базова дата документа. */
export function expectedDates(baseline, code) {
  return baseline.codes.get(code)?.dates ?? new Set();
}
