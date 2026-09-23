/**
 * Генератор варіантів тренажера EOQ: для кожного методу з `content/practicals/p06.yaml`
 * (`trainer.eoq.tasks`) будує один відтворюваний варіант — дані підбираються так, щоб очікувана
 * відповідь виходила охайним числом лише після округлення (як у продавця продуктивності), а не
 * форсуванням «рівних» вхідних даних; водночас відповідь завжди рахує сам рушій формул
 * (`calculations.ts`), тож очікуване значення узгоджене з тим, що бачить студент.
 */
import { pickOne, randomInt, type RandomSource } from '../shared/random';
import { formatNumber, roundTo } from '../shared/number-format';
import { economicOrderQuantity, reorderPoint, safetyStock, totalAnnualInventoryCost } from './calculations';
import type { EoqAnswerField, EoqGivenItem, EoqMethod, EoqVariant } from './types';

function unwrap<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: unknown }): T {
  if (!result.ok) throw new Error('Генератор EOQ зібрав невалідні дані для рушія формул');
  return result.value;
}

/** Мінімальна тривала абсолютна допустима похибка для округлених до цілого відповідей: не менше 1 одиниці. */
function toleranceForRounded(expected: number): number {
  return Math.max(1, Math.round(expected * 0.01));
}

const GIVEN_LABELS = {
  demand: 'Річний попит (D)',
  orderCost: 'Вартість оформлення одного замовлення (S)',
  holdingCost: 'Вартість зберігання одиниці запасу за рік (H)',
} as const;

function demandOrderHoldingGiven(demand: number, orderCost: number, holdingCost: number): EoqGivenItem[] {
  return [
    { label: GIVEN_LABELS.demand, value: `${formatNumber(demand)} шт./рік` },
    { label: GIVEN_LABELS.orderCost, value: `${formatNumber(orderCost)} грн` },
    { label: GIVEN_LABELS.holdingCost, value: `${formatNumber(holdingCost)} грн` },
  ];
}

function eoqVariant(random: RandomSource, variantId: string): EoqVariant {
  const demand = 100 * randomInt(random, 20, 200);
  const orderCost = 25 * randomInt(random, 4, 20);
  const holdingCost = randomInt(random, 5, 40);
  const raw = unwrap(economicOrderQuantity(demand, orderCost, holdingCost));
  const expected = roundTo(raw, 0);
  const answers: EoqAnswerField[] = [{ id: 'eoq', label: 'Оптимальний розмір замовлення (EOQ)', unit: 'шт.', expected, tolerance: toleranceForRounded(expected) }];
  const numerator = 2 * demand * orderCost;
  const solution = [
    `2DS = 2 · ${formatNumber(demand)} · ${formatNumber(orderCost)} = ${formatNumber(numerator)}.`,
    `2DS / H = ${formatNumber(numerator)} / ${formatNumber(holdingCost)} = ${formatNumber(numerator / holdingCost, { maximumFractionDigits: 2 })}.`,
    `Q* = √(${formatNumber(numerator / holdingCost, { maximumFractionDigits: 2 })}) ≈ ${formatNumber(expected)} шт.`,
  ];
  return { variantId, method: 'eoq', prompt: 'Розрахуйте оптимальний розмір замовлення (EOQ-01).', given: demandOrderHoldingGiven(demand, orderCost, holdingCost), answers, solution };
}

const WORKING_DAYS = 300;

interface ServiceLevel {
  readonly percent: number;
  readonly z: number;
}

const SERVICE_LEVELS: readonly ServiceLevel[] = [
  { percent: 90, z: 1.28 },
  { percent: 95, z: 1.65 },
  { percent: 99, z: 2.33 },
];

