/**
 * React-острів розділу «Тренажер» практичної з розрахунковими задачами (client:only). Тренажери практичної
 * ділять один `trainer.tasks`; кожен бере з нього лише свої методи. Один тренажер — без підзаголовка,
 * кілька — кожен під своїм h3, а «Варіант N» у TaskShell опускається до h4.
 */
import type { ComponentType } from 'react';
import type { CalculationTask } from '../../content/schemas/practical';
import { AggregatePlanningTrainer } from './AggregatePlanningTrainer';
import { ControlChartsTrainer } from './ControlChartsTrainer';
import { CpmPertTrainer } from './CpmPertTrainer';
import { EoqTrainer } from './EoqTrainer';
import { FacilityLocationTrainer } from './FacilityLocationTrainer';
import { ForecastingTrainer } from './ForecastingTrainer';
import { LineBalancingTrainer } from './LineBalancingTrainer';
import { LittleLawTrainer } from './LittleLawTrainer';
import { MrpTrainer } from './MrpTrainer';
import { ProcessCapabilityTrainer } from './ProcessCapabilityTrainer';
import { ProductionCycleTrainer } from './ProductionCycleTrainer';
import { ProductivityTrainer } from './ProductivityTrainer';
import { SequencingTrainer } from './SequencingTrainer';
import { WorkMeasurementTrainer } from './WorkMeasurementTrainer';
import { TaskHeadingLevelContext } from './ui/heading-level';

type TrainerComponent = ComponentType<{ readonly tasks: readonly CalculationTask[] }>;

/** ID реєстру (`practicals[].trainers` у course.yaml) → острів тренажера. */
export const CALCULATION_TRAINER_COMPONENTS: Readonly<Record<string, TrainerComponent>> = {
  productivity: ProductivityTrainer,
  'little-law': LittleLawTrainer,
  'production-cycle': ProductionCycleTrainer,
  'facility-location': FacilityLocationTrainer,
  'line-balancing': LineBalancingTrainer,
  'work-measurement': WorkMeasurementTrainer,
  forecasting: ForecastingTrainer,
  'aggregate-planning': AggregatePlanningTrainer,
  eoq: EoqTrainer,
  mrp: MrpTrainer,
  sequencing: SequencingTrainer,
  'cpm-pert': CpmPertTrainer,
  'control-charts': ControlChartsTrainer,
  'process-capability': ProcessCapabilityTrainer,
};

export interface PracticalTrainerHeading {
  readonly registryId: string;
  readonly title: string;
}

export interface PracticalCalculationTrainersProps {
  readonly tasks: readonly CalculationTask[];
  readonly trainers: readonly PracticalTrainerHeading[];
}

export function PracticalCalculationTrainers({ tasks, trainers }: PracticalCalculationTrainersProps) {
  const [single] = trainers;
  if (trainers.length === 1 && single) {
    const Trainer = componentFor(single.registryId);
    return <Trainer tasks={tasks} />;
  }
  return (
    <TaskHeadingLevelContext.Provider value={4}>
      {trainers.map(({ registryId, title }) => {
        const Trainer = componentFor(registryId);
        return (
          <section key={registryId} className="prac-trainer" aria-labelledby={`trenazher-${registryId}`}>
            <h3 className="h4" id={`trenazher-${registryId}`}>
              {title}
            </h3>
            <Trainer tasks={tasks} />
          </section>
        );
      })}
    </TaskHeadingLevelContext.Provider>
  );
}

function componentFor(registryId: string): TrainerComponent {
  const component = CALCULATION_TRAINER_COMPONENTS[registryId];
  if (!component) throw new Error(`Тренажер «${registryId}» не має острова розрахункових задач`);
  return component;
}
