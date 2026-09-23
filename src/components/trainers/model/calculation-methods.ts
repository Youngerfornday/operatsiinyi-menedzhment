/** Методи розрахункових задач, які розуміє кожен тренажер (ID реєстру → методи `trainer.tasks[].method`). */
import { AGGREGATE_PLANNING_METHODS } from './aggregate-planning';
import { EOQ_METHODS } from './eoq';
import { FACILITY_LOCATION_METHODS } from './facility-location';
import { FORECASTING_METHODS } from './forecasting';
import { LINE_BALANCING_METHODS } from './line-balancing';
import { LITTLE_LAW_METHODS } from './little-law';
import { MRP_METHODS } from './mrp';
import { PRODUCTION_CYCLE_METHODS } from './production-cycle';
import { PRODUCTIVITY_METHODS } from './productivity';
import { SEQUENCING_METHODS, UTILIZATION_METHOD } from './sequencing';
import { WORK_MEASUREMENT_METHODS } from './work-measurement';

export const CALCULATION_TRAINER_METHODS: Readonly<Record<string, readonly string[]>> = {
  productivity: PRODUCTIVITY_METHODS,
  'little-law': LITTLE_LAW_METHODS,
  'production-cycle': PRODUCTION_CYCLE_METHODS,
  'facility-location': FACILITY_LOCATION_METHODS,
  'line-balancing': LINE_BALANCING_METHODS,
  'work-measurement': WORK_MEASUREMENT_METHODS,
  forecasting: FORECASTING_METHODS,
  'aggregate-planning': AGGREGATE_PLANNING_METHODS,
  eoq: EOQ_METHODS,
  mrp: MRP_METHODS,
  sequencing: [...SEQUENCING_METHODS, UTILIZATION_METHOD],
};
