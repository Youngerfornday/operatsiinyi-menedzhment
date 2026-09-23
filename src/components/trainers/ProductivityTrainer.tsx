/**
 * React-острів тренажера продуктивності (client:only): «Задача» на каркасі TaskShell + useTrainerTask.
 * Кожен варіант — випадково обраний метод із `content/practicals/p01.yaml` → `trainer.tasks`
 * (часткова продуктивність за ресурсом, багатофакторна, індекс зміни, використання й ефективність
 * потужності); дані й очікувана відповідь генеруються рушієм `src/engines/productivity`.
 */
import { BADGE_ACTIVITY_IDS } from '../../engines/gamification';
import { createProductivityVariant, type ProductivityVariant } from '../../engines/productivity';
import type { CalculationTask } from '../../content/schemas/practical';
import { checkProductivityTask, EMPTY_PRODUCTIVITY_ANSWER, findCalculationTask, toProductivityTaskChoices, type ProductivityAnswer } from './model/productivity';
import { trainerStatusText } from './model/xp-text';
import { NumberField } from './ui/fields';
import { SourceNotes } from './ui/parts';
import { TaskShell } from './ui/TaskShell';
import { useTrainerTask } from './ui/use-trainer-task';

export interface ProductivityTrainerProps {
  readonly tasks: readonly CalculationTask[];
}

const ACTIVITY_ID: string = BADGE_ACTIVITY_IDS.productivity;

export function ProductivityTrainer({ tasks }: ProductivityTrainerProps) {
  const pool = toProductivityTaskChoices(tasks);
  const state = useTrainerTask<ProductivityVariant, ProductivityAnswer>({
    activityId: ACTIVITY_ID,
    create: (random) => createProductivityVariant(random, pool),
    check: checkProductivityTask,
    emptyAnswer: EMPTY_PRODUCTIVITY_ANSWER,
  });
  const { variant } = state;
  const spec = findCalculationTask(tasks, variant);
  const status = trainerStatusText(state.statusState.state, ACTIVITY_ID);

  return (
    <TaskShell
      prefix="productivity"
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
              id={`productivity-${field.id}`}
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
