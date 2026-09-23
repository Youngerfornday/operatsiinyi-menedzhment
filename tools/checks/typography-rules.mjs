/**
 * Чисті функції лінту типографіки: знаходять у YAML і MDX рядки, які змінила б normalizeTypography.
 * Ядро правил — src/lib/typography/normalize.ts (Node ≥ 22.18 стирає типи без збірки).
 *
 * Типово перевіряються видимі знаки (апостроф, лапки, тире, три крапки): їх автор має писати правильно в джерелі,
 * бо джерело йде й в експортери. Нерозривні пробіли ставить рендер (hast-плагін для MDX, typo() у шаблонах),
 * тому в джерелі вони перевіряються лише в суворому режимі `{ nbsp: true }` (прапорець --nbsp).
 */
import { LineCounter, isScalar, parseDocument, visit } from 'yaml';
import { normalizeTypography } from '../../src/lib/typography/normalize.ts';

/** @typedef {{ line: number, actual: string, expected: string }} Finding */

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const FENCE = /^(\s*)(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n\1\2[ \t]*$/gm;
const INLINE_CODE = /`[^`\n]+`/g;
const JSX_TAG = /<\/?[A-Za-z][\w.:-]*(?:\s[^<>]*?)?\/?>/g;
const JSX_ATTRIBUTE_VALUE = /="([^"\n]*)"/g;
const ESM_LINE = /^(?:import|export)\b[^\n]*$/gm;
const EXPRESSION = /\{[^{}\n]*\}/g;

/** @typedef {{ nbsp?: boolean }} LintOptions */

/** Поля з офіційними назвами джерел (sources.yaml title, refs source): дефіс у пробілах там — частина назви. */
const OFFICIAL_TITLE_KEYS = new Set(['title', 'source']);

function blankKeepingLines(text) {
  return text.replace(/[^\n]/g, ' ');
}

/** Код і вирази замінюються не пробілами, а крапкою: інакше сусідні пробіли зливаються й лінт бачить хибне «зайве» тире. */
function maskKeepingLines(text) {
  return text.replace(/[^\n]/g, '·');
}

/**
 * JSX-тег вирізається з прози повністю (крім переносів рядків), без жодної заміни: будь-яка заміна
 * лишає слід біля сусіднього тексту. Пробіли зливалися з реальним пробілом («…</Term> — …» давало хибне
 * «зайве» тире), а непробільний символ ховав справжні знахідки поруч із тегом (діапазон
 * «<strong>2020-2026</strong>» переставав бути діапазоном). Рядкові значення атрибутів (title="…")
 * перевіряються окремо — див. attributeFindings.
 */
function stripTagKeepingLines(tag) {
  return tag.replace(/[^\n]/g, '');
}

/** Порівнює рядок з нормалізованим; повертає знахідку або null. */
function compareLine(line, index, options) {
  const trimmed = line.trim();
  if (trimmed === '') return null;
  const expected = normalizeTypography(line, { nbsp: options.nbsp === true });
  return expected === line ? null : { line: index + 1, actual: trimmed, expected: expected.trim() };
}

/** MDX без frontmatter, коду й ESM-рядків; довжина й номери рядків збігаються з файлом. */
function maskNonProse(source) {
  return source
    .replace(FRONTMATTER, blankKeepingLines)
    .replace(FENCE, blankKeepingLines)
    .replace(INLINE_CODE, maskKeepingLines)
    .replace(ESM_LINE, blankKeepingLines);
}

/**
 * Прозова частина MDX без frontmatter, коду, ESM-рядків, JSX-тегів і виразів у фігурних дужках.
 * Номери рядків збігаються з файлом (переноси рядків зберігаються).
 * @param {string} source
 */
export function proseOfMdx(source) {
  return maskNonProse(source).replace(JSX_TAG, stripTagKeepingLines).replace(EXPRESSION, maskKeepingLines);
}

/** Рядкові значення атрибутів JSX-тегів (title="…", caption="…") — кожне як окремий текст зі своїм рядком. */
function attributeFindings(source, options) {
  const masked = maskNonProse(source);
  /** @type {Finding[]} */
  const findings = [];
  for (const tag of masked.matchAll(JSX_TAG)) {
    for (const attribute of tag[0].matchAll(JSX_ATTRIBUTE_VALUE)) {
      const line = masked.slice(0, tag.index + attribute.index).split('\n').length - 1;
      const finding = compareLine(attribute[1], line, options);
      if (finding) findings.push(finding);
    }
  }
  return findings;
}

/**
 * @param {string} source
 * @param {LintOptions} [options]
 * @returns {Finding[]}
 */
export function lintMdx(source, options = {}) {
  const bodyFindings = proseOfMdx(source)
    .split('\n')
    .map((line, index) => compareLine(line, index, options))
    .filter((finding) => finding !== null);
  const tagFindings = attributeFindings(source, options);
  const frontmatter = FRONTMATTER.exec(source);
  const yamlFindings = frontmatter ? lintYaml(frontmatter[1], options).map((f) => ({ ...f, line: f.line + 1 })) : [];
  return [...yamlFindings, ...bodyFindings, ...tagFindings].sort((a, b) => a.line - b.line);
}

/**
 * Перевіряє лише рядкові значення YAML (ключі та синтаксичні лапки — не типографіка).
 * @param {string} source
 * @param {LintOptions} [options]
 * @returns {Finding[]}
 */
export function lintYaml(source, options = {}) {
  const lineCounter = new LineCounter();
  const doc = parseDocument(source, { lineCounter, keepSourceTokens: true });
  /** @type {Finding[]} */
  const findings = [];
  const check = (node, key) => {
    if (!isScalar(node) || typeof node.value !== 'string' || !node.range) return;
    const expected = normalizeTypography(node.value, { nbsp: options.nbsp === true, keepSpacedHyphens: OFFICIAL_TITLE_KEYS.has(key) });
    if (expected === node.value) return;
    findings.push({ line: lineCounter.linePos(node.range[0]).line, ...firstDiffLine(node.value, expected) });
  };
  visit(doc, {
    Pair: (_key, pair) => check(pair.value, isScalar(pair.key) ? String(pair.key.value) : undefined),
    Seq: (_key, seq) => seq.items.forEach((item) => check(item, undefined)),
  });
  return findings.sort((a, b) => a.line - b.line);
}

/** Для багаторядкових значень показує перший рядок, що відрізняється. */
function firstDiffLine(actual, expected) {
  const actualLines = actual.split('\n');
  const expectedLines = expected.split('\n');
  const index = actualLines.findIndex((line, i) => line !== expectedLines[i]);
  const at = index === -1 ? 0 : index;
  return { actual: (actualLines[at] ?? '').trim(), expected: (expectedLines[at] ?? '').trim() };
}

/** Показує невидимі відмінності (нерозривний пробіл) явно. */
export function showInvisible(text) {
  return text.replace(/ /g, '⍽');
}

/**
 * @param {string} file
 * @param {Finding[]} findings
 */
export function formatFindings(file, findings) {
  return findings.map(
    (f) => `  ${file}:${f.line}\n    є:     ${showInvisible(f.actual)}\n    треба: ${showInvisible(f.expected)}`,
  );
}
