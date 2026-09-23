/**
 * React-острів тренажера контрольних карт (client:only): «Задача» на каркасі TaskShell +
 * useTrainerTask. Варіант — карта x̄-R або p-карта із задач `content/practicals/p07.yaml` →
 * `trainer.tasks`, відомих рушію `src/engines/control-charts`; задачі сусідніх тренажерів практичної
 * (cpm-pert, process-capability) фільтруються моделлю. Крім меж карти студент відповідає на питання
 * «так/ні» — чи сигналізує задана підгрупа про розладнання процесу.
 */
import { BADGE_ACTIVITY_IDS } from '../../engines/gamification';
import { createControlChartVariant, type ControlChartVariant } from '../../engines/control-charts';
import type { CalculationTask } from '../../content/schemas/practical';
import {
  checkControlChartTask,
  type ControlChartAnswer,
  EMPTY_CONTROL_CHART_ANSWER,
  findControlChartTask,
  toControlChartTaskChoices,
} from './model/control-charts';
import type { YesNo } from './model/task-check';
import { trainerStatusText } from './model/xp-text';
import { NumberField, YesNoField } from './ui/fields';
import { SourceNotes } from './ui/parts';
import { TaskShell } from './ui/TaskShell';
import { useTrainerTask } from './ui/use-trainer-task';

export interface ControlChartsTrainerProps {
  readonly tasks: readonly CalculationTask[];
}

const ACTIVITY_ID: string = BADGE_ACTIVITY_IDS.controlCharts;

export function ControlChartsTrainer({ tasks }: ControlChartsTrainerProps) {
  const pool = toControlChartTaskChoices(tasks);
  const state = useTrainerTask<ControlChartVariant, ControlChartAnswer>({
    activityId: ACTIVITY_ID,
    create: (random) => createControlChartVariant(random, pool),
    check: checkControlChartTask,
    emptyAnswer: EMPTY_CONTROL_CHART_ANSWER,
  });
  const { variant } = state;
  const spec = findControlChartTask(tasks, variant);
  const status = trainerStatusText(state.statusState.state, ACTIVITY_ID);
  const signalValue = (state.answer[variant.signal.id] ?? '') as YesNo;

  return (
    <TaskShell
      prefix="control-charts"
      number={state.number}
      status={status}
      check={state.check}
      solution={variant.solution}
      outcomeText={state.outcomeText}
      onSubmit={state.submit}
      onNext={state.next}
      fabula={
        <>
          <p>{variant.prompt}</p>
          {spec && (
            <p className="formula-line" data-typography="off">
              {spec.formula}
            </p>
          )}
          <dl className="tfigures">
            {variant.given.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd className="num">{item.value}</dd>
              </div>
            ))}
          </dl>
          {spec && <SourceNotes heading="Формула і джерело" items={[{ item: spec.ref, text: spec.title }]} />}
        </>
      }
      fields={
        <>
          {variant.answers.map((field) => (
            <NumberField
              key={field.id}
              id={`control-charts-${field.id}`}
              name={field.id}
              label={`${field.label}, ${field.unit}`}
              value={state.answer[field.id] ?? ''}
              onChange={(value) => state.setAnswer({ [field.id]: value })}
              error={state.errors[field.id]}
              hint="Кому й крапку приймає однаково: 2,5 або 2.5."
              placeholder="наприклад, 15,4"
            />
          ))}
          <YesNoField
            id={`control-charts-${variant.signal.id}`}
            name={variant.signal.id}
            legend={variant.signal.label}
            value={signalValue}
            onChange={(value) => state.setAnswer({ [variant.signal.id]: value })}
            error={state.errors[variant.signal.id]}
          />
        </>
      }
    />
  );
}
