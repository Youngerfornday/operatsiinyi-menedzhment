/**
 * Правило 2. Коди довідника.
 * Кожен код (EOQ-01, ISO-9001-11) з refs і з приміток «formula-baseline …» / «standards-baseline …» має
 * існувати в одній із баз, а джерело (`source`), записане поруч, — збігатися з тим, що ця база фіксує
 * для коду. Коди в атрибуті `code` тегів <Formula> і <WorkedExample> перевіряються лише на існування:
 * ці теги не несуть власного `source`.
 */
import { refineLine } from '../content.mjs';
import { ERROR, makeFinding } from '../finding.mjs';
import { baselineMentionsIn, codeAttrRefsOf, codesIn, refsOf } from '../refs.mjs';
import { normalizeText, quote } from '../text.mjs';

export const RULE = 'ref-code';
const UNKNOWN_HINT = 'Звіртеся з docs/research/formula-baseline.md або docs/research/standards-baseline.md: код пишеться як у базі (EOQ-01, ISO-9001-11). Якщо коду в базі немає — спершу доповніть базу першоджерелом.';
const SOURCE_HINT = 'Приведіть source у відповідність до бази: назва джерела має дослівно збігатися з тим, що записано в колонці «Джерело» для цього коду.';

function knownPrefixes(baseline) {
  return new Set([...baseline.codes.keys()].map((code) => code.slice(0, code.lastIndexOf('-'))));
}

/**
 * Один ref може вказувати кілька кодів одразу («п. 8.5.1, форм. EOQ (ISO-9001-11, EOQ-01)»),
 * тому джерело звіряється з кожним кодом, який ref називає.
 */
function sourceIssues(file, ref, baseline) {
  if (ref.source === '') return [];
  const entries = ref.codes.map((code) => baseline.codes.get(code)).filter((entry) => entry !== undefined);
  const mismatched = entries.filter((entry) => normalizeText(entry.source) !== normalizeText(ref.source));
  if (mismatched.length === 0) return [];
  const described = mismatched.map((entry) => `${entry.code} — «${entry.source}»`).join('; ');
  return [makeFinding({
    file: file.file, line: ref.line, rule: RULE, level: ERROR,
    message: `Джерело «${ref.source}» не збігається з базою (${described})`,
    hint: SOURCE_HINT,
    quote: quote(ref.source),
  })];
}

/**
 * @param {import('../content.mjs').ContentFile[]} files
 * @param {ReturnType<import('../baseline.mjs').parseBaseline>} baseline
 * @returns {import('../finding.mjs').Finding[]}
 */
export function checkRefCodes(files, baseline) {
  const prefixes = knownPrefixes(baseline);
  return files.flatMap((file) => {
    const refs = refsOf(file);
    const fromRefs = refs.flatMap((ref) => [
      ...ref.codes
        .filter((code) => !baseline.codes.has(code))
        .map((code) => makeFinding({
          file: file.file, line: ref.locatorLine, rule: RULE, level: ERROR,
          message: `Код «${code}» не знайдено в базі (formula-baseline.md / standards-baseline.md)`,
          hint: UNKNOWN_HINT,
          quote: quote(ref.locator),
        })),
      ...sourceIssues(file, ref, baseline),
    ]);

    const attrs = codeAttrRefsOf(file);
    const fromAttrs = attrs
      .filter((ref) => !baseline.codes.has(ref.code))
      .map((ref) => makeFinding({
        file: file.file, line: ref.line, rule: RULE, level: ERROR,
        message: `Код «${ref.code}» у <${ref.component}> не знайдено в базі (formula-baseline.md / standards-baseline.md)`,
        hint: UNKNOWN_HINT,
      }));

    // Рядки самих refs і відкривальні теги Formula/WorkedExample вже перевірено вище —
    // у прозі шукаються згадки поза ними.
    const inRef = (line) => refs.some((ref) => line >= ref.line && line <= ref.endLine) || attrs.some((ref) => ref.line === line);
    const fromProse = file.units.filter((unit) => !inRef(unit.line)).flatMap((unit) => {
      const mentioned = new Set([
        ...baselineMentionsIn(unit.text),
        ...codesIn(unit.text).filter((code) => prefixes.has(code.slice(0, code.lastIndexOf('-')))),
      ]);
      return [...mentioned]
        .filter((code) => !baseline.codes.has(code))
        .map((code) => makeFinding({
          file: file.file, line: refineLine(file, unit, code), rule: RULE, level: ERROR,
          message: `Код «${code}» не знайдено в базі (formula-baseline.md / standards-baseline.md)`,
          hint: UNKNOWN_HINT,
          quote: quote(unit.text),
        }));
    });
    return [...fromRefs, ...fromAttrs, ...fromProse];
  });
}
