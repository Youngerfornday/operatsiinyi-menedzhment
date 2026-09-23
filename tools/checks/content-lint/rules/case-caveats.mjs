/**
 * Правило 5. Застереження кейсів (`caveat` у реєстрі course.yaml).
 * Один тип застереження перевіряється автоматично: «подавати як паралельні факти» — у реченні
 * з назвою кейсу не може бути причинного сполучника (причинний зв'язок джерелами не встановлено).
 */
import { refineLine } from '../content.mjs';
import { ERROR, makeFinding } from '../finding.mjs';
import { hasAnyStem, lower, quote, splitClauses, splitSentences } from '../text.mjs';

export const RULE = 'case-caveat';
const PARALLEL_HINT = 'Подавайте події як паралельні факти: «того ж року», «водночас» замість «через», «під тиском», «унаслідок» — причинний зв’язок джерелами не встановлено.';

const CAUSAL_MARKERS = ['через', 'під тиском', 'штовха', 'змуси', 'змушу', 'унаслідок', 'внаслідок', 'спричин', 'призвів', 'призвел', 'зумовив', 'тому що'];
const PARALLEL_CAVEAT = ['паралельн'];
const COMMON_TITLE_WORDS = new Set(['реформа', 'компанія', 'криза', 'завод', 'цех', 'ринок', 'справа', 'процес', 'звіт', 'модель', 'історія', 'приклад', 'впровадження', 'операції', 'перехід', 'система']);
const EXEMPT_KEYS = new Set(['caveat']);
const MIN_ALIAS = 4;

/** Назви сутностей кейсу: латиниця, лапки і власні назви з початку заголовка. */
export function caseAliases(title) {
  const head = title.split(/\s+—\s+|\s+–\s+|:/)[0] ?? title;
  const quoted = [...title.matchAll(/[«"]([^»"]{3,})[»"]/g)].map(([, value]) => value);
  const words = [...head.matchAll(/[\p{L}][\p{L}\p{N}’-]*/gu)].map(([word]) => word);
  const proper = words.filter((word) => {
    if (word.length < MIN_ALIAS) return false;
    if (COMMON_TITLE_WORDS.has(lower(word))) return false;
    const isLatin = /^[A-Za-z][A-Za-z0-9-]*$/.test(word);
    const isProper = word[0] === word[0].toLocaleUpperCase('uk-UA');
    return isLatin || isProper;
  });
  return [...new Set([...proper, ...quoted].map((value) => lower(value)))];
}

/**
 * Другий орієнтир застереження — власні назви з самого caveat, крім назви кейсу.
 * Без нього будь-яке «через» поруч із назвою компанії ставало б помилкою, хоча caveat
 * забороняє лише конкретний причинний зв’язок (наприклад, «зростання ринку ← впровадження TPS»).
 */
export function caveatTargets(caveat, aliases) {
  const words = [...caveat.matchAll(/[\p{Lu}][\p{L}\p{N}’-]{3,}/gu)].map(([word]) => lower(word));
  return [...new Set(words.map((word) => word.slice(0, 6)))].filter((word) => !aliases.some((alias) => alias.startsWith(word) || word.startsWith(alias.slice(0, 6))));
}

function describedCase(caseEntry) {
  const aliases = caseAliases(caseEntry.title);
  return {
    ...caseEntry,
    aliases,
    targets: caveatTargets(caseEntry.caveat ?? '', aliases),
    parallel: PARALLEL_CAVEAT.some((marker) => lower(caseEntry.caveat ?? '').includes(marker)),
  };
}

/**
 * @param {import('../content.mjs').ContentFile[]} files
 * @param {Array<{ id: string, title: string, caveat?: string }>} cases
 * @returns {import('../finding.mjs').Finding[]}
 */
export function checkCaseCaveats(files, cases) {
  const described = cases.map(describedCase).filter((item) => item.parallel);
  if (described.length === 0) return [];
  return files.flatMap((file) =>
    file.units.flatMap((unit) => {
      if (unit.key !== null && EXEMPT_KEYS.has(unit.key)) return [];
      return splitSentences(unit.text).flatMap((sentence) => splitClauses(sentence)).flatMap((clause) => {
        const sentence = clause;
        const text = lower(clause);
        const line = () => refineLine(file, unit, clause.slice(0, 40));
        return described.flatMap((item) => {
          const mentionsCase = hasAnyStem(sentence, item.aliases) && hasAnyStem(sentence, item.targets);
          const causal = mentionsCase && CAUSAL_MARKERS.filter((marker) => text.includes(marker));
          if (!causal || causal.length === 0) return [];
          return [makeFinding({
            file: file.file, line: line(), rule: RULE, level: ERROR,
            message: `Кейс «${item.id}»: caveat вимагає подавати факти як паралельні, а в реченні є причинний зв’язок («${causal.join('», «')}»)`,
            hint: `${PARALLEL_HINT} Caveat: «${quote(item.caveat, 200)}»`,
            quote: quote(sentence),
          })];
        });
      });
    }),
  );
}
