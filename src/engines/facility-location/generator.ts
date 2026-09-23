/**
 * Генератор варіантів тренажера вибору місця розташування: для методу вагових коефіцієнтів (LOC-01)
 * будує два майданчики з ваговими факторами й бальними оцінками, для методу центру ваги (LOC-02) —
 * три точки з координатами й обсягом перевезень. Дані «охайні» (ваги й координати — круглі числа),
 * а очікувана відповідь завжди рахується самим рушієм формул (`calculations.ts`).
 */
import { pickOne, randomInt, shuffled, type RandomSource } from '../shared/random';
import { formatNumber } from '../shared/number-format';
import { centerOfGravity, factorRatingScore } from './calculations';
import type { FacilityLocationAnswerField, FacilityLocationChoiceField, FacilityLocationGivenItem, FacilityLocationMethod, FacilityLocationVariant } from './types';

function unwrap<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: unknown }): T {
  if (!result.ok) throw new Error('Генератор розміщення зібрав невалідні дані для рушія формул');
  return result.value;
}

const weight2 = (value: number): string => formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const FACTOR_NAMES = [
  'близькість до постачальників сировини',
  'доступність робочої сили',
  'якість транспортної інфраструктури',
  'вартість оренди ділянки',
  'рівень оподаткування регіону',
] as const;

/** Трійки ваг у сотих — завжди дають рівно 100, тож ваги в сумі дають одиницю без похибки округлення. */
const WEIGHT_SETS: readonly (readonly [number, number, number])[] = [
  [40, 35, 25],
  [45, 30, 25],
  [50, 30, 20],
  [35, 40, 25],
  [30, 45, 25],
  [50, 25, 25],
  [40, 40, 20],
  [45, 35, 20],
  [35, 35, 30],
  [50, 20, 30],
];

const SITE_LABELS = ['Майданчик А', 'Майданчик Б'] as const;

/** Скільки разів перетягувати оцінки, поки бали двох майданчиків не розійдуться (відсів — рідкісна нічия). */
const MAX_DRAWS = 50;

function drawScoresBySite(random: RandomSource, factorCount: number): number[][] {
  return SITE_LABELS.map(() => Array.from({ length: factorCount }, () => randomInt(random, 8, 20) * 5));
}

/** Нічия (рівні бали) не дає однозначної відповіді на «який майданчик кращий» — перетягуємо оцінки. */
function drawDecisiveScores(random: RandomSource, weights: readonly number[], factorCount: number): { readonly scoresBySite: readonly number[][]; readonly scores: readonly number[] } {
  let scoresBySite = drawScoresBySite(random, factorCount);
  let scores = scoresBySite.map((siteScores) => unwrap(factorRatingScore(weights, siteScores)));
  for (let draw = 1; draw < MAX_DRAWS && Math.abs(scores[0]! - scores[1]!) < 1e-9; draw += 1) {
    scoresBySite = drawScoresBySite(random, factorCount);
    scores = scoresBySite.map((siteScores) => unwrap(factorRatingScore(weights, siteScores)));
  }
  return { scoresBySite, scores };
}

