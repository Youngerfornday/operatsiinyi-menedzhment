/**
 * React-острів тренажера прогнозування (client:only): «Задача» на каркасі TaskShell + useTrainerTask.
 * Кожен варіант — випадково обраний метод із `content/practicals/p05.yaml` → `trainer.tasks`
 * (проста ковзна середня, зважена ковзна середня, експоненційне згладжування, MAD, MSE, MAPE); дані
 * й очікувана відповідь генеруються рушієм `src/engines/forecasting`.
 */
import { BADGE_ACTIVITY_IDS } from '../../engines/gamification';
import { createForecastingVariant, type ForecastingVariant } from '../../engines/forecasting';
import type { CalculationTask } from '../../content/schemas/practical';
import { checkForecastingTask, EMPTY_FORECASTING_ANSWER, findForecastingTask, toForecastingTaskChoices, type ForecastingAnswer } from './model/forecasting';
import { trainerStatusText } from './model/xp-text';
import { NumberField } from './ui/fields';
import { SourceNotes } from './ui/parts';
import { TaskShell } from './ui/TaskShell';
import { useTrainerTask } from './ui/use-trainer-task';

export interface ForecastingTrainerProps {
  readonly tasks: readonly CalculationTask[];
}

const ACTIVITY_ID: string = BADGE_ACTIVITY_IDS.forecasting;

export function ForecastingTrainer({ tasks }: ForecastingTrainerProps) {
  const pool = toForecastingTaskChoices(tasks);
  const state = useTrainerTask<ForecastingVariant, ForecastingAnswer>({
    activityId: ACTIVITY_ID,
    create: (random) => createForecastingVariant(random, pool),
    check: checkForecastingTask,
    emptyAnswer: EMPTY_FORECASTING_ANSWER,
  });
  const { variant } = state;
  const spec = findForecastingTask(tasks, variant);
  const status = trainerStatusText(state.statusState.state, ACTIVITY_ID);

  return (
    <TaskShell
      prefix="forecasting"
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
              id={`forecasting-${field.id}`}
              name={field.id}
              label={`${field.label}, ${field.unit}`}
              value={state.answer[field.id] ?? ''}
              onChange={(value) => state.setAnswer({ [field.id]: value })}
              error={state.errors[field.id]}
              hint="Кому й крапку приймає однаково: 2,5 або 2.5."
              placeholder="наприклад, 2,5"
            />
          ))}
        </>
      }
    />
  );
}
