/**
 * React-острів тренажера черговості (client:only): «Задача» на каркасі TaskShell + useTrainerTask.
 * Кожен варіант — випадково обраний метод із `content/practicals/p06.yaml` → `trainer.tasks` (FCFS, SPT
 * чи EDD) — той самий список ділять тренажери EOQ і MRP цієї практичної, тому пул фільтрує лише відомі
 * рушію методи; дані, правильний порядок і очікувана відповідь генеруються рушієм
 * `src/engines/sequencing`. На відміну від тренажера продуктивності, студент обирає ще й порядок
 * виконання робіт — по одному `SelectField` на кожну позицію черги.
 */
import { BADGE_ACTIVITY_IDS } from '../../engines/gamification';
import { createSequencingVariant, type SequencingVariant } from '../../engines/sequencing';
import type { CalculationTask } from '../../content/schemas/practical';
import { checkSequencingTask, EMPTY_SEQUENCING_ANSWER, findCalculationTask, sequencePositionIds, toSequencingTaskChoices, UTILIZATION_METHOD, type SequencingAnswer } from './model/sequencing';
import { trainerStatusText } from './model/xp-text';
import { NumberField, SelectField } from './ui/fields';
import { SourceNotes } from './ui/parts';
import { TaskShell } from './ui/TaskShell';
import { useTrainerTask } from './ui/use-trainer-task';

export interface SequencingTrainerProps {
  readonly tasks: readonly CalculationTask[];
}

const ACTIVITY_ID: string = BADGE_ACTIVITY_IDS.sequencing;

/**
 * Помилка позиції черги, поки вона ще актуальна: `setAnswer` знімає помилки лише за ключем `order`,
 * а не за id позиції, тож «не обрано» ховаємо, щойно роботу обрано, а «повтор» — щойно повтору немає.
 */
function positionError(error: string | undefined, order: Readonly<Record<string, string>>, positionId: string): string | undefined {
  if (!error) return undefined;
  const value = order[positionId];
  if (!value) return error;
  const isRepeated = Object.entries(order).some(([id, other]) => id !== positionId && other === value);
  return isRepeated ? error : undefined;
}

export function SequencingTrainer({ tasks }: SequencingTrainerProps) {
  const pool = toSequencingTaskChoices(tasks);
  const state = useTrainerTask<SequencingVariant, SequencingAnswer>({
    activityId: ACTIVITY_ID,
    create: (random) => createSequencingVariant(random, pool),
    check: checkSequencingTask,
    emptyAnswer: EMPTY_SEQUENCING_ANSWER,
  });
  const { variant } = state;
  const spec = findCalculationTask(tasks, variant.method);
  const utilizationSpec = findCalculationTask(tasks, UTILIZATION_METHOD);
  const sourceTasks = [spec, utilizationSpec].filter((task): task is CalculationTask => task !== undefined);
  const status = trainerStatusText(state.statusState.state, ACTIVITY_ID);
  const positions = sequencePositionIds(variant.jobs.length);
  const jobOptions = [{ value: '', label: '— оберіть —' }, ...variant.jobs.map((job) => ({ value: job.id, label: job.label }))];

  return (
    <TaskShell
      prefix="sequencing"
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
          {sourceTasks.map((task) => (
            <p key={task.id} className="formula-line" data-typography="off">
              {task.formula}
            </p>
          ))}
          <dl className="tfigures">
            {variant.jobs.map((job) => (
              <div key={job.id}>
                <dt>{job.label}</dt>
                <dd className="num">{`тривалість ${job.processingTime} дн., строк ${job.dueDate} дн.`}</dd>
              </div>
            ))}
          </dl>
          {sourceTasks.length > 0 && <SourceNotes heading="Формули і джерела" items={sourceTasks.map((task) => ({ item: task.ref, text: task.title }))} />}
        </>
      }
      fields={
        <>
          {positions.map((positionId, index) => (
            <SelectField
              key={positionId}
              id={`sequencing-${positionId}`}
              name={positionId}
              label={`Позиція ${index + 1} черги`}
              value={state.answer.order[positionId] ?? ''}
              options={jobOptions}
              error={positionError(state.errors[positionId], state.answer.order, positionId)}
              onChange={(value) => state.setAnswer({ order: { ...state.answer.order, [positionId]: value } })}
            />
          ))}
          <NumberField
            id="sequencing-avg-flow"
            name="avgFlow"
            label="Середній час проходження, дн."
            value={state.answer.avgFlow}
            onChange={(value) => state.setAnswer({ avgFlow: value })}
            error={state.errors['avg-flow']}
            hint="Кому й крапку приймає однаково: 2,5 або 2.5."
            placeholder="наприклад, 10,6"
          />
          <NumberField
            id="sequencing-avg-lateness"
            name="avgLateness"
            label="Середнє запізнення, дн."
            value={state.answer.avgLateness}
            onChange={(value) => state.setAnswer({ avgLateness: value })}
            error={state.errors['avg-lateness']}
            hint="Кому й крапку приймає однаково: 2,5 або 2.5."
            placeholder="наприклад, 3,2"
          />
          <NumberField
            id="sequencing-utilization"
            name="utilization"
            label="Завантаження, %"
            value={state.answer.utilization}
            onChange={(value) => state.setAnswer({ utilization: value })}
            error={state.errors.utilization}
            hint="Кому й крапку приймає однаково: 41,5 або 41.5."
            placeholder="наприклад, 41,5"
          />
        </>
      }
    />
  );
}
