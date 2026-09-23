/**
 * React-острів тренажера закону Літтла (client:only): «Задача» на каркасі TaskShell + useTrainerTask.
 * Кожен варіант — випадково обрана шукана величина із `content/practicals/p03.yaml` → `trainer.tasks`
 * (час перебування, незавершене виробництво чи пропускна здатність); дані й очікувана відповідь
 * генеруються рушієм `src/engines/little-law`.
 */
import { BADGE_ACTIVITY_IDS } from '../../engines/gamification';
import { createLittleLawVariant, type LittleLawVariant } from '../../engines/little-law';
import type { CalculationTask } from '../../content/schemas/practical';
import { checkLittleLawTask, EMPTY_LITTLE_LAW_ANSWER, findCalculationTask, toLittleLawTaskChoices, type LittleLawAnswer } from './model/little-law';
import { trainerStatusText } from './model/xp-text';
import { NumberField } from './ui/fields';
import { SourceNotes } from './ui/parts';
import { TaskShell } from './ui/TaskShell';
import { useTrainerTask } from './ui/use-trainer-task';

export interface LittleLawTrainerProps {
  readonly tasks: readonly CalculationTask[];
}

const ACTIVITY_ID: string = BADGE_ACTIVITY_IDS.littleLaw;

export function LittleLawTrainer({ tasks }: LittleLawTrainerProps) {
  const pool = toLittleLawTaskChoices(tasks);
  const state = useTrainerTask<LittleLawVariant, LittleLawAnswer>({
    activityId: ACTIVITY_ID,
    create: (random) => createLittleLawVariant(random, pool),
    check: checkLittleLawTask,
    emptyAnswer: EMPTY_LITTLE_LAW_ANSWER,
  });
  const { variant } = state;
  const spec = findCalculationTask(tasks, variant);
  const status = trainerStatusText(state.statusState.state, ACTIVITY_ID);

  return (
    <TaskShell
      prefix="little-law"
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
              id={`little-law-${field.id}`}
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
