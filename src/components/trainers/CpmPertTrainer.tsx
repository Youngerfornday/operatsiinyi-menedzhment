/**
 * React-острів тренажера сітьового планування (client:only): «Задача» на каркасі TaskShell +
 * useTrainerTask. Кожен варіант — випадково обраний метод (критичний шлях CPM або ймовірність строку
 * PERT) із задач `content/practicals/p07.yaml` → `trainer.tasks`, відомих рушію `src/engines/cpm-pert`;
 * задачі сусідніх тренажерів практичної (control-charts, process-capability) фільтруються моделлю.
 */
import { BADGE_ACTIVITY_IDS } from '../../engines/gamification';
import { createCpmPertVariant, type CpmPertVariant } from '../../engines/cpm-pert';
import type { CalculationTask } from '../../content/schemas/practical';
import { checkCpmPertTask, type CpmPertAnswer, EMPTY_CPM_PERT_ANSWER, findCpmPertTask, toCpmPertTaskChoices } from './model/cpm-pert';
import { trainerStatusText } from './model/xp-text';
import { NumberField } from './ui/fields';
import { SourceNotes } from './ui/parts';
import { TaskShell } from './ui/TaskShell';
import { useTrainerTask } from './ui/use-trainer-task';

export interface CpmPertTrainerProps {
  readonly tasks: readonly CalculationTask[];
}

const ACTIVITY_ID: string = BADGE_ACTIVITY_IDS.cpmPert;

export function CpmPertTrainer({ tasks }: CpmPertTrainerProps) {
  const pool = toCpmPertTaskChoices(tasks);
  const state = useTrainerTask<CpmPertVariant, CpmPertAnswer>({
    activityId: ACTIVITY_ID,
    create: (random) => createCpmPertVariant(random, pool),
    check: checkCpmPertTask,
    emptyAnswer: EMPTY_CPM_PERT_ANSWER,
  });
  const { variant } = state;
  const spec = findCpmPertTask(tasks, variant);
  const status = trainerStatusText(state.statusState.state, ACTIVITY_ID);

  return (
    <TaskShell
      prefix="cpm-pert"
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
              id={`cpm-pert-${field.id}`}
              name={field.id}
              label={`${field.label}, ${field.unit}`}
              value={state.answer[field.id] ?? ''}
              onChange={(value) => state.setAnswer({ [field.id]: value })}
              error={state.errors[field.id]}
              hint="Кому й крапку приймає однаково: 2,5 або 2.5."
              placeholder="наприклад, 18"
            />
          ))}
        </>
      }
    />
  );
}
