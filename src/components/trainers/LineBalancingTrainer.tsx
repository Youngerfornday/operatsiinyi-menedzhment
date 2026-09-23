/**
 * React-острів тренажера балансування потокової лінії (client:only): «Задача» на каркасі TaskShell +
 * useTrainerTask. Кожен варіант — доступний час, попит і часи операцій із `content/practicals/p04.yaml`
 * → `trainer.tasks` (метод `line-balance`); дані й очікувана відповідь генеруються рушієм
 * `src/engines/line-balancing`.
 */
import { BADGE_ACTIVITY_IDS } from '../../engines/gamification';
import { createLineBalancingVariant, type LineBalancingVariant } from '../../engines/line-balancing';
import type { CalculationTask } from '../../content/schemas/practical';
import {
  checkLineBalancingTask,
  EMPTY_LINE_BALANCING_ANSWER,
  findCalculationTask,
  toLineBalancingTaskChoices,
  type LineBalancingAnswer,
} from './model/line-balancing';
import { trainerStatusText } from './model/xp-text';
import { NumberField } from './ui/fields';
import { SourceNotes } from './ui/parts';
import { TaskShell } from './ui/TaskShell';
import { useTrainerTask } from './ui/use-trainer-task';

export interface LineBalancingTrainerProps {
  readonly tasks: readonly CalculationTask[];
}

const ACTIVITY_ID: string = BADGE_ACTIVITY_IDS.lineBalancing;

export function LineBalancingTrainer({ tasks }: LineBalancingTrainerProps) {
  const pool = toLineBalancingTaskChoices(tasks);
  const state = useTrainerTask<LineBalancingVariant, LineBalancingAnswer>({
    activityId: ACTIVITY_ID,
    create: (random) => createLineBalancingVariant(random, pool),
    check: checkLineBalancingTask,
    emptyAnswer: EMPTY_LINE_BALANCING_ANSWER,
  });
  const { variant } = state;
  const spec = findCalculationTask(tasks, variant);
  const status = trainerStatusText(state.statusState.state, ACTIVITY_ID);

  return (
    <TaskShell
      prefix="line-balancing"
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
              id={`line-balancing-${field.id}`}
              name={field.id}
              label={`${field.label}, ${field.unit}`}
              value={state.answer[field.id] ?? ''}
              onChange={(value) => state.setAnswer({ [field.id]: value })}
              error={state.errors[field.id]}
              hint="Кому й крапку приймає однаково: 2,5 або 2.5."
              placeholder="наприклад, 60"
            />
          ))}
        </>
      }
    />
  );
}
