/**
 * Генератор варіантів тренажера продуктивності: для кожного методу з `content/practicals/p01.yaml`
 * (list `tasks`) будує один відтворюваний варіант — дані «клінові, але не очевидні» (число обчислюється
 * назад від охайного результату, а не навпаки), і водночас саму відповідь через рушій формул
 * (`calculations.ts`), щоб очікуване значення завжди узгоджувалося з тим, що бачить студент.
 */
import { pickOne, randomInt, type RandomSource } from '../shared/random';
import { formatMoney, formatNumber, formatPercent, roundTo } from '../shared/number-format';
import { capacityEfficiency, capacityUsage, multifactorProductivity, partialProductivity, productivityIndex } from './calculations';
import type { ProductivityAnswerField, ProductivityGivenItem, ProductivityMethod, ProductivityVariant } from './types';

/** M з input = 10·M гарантує цілий випуск при будь-якій темпі K/10 — «охайний, але не очевидний» результат. */
function cleanRatio(random: RandomSource, inputTens: readonly [number, number], rateTenths: readonly [number, number]): { readonly input: number; readonly output: number; readonly rate: number } {
  const m = randomInt(random, inputTens[0], inputTens[1]);
  const k = randomInt(random, rateTenths[0], rateTenths[1]);
  return { input: 10 * m, output: m * k, rate: k / 10 };
}

/** Розбиває суму на `weights.length` доданків пропорційно вагам; останній — залишок, щоб сума збігалася точно. */
function splitBy(total: number, weights: readonly number[]): number[] {
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  const parts = weights.slice(0, -1).map((weight) => Math.round((total * weight) / weightSum));
  const usedSum = parts.reduce((sum, part) => sum + part, 0);
  return [...parts, total - usedSum];
}

function unwrap<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: unknown }): T {
  if (!result.ok) throw new Error('Генератор продуктивності зібрав невалідні дані для рушія формул');
  return result.value;
}

interface ResourceMeta {
  readonly title: string;
  readonly label: string;
  readonly unit: string;
  readonly productivityUnit: string;
}

const RESOURCES: Readonly<Record<string, ResourceMeta>> = {
  labor: { title: 'Часткова продуктивність за працею', label: 'Праця', unit: 'людино-годин', productivityUnit: 'виробів на людино-годину' },
  materials: { title: 'Часткова продуктивність за матеріалами', label: 'Матеріали', unit: 'кілограмів', productivityUnit: 'виробів на кілограм' },
  energy: { title: 'Часткова продуктивність за енергією', label: 'Електроенергія', unit: 'кіловат-годин', productivityUnit: 'виробів на кіловат-годину' },
};

function partialVariant(random: RandomSource, variantId: string, resource: string): ProductivityVariant {
  const meta = RESOURCES[resource] ?? RESOURCES['labor']!;
  const period1 = cleanRatio(random, [40, 200], [8, 35]);
  const period2 = cleanRatio(random, [40, 200], [8, 35]);
  const given: ProductivityGivenItem[] = [
    { label: 'Випуск, квартал I', value: `${formatNumber(period1.output)} виробів` },
    { label: `${meta.label}, квартал I`, value: `${formatNumber(period1.input)} ${meta.unit}` },
    { label: 'Випуск, квартал II', value: `${formatNumber(period2.output)} виробів` },
    { label: `${meta.label}, квартал II`, value: `${formatNumber(period2.input)} ${meta.unit}` },
  ];
  const answers: ProductivityAnswerField[] = [
    { id: 'p1', label: 'Продуктивність, квартал I', unit: meta.productivityUnit, expected: unwrap(partialProductivity(period1.output, period1.input)), tolerance: 0.01 },
    { id: 'p2', label: 'Продуктивність, квартал II', unit: meta.productivityUnit, expected: unwrap(partialProductivity(period2.output, period2.input)), tolerance: 0.01 },
  ];
  const solution = [
    `Квартал I: ${formatNumber(period1.output)} / ${formatNumber(period1.input)} = ${formatNumber(answers[0]!.expected, { maximumFractionDigits: 3 })} ${meta.productivityUnit}.`,
    `Квартал II: ${formatNumber(period2.output)} / ${formatNumber(period2.input)} = ${formatNumber(answers[1]!.expected, { maximumFractionDigits: 3 })} ${meta.productivityUnit}.`,
  ];
  return { variantId, method: 'partial-productivity', resource, prompt: `${meta.title}: розрахуйте показник за обидва квартали (PROD-01).`, given, answers, solution };
}

const COST_CATEGORIES = ['Оплата праці', 'Вартість матеріалів', 'Вартість електроенергії', 'Утримання обладнання'] as const;
const PER_COST_UNIT = 1_000;

function costsFor(random: RandomSource, totalCost: number): number[] {
  const weights = COST_CATEGORIES.map(() => 1 + randomInt(random, 0, 3));
  return splitBy(totalCost, weights);
}

