import { randomInt, type RandomSource } from '../shared/random';
import { formatNumber } from '../shared/number-format';
import { pickFacility } from './facilities';
import type { GivenSection, Stage1Data } from './types';

/**
 * Етап 1 (`rgr-variant`, course.yaml): опис операційної системи й таблиця вихідних даних.
 * Формул тут немає — рубрика вимагає лише повний, узгоджений опис із джерелами.
 */
const MIN_MONTHLY_DEMAND_UNITS = 50; // 50 * [8..20] → 400..1000
const MONTHLY_DEMAND_MULTIPLIER_MIN = 8;
const MONTHLY_DEMAND_MULTIPLIER_MAX = 20;
const MIN_ITEM_COUNT = 1;
const MAX_ITEM_COUNT = 3;
const BATCH_SIZE_UNIT = 10;
const BATCH_SIZE_MULTIPLIER_MIN = 3;
const BATCH_SIZE_MULTIPLIER_MAX = 10;

export function createStage1(random: RandomSource): Stage1Data {
  const facility = pickFacility(random);
  const itemCount = randomInt(random, MIN_ITEM_COUNT, MAX_ITEM_COUNT);
  const baselineMonthlyDemand = MIN_MONTHLY_DEMAND_UNITS * randomInt(random, MONTHLY_DEMAND_MULTIPLIER_MIN, MONTHLY_DEMAND_MULTIPLIER_MAX);
  const typicalBatchSize = BATCH_SIZE_UNIT * randomInt(random, BATCH_SIZE_MULTIPLIER_MIN, BATCH_SIZE_MULTIPLIER_MAX);

  const sections: GivenSection[] = [
    {
      title: 'Вихідні дані варіанта',
      rows: [
        { label: 'Дільниця', value: facility.section },
        { label: 'Продукція', value: `${facility.product} (${facility.unit})` },
        { label: 'Тип підприємства', value: facility.enterpriseTypeLabel },
        { label: 'Номенклатура продукції дільниці', value: `${formatNumber(itemCount)} найменування(нь)` },
        { label: 'Середньомісячний обсяг випуску (базовий період)', value: `${formatNumber(baselineMonthlyDemand)} ${facility.unit}` },
        { label: 'Типовий розмір партії запуску', value: `${formatNumber(typicalBatchSize)} ${facility.unit}` },
      ],
    },
  ];

  return { facility, itemCount, baselineMonthlyDemand, typicalBatchSize, sections };
}