function factorRatingVariant(random: RandomSource, variantId: string): FacilityLocationVariant {
  const factors = shuffled(FACTOR_NAMES, random).slice(0, 3);
  const weightSet = pickOne(WEIGHT_SETS, random);
  const weights = weightSet.map((hundredths) => hundredths / 100);
  const { scoresBySite, scores } = drawDecisiveScores(random, weights, factors.length);

  const given: FacilityLocationGivenItem[] = [
    ...factors.map((factor, index) => ({ label: `Вага фактора «${factor}»`, value: weight2(weights[index] as number) })),
    ...SITE_LABELS.flatMap((site, siteIndex) =>
      factors.map((factor, factorIndex) => ({
        label: `Оцінка «${site}» за фактором «${factor}», балів`,
        value: formatNumber(scoresBySite[siteIndex]![factorIndex] as number),
      })),
    ),
  ];

  const answers: FacilityLocationAnswerField[] = SITE_LABELS.map((site, index) => ({
    id: index === 0 ? 'siteA' : 'siteB',
    label: `Сумарний бал, ${site}`,
    unit: 'бала',
    expected: scores[index] as number,
    tolerance: 0.05,
  }));

  const betterIsSiteA = (scores[0] as number) > (scores[1] as number);
  const choice: FacilityLocationChoiceField = {
    id: 'better',
    label: 'Який майданчик набирає більше балів за сумою зважених оцінок?',
    yes: SITE_LABELS[0],
    no: SITE_LABELS[1],
    expected: betterIsSiteA,
  };

  const solution = [
    ...SITE_LABELS.map((site, siteIndex) => {
      const terms = factors.map((_, factorIndex) => `${weight2(weights[factorIndex] as number)} · ${formatNumber(scoresBySite[siteIndex]![factorIndex] as number)}`);
      const products = factors.map((_, factorIndex) => formatNumber((weights[factorIndex] as number) * (scoresBySite[siteIndex]![factorIndex] as number), { maximumFractionDigits: 2 }));
      return `${site}: ${terms.join(' + ')} = ${products.join(' + ')} = ${formatNumber(scores[siteIndex] as number, { maximumFractionDigits: 2 })} бала.`;
    }),
    `${betterIsSiteA ? SITE_LABELS[0] : SITE_LABELS[1]} набирає більше балів (${formatNumber(Math.max(scores[0]!, scores[1]!), { maximumFractionDigits: 2 })} проти ${formatNumber(Math.min(scores[0]!, scores[1]!), { maximumFractionDigits: 2 })}).`,
  ];

  return {
    variantId,
    method: 'factor-rating',
    prompt: 'Метод вагових коефіцієнтів: розрахуйте сумарний бал кожного майданчика (LOC-01) і визначте, який із них набирає більше балів.',
    given,
    answers,
    choice,
    solution,
  };
}

function centerOfGravityVariant(random: RandomSource, variantId: string): FacilityLocationVariant {
  const pointCount = 3;
  const points = Array.from({ length: pointCount }, () => ({
    x: randomInt(random, 4, 20) * 5,
    y: randomInt(random, 4, 20) * 5,
    weight: randomInt(random, 2, 10) * 10,
  }));

  const given: FacilityLocationGivenItem[] = points.flatMap((point, index) => [
    { label: `Точка ${index + 1}, координата x, км`, value: formatNumber(point.x) },
    { label: `Точка ${index + 1}, координата y, км`, value: formatNumber(point.y) },
    { label: `Точка ${index + 1}, обсяг перевезень, тис. т`, value: formatNumber(point.weight) },
  ]);

  const result = unwrap(centerOfGravity(points));
  const totalWeight = points.reduce((sum, point) => sum + point.weight, 0);
  const answers: FacilityLocationAnswerField[] = [
    { id: 'x', label: 'Координата x*', unit: 'км', expected: result.x, tolerance: 0.05 },
    { id: 'y', label: 'Координата y*', unit: 'км', expected: result.y, tolerance: 0.05 },
  ];

  const solution = [
    `Сумарний обсяг: ${points.map((point) => formatNumber(point.weight)).join(' + ')} = ${formatNumber(totalWeight)} тис. т.`,
    `x* = (${points.map((point) => `${formatNumber(point.x)}·${formatNumber(point.weight)}`).join(' + ')}) / ${formatNumber(totalWeight)} = ${formatNumber(result.x, { maximumFractionDigits: 3 })}.`,
    `y* = (${points.map((point) => `${formatNumber(point.y)}·${formatNumber(point.weight)}`).join(' + ')}) / ${formatNumber(totalWeight)} = ${formatNumber(result.y, { maximumFractionDigits: 3 })}.`,
  ];

  return {
    variantId,
    method: 'center-of-gravity',
    prompt: 'Метод центру ваги: визначте координати оптимальної точки розміщення (LOC-02).',
    given,
    answers,
    solution,
  };
}

const GENERATORS: Readonly<Record<FacilityLocationMethod, (random: RandomSource, variantId: string) => FacilityLocationVariant>> = {
  'factor-rating': factorRatingVariant,
  'center-of-gravity': centerOfGravityVariant,
};

export interface FacilityLocationTaskChoice {
  readonly method: FacilityLocationMethod;
}

/** Один випадковий варіант з переданого пулу методів (`content/practicals/p04.yaml` → `trainer.tasks`). */
export function createFacilityLocationVariant(random: RandomSource, tasks: readonly FacilityLocationTaskChoice[]): FacilityLocationVariant {
  if (tasks.length === 0) throw new Error('Пул задач тренажера розміщення порожній');
  const variantId = `flv-${Math.floor(random.next() * 1e9).toString(36)}`;
  const choice = pickOne(tasks, random);
  return GENERATORS[choice.method](random, variantId);
}
