/** Витяг посилань на код бази з моделі контенту: refs-мапи, коди рядків, дати перевірки. */
import { CODE_TOKEN } from './baseline.mjs';
import { normalizeText } from './text.mjs';

const BASELINE_MENTION = /(?:formula|standards)-baseline[\s,]+([A-Z][A-Z0-9-]*-\d{2})/g;

/** @typedef {{ line: number, endLine: number, locatorLine: number, dateLine: number, source: string, locator: string, checkedAt: string|null, url: string|null, codes: string[] }} ContentRef */

/** Рядок поля всередині запису: посилатися на `locator:` точніше, ніж на початок блоку. */
function fieldLine(file, node, field) {
  for (let line = node.line; line <= Math.min(node.endLine, file.lines.length); line += 1) {
    if (new RegExp(`(^|[\\s{,])${field}:`).test(file.lines[line - 1] ?? '')) return line;
  }
  return node.line;
}

/** Тег <StandardRef …> у тілі лекції — те саме посилання на код, що й refs у frontmatter. Значення атрибутів можуть містити «>». */
const STANDARD_REF_TAG = /<StandardRef\b(?:[^>"]|"[^"]*")*>/g;
/** Атрибут `code` тегів <Formula> і <WorkedExample>: посилання на код без source/locator. */
const CODE_ATTR_TAG = /<(Formula|WorkedExample)\b(?:[^>"]|"[^"]*")*>/g;

function attribute(tag, name) {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1] ?? null;
}

function standardRefTags(file) {
  if (file.kind !== 'mdx') return [];
  return [...file.text.matchAll(STANDARD_REF_TAG)].flatMap((match) => {
    const locator = attribute(match[0], 'locator');
    const checkedAt = attribute(match[0], 'checkedAt');
    if (locator === null || checkedAt === null) return [];
    const line = file.text.slice(0, match.index).split('\n').length;
    return [{
      line,
      endLine: line + (match[0].match(/\n/g) ?? []).length,
      locatorLine: line,
      dateLine: line,
      source: attribute(match[0], 'source') ?? '',
      locator: normalizeText(locator),
      checkedAt,
      url: attribute(match[0], 'url'),
      codes: codesIn(locator),
    }];
  });
}

/**
 * Посилання на код бази: мапи з locator і checkedAt (формат baseline-документів) і теги <StandardRef>
 * з тими самими атрибутами.
 */
export function refsOf(file) {
  const fromMaps = file.maps
    .filter((node) => typeof node.keys.locator === 'string' && typeof node.keys.checkedAt === 'string')
    .map((node) => ({
      line: node.line,
      endLine: node.endLine,
      locatorLine: fieldLine(file, node, 'locator'),
      dateLine: fieldLine(file, node, 'checkedAt'),
      source: String(node.keys.source ?? ''),
      locator: normalizeText(String(node.keys.locator)),
      checkedAt: String(node.keys.checkedAt),
      url: node.keys.url ? String(node.keys.url) : null,
      codes: codesIn(String(node.keys.locator)),
    }));
  return [...fromMaps, ...standardRefTags(file)];
}

/** Коди в тегах <Formula code="…"> і <WorkedExample code="…"> — без окремого source/locator. */
export function codeAttrRefsOf(file) {
  if (file.kind !== 'mdx') return [];
  return [...file.text.matchAll(CODE_ATTR_TAG)].flatMap((match) => {
    const code = attribute(match[0], 'code');
    if (code === null) return [];
    const line = file.text.slice(0, match.index).split('\n').length;
    return [{ line, component: match[1], code }];
  });
}

/** Коди в довільному тексті: «п. 8.5.1 (ISO-9001-11)» → ['ISO-9001-11']. */
export function codesIn(text) {
  return [...new Set([...normalizeText(text).matchAll(CODE_TOKEN)].map(([, code]) => code))];
}

/** Згадки «formula-baseline EOQ-01» / «standards-baseline ISO-9001-11» у прозі лекцій і практичних. */
export function baselineMentionsIn(text) {
  return [...normalizeText(text).matchAll(BASELINE_MENTION)].map(([, code]) => code);
}

/** Дати перевірки джерел: sources.yaml і список sources практичної (не refs). */
export function sourceCheckedDates(file) {
  return file.maps
    .filter((node) => typeof node.keys.checkedAt === 'string' && typeof node.keys.url === 'string' && typeof node.keys.locator !== 'string')
    .map((node) => ({ line: node.line, checkedAt: String(node.keys.checkedAt), id: node.keys.id ? String(node.keys.id) : '', title: String(node.keys.title ?? '') }));
}