function multifactorVariant(random: RandomSource, variantId: string): ProductivityVariant {
  const period1 = cleanRatio(random, [150, 260], [45, 70]);
  const period2 = cleanRatio(random, [150, 260], [45, 70]);
  const totalCost1 = period1.input * PER_COST_UNIT;
  const totalCost2 = period2.input * PER_COST_UNIT;
  const costs1 = costsFor(random, totalCost1);
  const costs2 = costsFor(random, totalCost2);

  const givenFor = (label: string, output: number, costs: readonly number[], total: number): ProductivityGivenItem[] => [
    { label: `Випуск, ${label}`, value: `${formatNumber(output)} виробів` },
    ...COST_CATEGORIES.map((category, index) => ({ label: `${category}, ${label}`, value: formatMoney(costs[index] ?? 0) })),
    { label: `Разом ресурсів, ${label}`, value: formatMoney(total) },
  ];
  const given = [...givenFor('квартал I', period1.output, costs1, totalCost1), ...givenFor('квартал II', period2.output, costs2, totalCost2)];

  const answers: ProductivityAnswerField[] = [
    { id: 'p1', label: 'Продуктивність, квартал I', unit: 'виробів на 1 000 грн', expected: unwrap(multifactorProductivity(period1.output, costs1, PER_COST_UNIT)), tolerance: 0.01 },
    { id: 'p2', label: 'Продуктивність, квартал II', unit: 'виробів на 1 000 грн', expected: unwrap(multifactorProductivity(period2.output, costs2, PER_COST_UNIT)), tolerance: 0.01 },
  ];
  const solution = [
    `Квартал I: ${formatNumber(period1.output)} / (${formatMoney(totalCost1)} / 1 000) = ${formatNumber(answers[0]!.expected, { maximumFractionDigits: 2 })} виробів на 1 000 грн.`,
    `Квартал II: ${formatNumber(period2.output)} / (${formatMoney(totalCost2)} / 1 000) = ${formatNumber(answers[1]!.expected, { maximumFractionDigits: 2 })} виробів на 1 000 грн.`,
  ];
  return { variantId, method: 'multifactor-productivity', prompt: 'Багатофакторна продуктивність за два квартали (PROD-02): зведіть усі витрати до 1 000 гривень.', given, answers, solution };
}

function indexVariant(random: RandomSource, variantId: string): ProductivityVariant {
  const base = randomInt(random, 20, 120) / 10;
  const current = randomInt(random, 20, 120) / 10;
  const expected = roundTo(unwrap(productivityIndex(current, base)), 2);
  const given: ProductivityGivenItem[] = [
    { label: 'Багатофакторна продуктивність, базовий період', value: `${formatNumber(base)} виробів на 1 000 грн` },
    { label: 'Багатофакторна продуктивність, поточний період', value: `${formatNumber(current)} виробів на 1 000 грн` },
  ];
  const answers: ProductivityAnswerField[] = [{ id: 'index', label: 'Індекс зміни продуктивності', unit: '%', expected, tolerance: 0.05 }];
  const solution = [`${formatNumber(current)} / ${formatNumber(base)} · 100 % = ${formatPercent(current / base)}.`];
  return { variantId, method: 'productivity-index', prompt: 'Індекс зміни продуктивності між періодами (PROD-03).', given, answers, solution };
}

const CAPACITY_LABELS = {
  'capacity-usage': { label: 'проєктну потужність', prompt: 'Коефіцієнт використання проєктної потужності (CAP-01).' },
  'capacity-efficiency': { label: 'ефективну потужність', prompt: 'Ефективність використання потужності (CAP-02).' },
} as const;

function capacityVariant(random: RandomSource, variantId: string, method: 'capacity-usage' | 'capacity-efficiency'): ProductivityVariant {
  const capacity = 100 * randomInt(random, 80, 300);
  const utilizationPerMille = randomInt(random, 600, 990);
  const actualOutput = Math.round((capacity * utilizationPerMille) / 1000);
  const raw = unwrap(method === 'capacity-usage' ? capacityUsage(actualOutput, capacity) : capacityEfficiency(actualOutput, capacity));
  const expected = roundTo(raw, 1);
  const meta = CAPACITY_LABELS[method];
  const given: ProductivityGivenItem[] = [
    { label: 'Фактичний випуск', value: `${formatNumber(actualOutput)} виробів` },
    { label: meta.label === 'проєктну потужність' ? 'Проєктна потужність' : 'Ефективна потужність', value: `${formatNumber(capacity)} виробів` },
  ];
  const answers: ProductivityAnswerField[] = [{ id: 'capacity', label: 'Показник', unit: '%', expected, tolerance: 0.05 }];
  const solution = [`${formatNumber(actualOutput)} / ${formatNumber(capacity)} · 100 % = ${formatPercent(raw / 100)}.`];
  return { variantId, method, prompt: meta.prompt, given, answers, solution };
}

const GENERATORS: Readonly<Record<ProductivityMethod, (random: RandomSource, variantId: string, resource: string | undefined) => ProductivityVariant>> = {
  'partial-productivity': (random, variantId, resource) => partialVariant(random, variantId, resource ?? 'labor'),
  'multifactor-productivity': (random, variantId) => multifactorVariant(random, variantId),
  'productivity-index': (random, variantId) => indexVariant(random, variantId),
  'capacity-usage': (random, variantId) => capacityVariant(random, variantId, 'capacity-usage'),
  'capacity-efficiency': (random, variantId) => capacityVariant(random, variantId, 'capacity-efficiency'),
};

export interface ProductivityTaskChoice {
  readonly method: ProductivityMethod;
  readonly resource?: string;
}

/** Один випадковий варіант з переданого пулу методів (`content/practicals/p01.yaml` → `trainer.tasks`). */
export function createProductivityVariant(random: RandomSource, tasks: readonly ProductivityTaskChoice[]): ProductivityVariant {
  if (tasks.length === 0) throw new Error('Пул задач тренажера продуктивності порожній');
  const variantId = `pv-${Math.floor(random.next() * 1e9).toString(36)}`;
  const choice = pickOne(tasks, random);
  return GENERATORS[choice.method](random, variantId, choice.resource);
}
