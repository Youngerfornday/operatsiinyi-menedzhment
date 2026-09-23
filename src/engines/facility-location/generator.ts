/**
 * Генератор варіантів тренажера вибору місця розташування: для методу вагових коефіцієнтів (LOC-01)
 * будує два майданчики з ваговими факторами й бальними оцінками, для методу центру ваги (LOC-02) —
 * три точки з координатами й обсягом перевезень. Дані «охайні» (ваги й координати — круглі числа),
 * а очікувана відповідь завжди рахується самим рушієм формул (`calculations.ts`).
 */
import { pickOne, randomInt, shuffled, type RandomSource } from '../shared/random';
import { formatNumber } from '../shared/number-format';
import { centerOfGravity, factorRatingScore } from './calculations';
import type { FacilityLocationAnswerField, FacilityLocationGivenItem, FacilityLocationMethod, FacilityLocationVariant } from './types';

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

function factorRatingVariant(random: RandomSource, variantId: string): FacilityLocationVariant {
  const factors = shuffled(FACTOR_NAMES, random).slice(0, 3);
  const weightSet = pickOne(WEIGHT_SETS, random);
  const weights = weightSet.map((hundredths) => hundredths / 100);
  const scoresBySite = SITE_LABELS.map(() => factors.map(() => randomInt(random, 8, 20) * 5));

  const given: FacilityLocationGivenItem[] = [
    ...factors.map((factor, index) => ({ label: `Вага фактора «${factor}»`, value: weight2(weights[index] as number) })),
    ...SITE_LABELS.flatMap((site, siteIndex) =>
      factors.map((factor, factorIndex) => ({
        label: `Оцінка «${site}» за фактором «${factor}», балів`,
        value: formatNumber(scoresBySite[siteIndex]![factorIndex] as number),
      })),
    ),
  ];

  const scores = scoresBySite.map((scores) => unwrap(factorRatingScore(weights, scores)));
  const answers: FacilityLocationAnswerField[] = SITE_LABELS.map((site, index) => ({
    id: index === 0 ? 'siteA' : 'siteB',
    label: `Сумарний бал, ${site}`,
    unit: 'бала',
    expected: scores[index] as number,
    tolerance: 0.05,
  }));

  const solution = SITE_LABELS.map((site, siteIndex) => {
    const terms = factors.map((_, factorIndex) => `${weight2(weights[factorIndex] as number)} · ${formatNumber(scoresBySite[siteIndex]![factorIndex] as number)}`);
    const products = factors.map((_, factorIndex) => formatNumber((weights[factorIndex] as number) * (scoresBySite[siteIndex]![factorIndex] as number), { maximumFractionDigits: 2 }));
    return `${site}: ${terms.join(' + ')} = ${products.join(' + ')} = ${formatNumber(scores[siteIndex] as number, { maximumFractionDigits: 2 })} бала.`;
  });

  return {
    variantId,
    method: 'factor-rating',
    prompt: 'Метод вагових коефіцієнтів: розрахуйте сумарний бал кожного майданчика (LOC-01) і оберіть кращий.',
    given,
    answers,
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
