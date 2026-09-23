import { randomInt, type RandomSource } from '../shared/random';
import { formatNumber } from '../shared/number-format';
import type { CapabilityData, ControlChartData, ControlSubgroup, GivenSection, ProductivityBeforeAfter, Stage1Data, Stage4Data } from './types';

/**
 * Етап 4 (`rgr-quality`, course.yaml): контрольна карта X̄-R і придатність процесу (QC-01, QC-04, QC-05)
 * та продуктивність до/після заходів (PROD-01, PROD-03).
 */
const SUBGROUP_SIZE = 5;
const SUBGROUP_COUNT = 10;
/**
 * Табличні константи X̄-R карти для n = 5 — загальновідома стандартна таблиця коефіцієнтів контрольних
 * карт, не звірена з підручником викладача (formula-baseline.md, «Не підтверджено», п. 2; як у практичній 7).
 */
const A2_FOR_N5 = 0.577;
const D3_FOR_N5 = 0;
const D4_FOR_N5 = 2.114;
const MEASUREMENT_RESOLUTION = 10; // 0,1 мм

function buildControlChart(random: RandomSource, target: number): ControlChartData {
  const subgroups: ControlSubgroup[] = [];
  for (let index = 0; index < SUBGROUP_COUNT; index += 1) {
    const measurements = Array.from({ length: SUBGROUP_SIZE }, () => {
      const deltaTenths = randomInt(random, -5, 5);
      return Math.round((target * MEASUREMENT_RESOLUTION + deltaTenths)) / MEASUREMENT_RESOLUTION;
    });
    subgroups.push({ index: index + 1, measurements });
  }
  return { subgroupSize: SUBGROUP_SIZE, subgroups, a2: A2_FOR_N5, d3: D3_FOR_N5, d4: D4_FOR_N5 };
}

function buildCapability(random: RandomSource, target: number): CapabilityData {
  const toleranceTenths = randomInt(random, 3, 8);
  const meanOffsetTenths = randomInt(random, -2, 2);
  const stdDevTenths = randomInt(random, 1, 3);
  return {
    upperSpecLimit: Math.round((target * MEASUREMENT_RESOLUTION + toleranceTenths)) / MEASUREMENT_RESOLUTION,
    lowerSpecLimit: Math.round((target * MEASUREMENT_RESOLUTION - toleranceTenths)) / MEASUREMENT_RESOLUTION,
    processMean: Math.round((target * MEASUREMENT_RESOLUTION + meanOffsetTenths)) / MEASUREMENT_RESOLUTION,
    processStdDev: stdDevTenths / MEASUREMENT_RESOLUTION,
  };
}

/** Ratio = k/10 незалежно від m: `after` завжди продуктивніший за `before` (діапазони k не перетинаються). */
function laborPoint(random: RandomSource, laborHoursMultiplierRange: readonly [number, number], rateTenthsRange: readonly [number, number]) {
  const m = randomInt(random, laborHoursMultiplierRange[0], laborHoursMultiplierRange[1]);
  const k = randomInt(random, rateTenthsRange[0], rateTenthsRange[1]);
  return { output: m * k, laborHours: 10 * m };
}

function buildProductivity(random: RandomSource): ProductivityBeforeAfter {
  return {
    before: laborPoint(random, [20, 60], [8, 16]),
    after: laborPoint(random, [20, 60], [17, 26]),
  };
}

export function createStage4(random: RandomSource, stage1: Stage1Data): Stage4Data {
  const { facility } = stage1;
  const target = randomInt(random, 20, 50);
  const controlChart = buildControlChart(random, target);
  const capability = buildCapability(random, target);
  const productivity = buildProductivity(random);

  const sections: GivenSection[] = [
    {
      title: 'Контрольна карта X̄-R (10 підгруп по 5 вимірювань, мм)',
      rows: [
        ...controlChart.subgroups.map((subgroup) => ({ label: `Підгрупа ${subgroup.index}`, value: subgroup.measurements.map((value) => formatNumber(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 })).join(' / ') })),
        {
          label: 'Табличні константи (n = 5)',
          value: `A2 = ${formatNumber(controlChart.a2)}, D3 = ${formatNumber(controlChart.d3)}, D4 = ${formatNumber(controlChart.d4)} — за стандартною таблицею коефіцієнтів контрольних карт (не звірено з підручником викладача)`,
        },
      ],
    },
    {
      title: 'Придатність процесу (Cp, Cpk)',
      rows: [
        { label: 'Верхня межа допуску (USL)', value: `${formatNumber(capability.upperSpecLimit, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} мм` },
        { label: 'Нижня межа допуску (LSL)', value: `${formatNumber(capability.lowerSpecLimit, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} мм` },
        { label: 'Середнє процесу', value: `${formatNumber(capability.processMean, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} мм` },
        { label: 'Стандартне відхилення процесу', value: `${formatNumber(capability.processStdDev, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} мм` },
      ],
    },
    {
      title: 'Продуктивність до і після заходів',
      rows: [
        { label: 'Випуск до заходів', value: `${formatNumber(productivity.before.output)} ${facility.unit}` },
        { label: 'Затрати праці до заходів', value: `${formatNumber(productivity.before.laborHours)} людино-год.` },
        { label: 'Випуск після заходів', value: `${formatNumber(productivity.after.output)} ${facility.unit}` },
        { label: 'Затрати праці після заходів', value: `${formatNumber(productivity.after.laborHours)} людино-год.` },
      ],
    },
  ];

  return { controlChart, capability, productivity, sections };
}
