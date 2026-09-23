/**
 * React-острів тренажера придатності процесу (client:only): «Задача» на каркасі TaskShell +
 * useTrainerTask. Варіант — індекси Cp і Cpk із задач `content/practicals/p07.yaml` → `trainer.tasks`,
 * відомих рушію `src/engines/process-capability`; задачі сусідніх тренажерів практичної (cpm-pert,
 * control-charts) фільтруються моделлю.
 */
import { BADGE_ACTIVITY_IDS } from '../../engines/gamification';
import { createProcessCapabilityVariant, type ProcessCapabilityVariant } from '../../engines/process-capability';
import type { CalculationTask } from '../../content/schemas/practical';
import {
  checkProcessCapabilityTask,
  EMPTY_PROCESS_CAPABILITY_ANSWER,
  findProcessCapabilityTask,
  toProcessCapabilityTaskChoices,
  type ProcessCapabilityAnswer,
} from './model/process-capability';
import type { YesNo } from './model/task-check';
import { trainerStatusText } from './model/xp-text';
import { NumberField, YesNoField } from './ui/fields';
import { SourceNotes } from './ui/parts';
import { TaskShell } from './ui/TaskShell';
import { useTrainerTask } from './ui/use-trainer-task';

export interface ProcessCapabilityTrainerProps {
  readonly tasks: readonly CalculationTask[];
}

const ACTIVITY_ID: string = BADGE_ACTIVITY_IDS.processCapability;

export function ProcessCapabilityTrainer({ tasks }: ProcessCapabilityTrainerProps) {
  const pool = toProcessCapabilityTaskChoices(tasks);
  const state = useTrainerTask<ProcessCapabilityVariant, ProcessCapabilityAnswer>({
    activityId: ACTIVITY_ID,
    create: (random) => createProcessCapabilityVariant(random, pool),
    check: checkProcessCapabilityTask,
    emptyAnswer: EMPTY_PROCESS_CAPABILITY_ANSWER,
  });
  const { variant } = state;
  const spec = findProcessCapabilityTask(tasks, variant);
  const status = trainerStatusText(state.statusState.state, ACTIVITY_ID);
  const notCenteredValue = (state.answer[variant.notCentered.id] ?? '') as YesNo;

  return (
    <TaskShell
      prefix="process-capability"
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
              id={`process-capability-${field.id}`}
              name={field.id}
              label={field.unit ? `${field.label}, ${field.unit}` : field.label}
              value={state.answer[field.id] ?? ''}
              onChange={(value) => state.setAnswer({ [field.id]: value })}
              error={state.errors[field.id]}
              hint="Кому й крапку приймає однаково: 1,39 або 1.39."
              placeholder="наприклад, 1,39"
            />
          ))}
          <YesNoField
            id={`process-capability-${variant.notCentered.id}`}
            name={variant.notCentered.id}
            legend={variant.notCentered.label}
            value={notCenteredValue}
            onChange={(value) => state.setAnswer({ [variant.notCentered.id]: value })}
            error={state.errors[variant.notCentered.id]}
          />
        </>
      }
    />
  );
}
