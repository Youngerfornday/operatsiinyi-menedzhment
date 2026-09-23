import { randomInt, type RandomSource } from '../shared/random';
import { formatMoney, formatNumber } from '../shared/number-format';
import type { GivenSection, Stage1Data, Stage2AggregatePlan, Stage2Capacity, Stage2Data } from './types';

/**
 * Етап 2 (`rgr-plan`, course.yaml): прогноз попиту (FC-01..03, оцінка точності FC-04..06), потужність
 * (CAP-01/02) й агрегатний план (AGG-01..03). Метод і структура параметрів фіксовані — варіюються
 * лише числа, щоб кожен із 100 варіантів лишався розв’язним тим самим шляхом.
 */
const HISTORY_PERIODS = 9;
const MOVING_AVERAGE_WINDOW = 3;
/** Від найновішого періоду до найдавнішого (FC-02: Ft = Σ wi·Dt−i), сума точно 1. */
const WEIGHTED_WEIGHTS: readonly number[] = [0.5, 0.3, 0.2];
const EXPONENTIAL_ALPHA = 0.2;
const AGGREGATE_PLAN_HORIZON = 6;
const DEMAND_ROUNDING = 10;
const MIN_DEMAND = 50;
/** Період, у якому тренд дорівнює нулю: середина історії. */
const TREND_ANCHOR_PERIOD = 5;

function roundDemand(raw: number): number {
  return Math.max(MIN_DEMAND, Math.round(raw / DEMAND_ROUNDING) * DEMAND_ROUNDING);
}

/**
 * Ряд попиту навколо базового попиту етапу 1 з невеликим шумом. Тренд спільний для історії й
 * прогнозу агрегатного плану, щоб прогноз продовжував ту саму динаміку, що й фактичні дані.
 */
function buildDemandSeries(random: RandomSource, baseline: number, trendStep: number, periods: number, offset: number, anchor: number): number[] {
  const series: number[] = [];
  for (let index = 0; index < periods; index += 1) {
    const period = offset + index + 1;
    const noise = DEMAND_ROUNDING * randomInt(random, -3, 3);
    series.push(roundDemand(baseline + trendStep * (period - anchor) + noise));
  }
  return series;
}

/**
 * Потужність дільниці (CAP-01): годинна продуктивність дільниці підібрана так, щоб проєктна
 * потужність за місяць перевищувала базовий попит на 5–40 % — використання лишається в межах
 * приблизно 57–95 % (округлення вгору лише знижує використання) і має сенс порівнювати з прогнозом.
 */
function buildCapacity(random: RandomSource, baselineMonthlyDemand: number): Stage2Capacity {
  const availableHoursPerMonth = 8 * randomInt(random, 18, 22);
  const headroomPercent = randomInt(random, 105, 140);
  return {
    productionRatePerHour: Math.ceil((baselineMonthlyDemand * headroomPercent) / 100 / availableHoursPerMonth),
    availableHoursPerMonth,
  };
}

/** Початкова чисельність персоналу — ±15 % від потрібної для середнього прогнозу, ціле число осіб. */
function buildAggregatePlan(random: RandomSource, demandForecast: readonly number[]): Stage2AggregatePlan {
  const regularTimeCostPerUnit = 5 * randomInt(random, 20, 60);
  const holdingCostPerUnitPerMonth = 5 * randomInt(random, 2, 10);
  const unitsPerWorkerPerMonth = 10 * randomInt(random, 3, 8);
  const averageDemand = demandForecast.reduce((sum, value) => sum + value, 0) / demandForecast.length;
  const staffingPercent = randomInt(random, 85, 115);
  return {
    demandForecast,
    beginningInventory: 10 * randomInt(random, 2, 8),
    beginningWorkforce: Math.max(1, Math.round((averageDemand / unitsPerWorkerPerMonth) * (staffingPercent / 100))),
    unitsPerWorkerPerMonth,
    regularTimeCostPerUnit,
    overtimeCostPerUnit: Math.round(regularTimeCostPerUnit * 1.5),
    hiringCostPerWorker: 100 * randomInt(random, 5, 15),
    layoffCostPerWorker: 100 * randomInt(random, 5, 15),
    holdingCostPerUnitPerMonth,
    shortageCostPerUnitPerMonth: holdingCostPerUnitPerMonth * randomInt(random, 2, 4),
  };
}

