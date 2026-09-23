/**
 * React-острів тренажера EOQ (client:only): «Задача» на каркасі TaskShell + useTrainerTask.
 * Кожен варіант — випадково обраний метод із `content/practicals/p06.yaml` → `trainer.tasks`
 * (оптимальний розмір замовлення, точка замовлення зі страховим запасом, чутливість сумарних витрат) —
 * той самий список ділять тренажери MRP і черговості цієї практичної, тому пул фільтрує лише відомі
 * рушію методи; дані й очікувана відповідь генеруються рушієм `src/engines/eoq`.
 */
import { BADGE_ACTIVITY_IDS } from '../../engines/gamification';
import { createEoqVariant, type EoqVariant } from '../../engines/eoq';
import type { CalculationTask } from '../../content/schemas/practical';
import { checkEoqTask, EMPTY_EOQ_ANSWER, findCalculationTask, toEoqTaskChoices, type EoqAnswer } from './model/eoq';
import { trainerStatusText } from './model/xp-text';
import { NumberField } from './ui/fields';
import { SourceNotes } from './ui/parts';
import { TaskShell } from './ui/TaskShell';
import { useTrainerTask } from './ui/use-trainer-task';

export interface EoqTrainerProps {
  readonly tasks: readonly CalculationTask[];
}

const ACTIVITY_ID: string = BADGE_ACTIVITY_IDS.eoq;

export function EoqTrainer({ tasks }: EoqTrainerProps) {
  const pool = toEoqTaskChoices(tasks);
  const state = useTrainerTask<EoqVariant, EoqAnswer>({
    activityId: ACTIVITY_ID,
    create: (random) => createEoqVariant(random, pool),
    check: checkEoqTask,
    emptyAnswer: EMPTY_EOQ_ANSWER,
  });
  const { variant } = state;
  const spec = findCalculationTask(tasks, variant.method);
  const status = trainerStatusText(state.statusState.state, ACTIVITY_ID);

  return (
    <TaskShell
      prefix="eoq"
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
              id={`eoq-${field.id}`}
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
