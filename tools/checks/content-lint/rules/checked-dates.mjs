/**
 * Правило 4. Дати перевірки.
 * `checkedAt` у refs і в списках джерел не може бути в майбутньому, а для кодів бази — має збігатися
 * з датою, яку фіксує сам документ (formula-baseline.md чи standards-baseline.md): колонка «Перевірено»
 * рядка коду, інакше дата розділу, інакше базова дата документа.
 */
import { expectedDates } from '../baseline.mjs';
import { ERROR, makeFinding } from '../finding.mjs';
import { refsOf, sourceCheckedDates } from '../refs.mjs';

export const RULE = 'checked-date';
const FUTURE_HINT = 'Поставте дату, коли формулу, стандарт або джерело справді відкривали; майбутня дата означає неперевірене джерело.';
const MISMATCH_HINT = 'Візьміть дату з бази (колонка «Перевірено» рядка коду, інакше дата розділу, інакше базова дата документа) — або звірте код заново і оновіть саму базу.';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Межа «не в майбутньому» — завтрашній день за UTC. Автор пише дату за своїм місцевим часом,
 * і ввечері за UTC ще вчора: без цього запасу дата, поставлена сьогодні, читалася б як майбутня.
 * Той самий запас закладено в CheckedAtSchema (src/content/schemas/primitives.ts).
 */
export function todayIso(now = new Date()) {
  return new Date(now.getTime() + DAY_MS).toISOString().slice(0, 10);
}

function futureIssue(file, line, date, today, what) {
  if (date <= today) return [];
  return [makeFinding({
    file: file.file, line, rule: RULE, level: ERROR,
    message: `${what}: дата перевірки ${date} у майбутньому (сьогодні ${today})`,
    hint: FUTURE_HINT,
  })];
}

/**
 * @param {import('../content.mjs').ContentFile[]} files
 * @param {ReturnType<import('../baseline.mjs').parseBaseline>} baseline
 * @param {string} today ISO-дата
 * @returns {import('../finding.mjs').Finding[]}
 */
export function checkCheckedDates(files, baseline, today = todayIso()) {
  return files.flatMap((file) => {
    const refs = refsOf(file).flatMap((ref) => [
      ...futureIssue(file, ref.dateLine, ref.checkedAt, today, 'Посилання на код'),
      ...ref.codes.flatMap((code) => {
        const entry = baseline.codes.get(code);
        if (!entry) return [];
        const allowed = expectedDates(baseline, code);
        if (allowed.has(ref.checkedAt)) return [];
        return [makeFinding({
          file: file.file, line: ref.dateLine, rule: RULE, level: ERROR,
          message: `Код ${code}: ${entry.docName} фіксує перевірку ${[...allowed].join(' або ')}, а в refs — ${ref.checkedAt}`,
          hint: MISMATCH_HINT,
          quote: ref.locator,
        })];
      }),
    ]);
    const sources = sourceCheckedDates(file).flatMap((source) =>
      futureIssue(file, source.line, source.checkedAt, today, `Джерело «${source.id || source.title}»`),
    );
    return [...refs, ...sources];
  });
}
