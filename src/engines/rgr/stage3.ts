import type { RandomSource } from '../shared/random';
import { formatNumber } from '../shared/number-format';
import { createBom, createMasterScheduleWeeks, masterScheduleFirstWeek } from './bom';
import { createInventory } from './inventory';
import { createNetwork } from './network';
import type { GivenSection, Stage1Data, Stage3Data } from './types';

/**
 * Етап 3 (`rgr-operations`, course.yaml): запаси (EOQ-01, EOQ-03, EOQ-04), розвертання специфікації
 * (MRP-01..03) і сітьовий графік упровадження (PRJ-01..04).
 */
export function createStage3(random: RandomSource, stage1: Stage1Data): Stage3Data {
  const { facility, baselineMonthlyDemand } = stage1;
  const inventory = createInventory(random, baselineMonthlyDemand);
  const bom = createBom(random);
  const masterScheduleWeeks = createMasterScheduleWeeks(random, baselineMonthlyDemand);
  const firstWeek = masterScheduleFirstWeek(bom);
  const network = createNetwork(random);

  const sections: GivenSection[] = [
    {
      title: 'Запаси: параметри EOQ, точки замовлення й страхового запасу',
      rows: [
        { label: 'Річний попит', value: `${formatNumber(inventory.annualDemand)} ${facility.unit}/рік` },
        { label: 'Вартість одного замовлення', value: `${formatNumber(inventory.orderingCost)} грн` },
        { label: 'Вартість зберігання одиниці за рік', value: `${formatNumber(inventory.holdingCostPerUnitPerYear)} грн` },
        { label: 'Робочих днів на рік', value: `${formatNumber(inventory.workingDaysPerYear)} дн.` },
        { label: 'Середній попит за робочий день (d̄)', value: `${formatNumber(inventory.averageDailyDemand)} ${facility.unit}/дн.` },
        { label: 'Час постачання (L)', value: `${formatNumber(inventory.leadTimeDays)} роб. дн.` },
        { label: 'Стандартне відхилення попиту за час постачання (σ_dLT)', value: `${formatNumber(inventory.leadTimeDemandStdDev)} ${facility.unit}` },
        {
          label: 'Рівень обслуговування',
          value: `${formatNumber(inventory.serviceLevelPercent)} % (z = ${formatNumber(inventory.zValue, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} за стандартною таблицею нормального розподілу, не звірено з підручником викладача)`,
        },
      ],
    },
    {
      title: 'Тижневий план випуску готового виробу (для розвертання специфікації)',
      rows: [
        { label: `Тижні 1–${formatNumber(firstWeek - 1)}`, value: 'потреби в готовому виробі немає (час на запуск замовлень)' },
        ...masterScheduleWeeks.map((value, index) => ({ label: `Тиждень ${formatNumber(firstWeek + index)}`, value: `${formatNumber(value)} ${facility.unit}` })),
      ],
    },
    {
      title: 'Специфікація виробу (BOM)',
      rows: bom.map((item) => ({
        label: item.parentId === null ? item.name : `${item.name} (кількість на «${item.parentId}»)`,
        value:
          item.parentId === null
            ? `строк постачання ${formatNumber(item.leadTimeWeeks)} тижн.`
            : `${formatNumber(item.quantityPerParent)} шт., наявний запас ${formatNumber(item.onHand)} шт., строк постачання ${formatNumber(item.leadTimeWeeks)} тижн., партія за партією`,
      })),
    },
    {
      title: 'Сітьовий графік упровадження',
      rows: network.map((activity) => ({
        label: `${activity.id}. ${activity.name}`,
        value: `тривалість ${formatNumber(activity.durationDays)} дн.${activity.predecessors.length > 0 ? `, після: ${activity.predecessors.join(', ')}` : ' (початок)'}`,
      })),
    },
  ];

  return { inventory, masterScheduleFirstWeek: firstWeek, masterScheduleWeeks, bom, network, sections };
}
