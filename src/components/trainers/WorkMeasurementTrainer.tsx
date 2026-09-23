/**
 * React-острів тренажера нормування праці (client:only): «Задача» на каркасі TaskShell +
 * useTrainerTask. Кожен варіант — хронометражні дані з `content/practicals/p04.yaml` →
 * `trainer.tasks` (метод `time-standard`); дані й очікувана відповідь генеруються рушієм
 * `src/engines/work-measurement`.
 */
import { BADGE_ACTIVITY_IDS } from '../../engines/gamification';
import { createWorkMeasurementVariant, type WorkMeasurementVariant } from '../../engines/work-measurement';
import type { CalculationTask } from '../../content/schemas/practical';
import {
  checkWorkMeasurementTask,
  EMPTY_WORK_MEASUREMENT_ANSWER,
  findCalculationTask,
  toWorkMeasurementTaskChoices,
  type WorkMeasurementAnswer,
} from './model/work-measurement';
import { trainerStatusText } from './model/xp-text';
import { NumberField } from './ui/fields';
import { SourceNotes } from './ui/parts';
import { TaskShell } from './ui/TaskShell';
import { useTrainerTask } from './ui/use-trainer-task';

export interface WorkMeasurementTrainerProps {
  readonly tasks: readonly CalculationTask[];
}

const ACTIVITY_ID: string = BADGE_ACTIVITY_IDS.workMeasurement;

export function WorkMeasurementTrainer({ tasks }: WorkMeasurementTrainerProps) {
  const pool = toWorkMeasurementTaskChoices(tasks);
  const state = useTrainerTask<WorkMeasurementVariant, WorkMeasurementAnswer>({
    activityId: ACTIVITY_ID,
    create: (random) => createWorkMeasurementVariant(random, pool),
    check: checkWorkMeasurementTask,
    emptyAnswer: EMPTY_WORK_MEASUREMENT_ANSWER,
  });
  const { variant } = state;
  const spec = findCalculationTask(tasks, variant);
  const status = trainerStatusText(state.statusState.state, ACTIVITY_ID);

  return (
    <TaskShell
      prefix="work-measurement"
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
              id={`work-measurement-${field.id}`}
              name={field.id}
              label={`${field.label}, ${field.unit}`}
              value={state.answer[field.id] ?? ''}
              onChange={(value) => state.setAnswer({ [field.id]: value })}
              error={state.errors[field.id]}
              hint="Кому й крапку приймає однаково: 4,18 або 4.18."
              placeholder="наприклад, 4,18"
            />
          ))}
        </>
      }
    />
  );
}