function reorderPointVariant(random: RandomSource, variantId: string): EoqVariant {
  const annualDemand = WORKING_DAYS * randomInt(random, 4, 60);
  const averageDailyDemand = annualDemand / WORKING_DAYS;
  const leadTimeDays = randomInt(random, 3, 10);
  const sigma = randomInt(random, 10, 50);
  const serviceLevel = pickOne(SERVICE_LEVELS, random);

  const ropBase = unwrap(reorderPoint(averageDailyDemand, leadTimeDays));
  const ssRaw = unwrap(safetyStock(serviceLevel.z, sigma));
  const safetyStockExpected = roundTo(ssRaw, 0);
  const reorderPointExpected = ropBase + safetyStockExpected;

  const given: EoqGivenItem[] = [
    { label: 'Середній денний попит (d̄)', value: `${formatNumber(averageDailyDemand)} шт./день` },
    { label: 'Час постачання (L)', value: `${formatNumber(leadTimeDays)} дн.` },
    { label: 'Стандартне відхилення попиту за час постачання (σ_dLT)', value: `${formatNumber(sigma)} шт.` },
    { label: 'Рівень обслуговування', value: `${formatNumber(serviceLevel.percent)} % (z = ${formatNumber(serviceLevel.z, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` },
  ];
  const answers: EoqAnswerField[] = [
    { id: 'safety-stock', label: 'Страховий запас', unit: 'шт.', expected: safetyStockExpected, tolerance: 1 },
    { id: 'reorder-point', label: 'Точка замовлення зі страховим запасом', unit: 'шт.', expected: reorderPointExpected, tolerance: 1 },
  ];
  const solution = [
    `ROP (без страхового запасу) = d̄ · L = ${formatNumber(averageDailyDemand)} · ${formatNumber(leadTimeDays)} = ${formatNumber(ropBase)} шт.`,
    `SS = z · σ_dLT = ${formatNumber(serviceLevel.z, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · ${formatNumber(sigma)} ≈ ${formatNumber(safetyStockExpected)} шт.`,
    `Точка замовлення = ROP + SS = ${formatNumber(ropBase)} + ${formatNumber(safetyStockExpected)} = ${formatNumber(reorderPointExpected)} шт.`,
  ];
  return { variantId, method: 'reorder-point', prompt: 'Розрахуйте страховий запас і точку замовлення з його урахуванням (EOQ-03, EOQ-04).', given, answers, solution };
}

interface CostPoint {
  readonly label: string;
  readonly id: string;
  readonly quantity: number;
}

function costSensitivityVariant(random: RandomSource, variantId: string): EoqVariant {
  const demand = 100 * randomInt(random, 20, 200);
  const orderCost = 25 * randomInt(random, 4, 20);
  const holdingCost = randomInt(random, 5, 40);
  const qStarRaw = unwrap(economicOrderQuantity(demand, orderCost, holdingCost));
  const qStar = Math.round(qStarRaw);
  const q80 = Math.round(qStar * 0.8);
  const q120 = Math.round(qStar * 1.2);

  const points: readonly CostPoint[] = [
    { label: 'Розмір замовлення на 20% менший за EOQ (0,8·Q*)', id: 'cost-80', quantity: q80 },
    { label: 'Оптимальний розмір замовлення (Q*)', id: 'cost-100', quantity: qStar },
    { label: 'Розмір замовлення на 20% більший за EOQ (1,2·Q*)', id: 'cost-120', quantity: q120 },
  ];
  const costLabels: Readonly<Record<string, string>> = {
    'cost-80': 'Сумарні витрати при 0,8·Q*',
    'cost-100': 'Сумарні витрати при Q*',
    'cost-120': 'Сумарні витрати при 1,2·Q*',
  };

  const given: EoqGivenItem[] = [
    ...demandOrderHoldingGiven(demand, orderCost, holdingCost),
    ...points.map((point) => ({ label: point.label, value: `${formatNumber(point.quantity)} шт.` })),
  ];
  const answers: EoqAnswerField[] = points.map((point) => {
    const costRaw = unwrap(totalAnnualInventoryCost(demand, point.quantity, orderCost, holdingCost));
    const expected = roundTo(costRaw, 0);
    return { id: point.id, label: costLabels[point.id]!, unit: 'грн', expected, tolerance: toleranceForRounded(expected) };
  });
  const solution = [
    ...points.map((point, index) => `Витрати(${formatNumber(point.quantity)}) = (D/Q)·S + (Q/2)·H = ${formatNumber(answers[index]!.expected)} грн.`),
    'Мінімум сумарних витрат — у точці Q* (EOQ), де витрати на оформлення замовлень дорівнюють витратам на зберігання.',
  ];
  return { variantId, method: 'cost-sensitivity', prompt: 'Розрахуйте сумарні річні витрати на управління запасом при трьох розмірах замовлення й порівняйте (EOQ-01).', given, answers, solution };
}

const GENERATORS: Readonly<Record<EoqMethod, (random: RandomSource, variantId: string) => EoqVariant>> = {
  eoq: eoqVariant,
  'reorder-point': reorderPointVariant,
  'cost-sensitivity': costSensitivityVariant,
};

export interface EoqTaskChoice {
  readonly method: EoqMethod;
}

/** Один випадковий варіант з переданого пулу методів (`content/practicals/p06.yaml` → `trainer.eoq.tasks`). */
export function createEoqVariant(random: RandomSource, tasks: readonly EoqTaskChoice[]): EoqVariant {
  if (tasks.length === 0) throw new Error('Пул задач тренажера EOQ порожній');
  const variantId = `eqv-${Math.floor(random.next() * 1e9).toString(36)}`;
  const choice = pickOne(tasks, random);
  return GENERATORS[choice.method](random, variantId);
}
