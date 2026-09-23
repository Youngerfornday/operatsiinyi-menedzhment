/**
 * Типи варіанта РГР «Операційний план дільниці підприємства» (content/course.yaml →
 * grading.caseProject). Чотири етапи рубрики відповідають чотирьом секціям варіанта нижче.
 * Рушій генерує лише вихідні дані для звіту — самі розрахунки виконує студент.
 */

/** Пункт вихідних даних для показу в таблиці («Середньомісячний попит» → «450 шт.»). */
export interface GivenRow {
  readonly label: string;
  readonly value: string;
}

/** Іменована таблиця вихідних даних (кілька таблиць на етап). */
export interface GivenSection {
  readonly title: string;
  readonly rows: readonly GivenRow[];
}

export type EnterpriseType = 'processing' | 'service';

export interface FacilityProfile {
  readonly id: string;
  /** Назва дільниці («Дільниця розкрою тканини швейного цеху»). */
  readonly section: string;
  readonly enterpriseType: EnterpriseType;
  readonly enterpriseTypeLabel: string;
  /** Продукція дільниці («чоловічі сорочки»). */
  readonly product: string;
  readonly unit: string;
}

export interface Stage1Data {
  readonly facility: FacilityProfile;
  readonly itemCount: number;
  readonly baselineMonthlyDemand: number;
  readonly typicalBatchSize: number;
  readonly sections: readonly GivenSection[];
}

export interface Stage2AggregatePlan {
  readonly demandForecast: readonly number[];
  readonly beginningInventory: number;
  readonly beginningWorkforce: number;
  readonly unitsPerWorkerPerMonth: number;
  readonly regularTimeCostPerUnit: number;
  readonly overtimeCostPerUnit: number;
  readonly hiringCostPerWorker: number;
  readonly layoffCostPerWorker: number;
  readonly holdingCostPerUnitPerMonth: number;
  readonly shortageCostPerUnitPerMonth: number;
}

export interface Stage2Capacity {
  readonly productionRatePerHour: number;
  readonly availableHoursPerMonth: number;
}

export interface Stage2Data {
  /** 9 періодів фактичного попиту: 4..9 — контрольна вибірка для оцінки точності прогнозу. */
  readonly demandHistory: readonly number[];
  readonly movingAverageWindow: number;
  /** Ваги від найновішого періоду до найдавнішого, сума = 1. */
  readonly weightedWeights: readonly number[];
  readonly exponentialAlpha: number;
  readonly capacity: Stage2Capacity;
  readonly aggregatePlan: Stage2AggregatePlan;
  readonly sections: readonly GivenSection[];
}

export interface InventoryData {
  readonly annualDemand: number;
  readonly orderingCost: number;
  readonly holdingCostPerUnitPerYear: number;
  readonly leadTimeDays: number;
  readonly averageDailyDemand: number;
  readonly dailyDemandStdDev: number;
  readonly serviceLevelPercent: number;
  readonly zValue: number;
}

export interface BomItem {
  readonly id: string;
  readonly name: string;
  readonly parentId: string | null;
  readonly quantityPerParent: number;
  readonly leadTimeWeeks: number;
  readonly onHand: number;
  readonly lotSizingRule: 'lot-for-lot';
}

export interface NetworkActivity {
  readonly id: string;
  readonly name: string;
  readonly predecessors: readonly string[];
  readonly durationDays: number;
}

export interface Stage3Data {
  readonly inventory: InventoryData;
  readonly masterScheduleWeeks: readonly number[];
  readonly bom: readonly BomItem[];
  readonly network: readonly NetworkActivity[];
  readonly sections: readonly GivenSection[];
}

export interface ControlSubgroup {
  readonly index: number;
  readonly measurements: readonly number[];
}

export interface ControlChartData {
  readonly subgroupSize: number;
  readonly subgroups: readonly ControlSubgroup[];
  readonly a2: number;
  readonly d3: number;
  readonly d4: number;
}

export interface CapabilityData {
  readonly upperSpecLimit: number;
  readonly lowerSpecLimit: number;
  readonly processMean: number;
  readonly processStdDev: number;
}

export interface ProductivityBeforeAfter {
  readonly before: { readonly output: number; readonly laborHours: number };
  readonly after: { readonly output: number; readonly laborHours: number };
}

export interface Stage4Data {
  readonly controlChart: ControlChartData;
  readonly capability: CapabilityData;
  readonly productivity: ProductivityBeforeAfter;
  readonly sections: readonly GivenSection[];
}

export interface RgrVariant {
  /** 1..100 — за останніми двома цифрами номера залікової книжки (00 → 100). */
  readonly variantNumber: number;
  readonly stage1: Stage1Data;
  readonly stage2: Stage2Data;
  readonly stage3: Stage3Data;
  readonly stage4: Stage4Data;
}
