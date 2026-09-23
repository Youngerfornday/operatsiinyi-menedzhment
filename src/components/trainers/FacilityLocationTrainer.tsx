/**
 * React-острів тренажера вибору місця розташування (client:only): «Задача» на каркасі TaskShell +
 * useTrainerTask. Кожен варіант — випадково обраний метод із `content/practicals/p04.yaml` →
 * `trainer.tasks` (метод вагових коефіцієнтів або метод центру ваги); дані й очікувана відповідь
 * генеруються рушієм `src/engines/facility-location`.
 */
import { BADGE_ACTIVITY_IDS } from '../../engines/gamification';
import { createFacilityLocationVariant, type FacilityLocationVariant } from '../../engines/facility-location';
import type { CalculationTask } from '../../content/schemas/practical';
import {
  checkFacilityLocationTask,
  EMPTY_FACILITY_LOCATION_ANSWER,
  findCalculationTask,
  toFacilityLocationTaskChoices,
  type FacilityLocationAnswer,
} from './model/facility-location';
import { trainerStatusText } from './model/xp-text';
import { NumberField } from './ui/fields';
import { SourceNotes } from './ui/parts';
import { TaskShell } from './ui/TaskShell';
import { useTrainerTask } from './ui/use-trainer-task';

export interface FacilityLocationTrainerProps {
  readonly tasks: readonly CalculationTask[];
}

const ACTIVITY_ID: string = BADGE_ACTIVITY_IDS.facilityLocation;

export function FacilityLocationTrainer({ tasks }: FacilityLocationTrainerProps) {
  const pool = toFacilityLocationTaskChoices(tasks);
  const state = useTrainerTask<FacilityLocationVariant, FacilityLocationAnswer>({
    activityId: ACTIVITY_ID,
    create: (random) => createFacilityLocationVariant(random, pool),
    check: checkFacilityLocationTask,
    emptyAnswer: EMPTY_FACILITY_LOCATION_ANSWER,
  });
  const { variant } = state;
  const spec = findCalculationTask(tasks, variant);
  const status = trainerStatusText(state.statusState.state, ACTIVITY_ID);

  return (
    <TaskShell
      prefix="facility-location"
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
              id={`facility-location-${field.id}`}
              name={field.id}
              label={`${field.label}, ${field.unit}`}
              value={state.answer[field.id] ?? ''}
              onChange={(value) => state.setAnswer({ [field.id]: value })}
              error={state.errors[field.id]}
              hint="Кому й крапку приймає однаково: 2,5 або 2.5."
              placeholder="наприклад, 71,5"
            />
          ))}
        </>
      }
    />
  );
}