export function createStage2(random: RandomSource, stage1: Stage1Data): Stage2Data {
  const { baselineMonthlyDemand, facility } = stage1;
  const trendStep = DEMAND_ROUNDING * randomInt(random, -2, 2);
  const demandHistory = buildDemandSeries(random, baselineMonthlyDemand, trendStep, HISTORY_PERIODS, 0, TREND_ANCHOR_PERIOD);
  const aggregateForecast = buildDemandSeries(random, baselineMonthlyDemand, trendStep, AGGREGATE_PLAN_HORIZON, HISTORY_PERIODS, TREND_ANCHOR_PERIOD);
  const capacity = buildCapacity(random, baselineMonthlyDemand);
  const initialExponentialForecast = demandHistory[0] ?? baselineMonthlyDemand;
  const aggregatePlan = buildAggregatePlan(random, aggregateForecast);

  const sections: GivenSection[] = [
    {
      title: 'Історичний попит (9 періодів)',
      rows: demandHistory.map((value, index) => ({ label: `Період ${index + 1}`, value: `${formatNumber(value)} ${facility.unit}` })),
    },
    {
      title: 'Параметри методів прогнозування',
      rows: [
        { label: 'Ковзна середня — розмір вікна', value: `${formatNumber(MOVING_AVERAGE_WINDOW)} періоди` },
        { label: 'Зважена ковзна середня — ваги (від найновішого періоду)', value: WEIGHTED_WEIGHTS.map((weight) => formatNumber(weight)).join(' · ') },
        { label: 'Експоненційне згладжування — константа α', value: formatNumber(EXPONENTIAL_ALPHA) },
        { label: 'Експоненційне згладжування — початковий прогноз', value: `F1 = D1 = ${formatNumber(initialExponentialForecast)} ${facility.unit}` },
        { label: 'Контрольна вибірка для оцінки точності (MAD, MSE, MAPE)', value: 'періоди 4–9' },
      ],
    },
    {
      title: 'Потужність дільниці',
      rows: [
        { label: 'Продуктивність дільниці', value: `${formatNumber(capacity.productionRatePerHour)} ${facility.unit}/год` },
        { label: 'Плановий фонд часу за місяць', value: `${formatNumber(capacity.availableHoursPerMonth)} год` },
      ],
    },
    {
      title: 'Агрегатний план на 6 місяців',
      rows: [
        ...aggregatePlan.demandForecast.map((value, index) => ({ label: `Прогнозований попит, місяць ${index + 1}`, value: `${formatNumber(value)} ${facility.unit}` })),
        { label: 'Запас на початок горизонту', value: `${formatNumber(aggregatePlan.beginningInventory)} ${facility.unit}` },
        { label: 'Чисельність персоналу на початок горизонту', value: `${formatNumber(aggregatePlan.beginningWorkforce)} осіб` },
        { label: 'Виробіток одного працівника за місяць', value: `${formatNumber(aggregatePlan.unitsPerWorkerPerMonth)} ${facility.unit}` },
        { label: 'Чисельність персоналу в плані', value: 'ціле число осіб: потрібну кількість округлюйте вгору' },
        { label: 'Вартість одиниці в звичайний час', value: formatMoney(aggregatePlan.regularTimeCostPerUnit) },
        { label: 'Вартість одиниці в понаднормовий час', value: formatMoney(aggregatePlan.overtimeCostPerUnit) },
        { label: 'Вартість найму одного працівника', value: formatMoney(aggregatePlan.hiringCostPerWorker) },
        { label: 'Вартість звільнення одного працівника', value: formatMoney(aggregatePlan.layoffCostPerWorker) },
        { label: 'Вартість зберігання одиниці запасу за місяць', value: formatMoney(aggregatePlan.holdingCostPerUnitPerMonth) },
        { label: 'Вартість дефіциту одиниці за місяць', value: formatMoney(aggregatePlan.shortageCostPerUnitPerMonth) },
      ],
    },
  ];

  return {
    demandHistory,
    movingAverageWindow: MOVING_AVERAGE_WINDOW,
    weightedWeights: WEIGHTED_WEIGHTS,
    exponentialAlpha: EXPONENTIAL_ALPHA,
    initialExponentialForecast,
    capacity,
    aggregatePlan,
    sections,
  };
}
