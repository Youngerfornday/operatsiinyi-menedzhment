/**
 * React-острів тренажера агрегатного планування (client:only): «Задача» на каркасі TaskShell +
 * useTrainerTask. Кожен варіант — горизонт із шести періодів попиту з `content/practicals/p05.yaml` →
 * `trainer.tasks`; студент рахує сумарні витрати виконання плану за стратегією погоні за попитом і за
 * стратегією рівномірного виробництва. Дані й очікувана відповідь генеруються рушієм
 * `src/engines/aggregate-planning`.
 */
import { BADGE_ACTIVITY_IDS } from '../../engines/gamification';
import { createAggregatePlanningVariant, type AggregatePlanningVariant } from '../../engines/aggregate-planning';
import type { CalculationTask } from '../../content/schemas/practical';
import {
  checkAggregatePlanningTask,
  EMPTY_AGGREGATE_PLANNING_ANSWER,
  findAggregatePlanningTask,
  toAggregatePlanningTaskChoices,
  type AggregatePlanningAnswer,
} from './model/aggregate-planning';
import { trainerStatusText } from './model/xp-text';
import { NumberField } from './ui/fields';
import { SourceNotes } from './ui/parts';
import { TaskShell } from './ui/TaskShell';
import { useTrainerTask } from './ui/use-trainer-task';

export interface AggregatePlanningTrainerProps {
  readonly tasks: readonly CalculationTask[];
}

const ACTIVITY_ID: string = BADGE_ACTIVITY_IDS.aggregatePlanning;

export function AggregatePlanningTrainer({ tasks }: AggregatePlanningTrainerProps) {
  const pool = toAggregatePlanningTaskChoices(tasks);
  const state = useTrainerTask<AggregatePlanningVariant, AggregatePlanningAnswer>({
    activityId: ACTIVITY_ID,
    create: (random) => createAggregatePlanningVariant(random, pool),
    check: checkAggregatePlanningTask,
    emptyAnswer: EMPTY_AGGREGATE_PLANNING_ANSWER,
  });
  const { variant } = state;
  const spec = findAggregatePlanningTask(tasks, variant);
  const status = trainerStatusText(state.statusState.state, ACTIVITY_ID);

  return (
    <TaskShell
      prefix="aggregate-planning"
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
              id={`aggregate-planning-${field.id}`}
              name={field.id}
              label={`${field.label}, ${field.unit}`}
              value={state.answer[field.id] ?? ''}
              onChange={(value) => state.setAnswer({ [field.id]: value })}
              error={state.errors[field.id]}
              hint="Кому й крапку приймає однаково, пробіли між розрядами теж: 1 250 000 або 1250000.5."
              placeholder="наприклад, 1 250 000"
            />
          ))}
        </>
      }
    />
  );
}
