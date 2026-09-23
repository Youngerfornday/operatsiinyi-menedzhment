/**
 * React-острів тренажера MRP (client:only): «Задача» на каркасі TaskShell + useTrainerTask.
 * На відміну від `ProductivityTrainer`, тут лише один спосіб розрахунку (розгортання специфікації),
 * тому немає вибору методу — `tasks` (спільний список `content/practicals/p06.yaml` → `trainer.tasks`
 * для трьох тренажерів практичної) фільтрується до трьох формул MRP (`mrpFormulaTasks`) лише для показу
 * формул і джерел (MRP-01/02/03); рушій `src/engines/mrp` про схему контенту не знає.
 */
import { BADGE_ACTIVITY_IDS } from '../../engines/gamification';
import { createMrpVariant, type MrpVariant } from '../../engines/mrp';
import type { CalculationTask } from '../../content/schemas/practical';
import { checkMrpTask, EMPTY_MRP_ANSWER, mrpFormulaTasks, type MrpAnswer } from './model/mrp';
import { trainerStatusText } from './model/xp-text';
import { NumberField } from './ui/fields';
import { SourceNotes } from './ui/parts';
import { TaskShell } from './ui/TaskShell';
import { useTrainerTask } from './ui/use-trainer-task';

export interface MrpTrainerProps {
  readonly tasks: readonly CalculationTask[];
}

const ACTIVITY_ID: string = BADGE_ACTIVITY_IDS.mrp;

interface AnswerGroup {
  readonly heading: string;
  readonly ids: readonly string[];
}

const ANSWER_GROUPS: readonly AnswerGroup[] = [
  { heading: 'Виріб А', ids: ['a-net', 'a-release'] },
  { heading: 'Вузол B', ids: ['b-gross', 'b-net', 'b-release'] },
  { heading: 'Деталь C', ids: ['c-gross', 'c-net', 'c-release'] },
  { heading: 'Деталь D', ids: ['d-gross', 'd-net', 'd-release'] },
];

export function MrpTrainer({ tasks }: MrpTrainerProps) {
  const state = useTrainerTask<MrpVariant, MrpAnswer>({
    activityId: ACTIVITY_ID,
    create: (random) => createMrpVariant(random),
    check: checkMrpTask,
    emptyAnswer: EMPTY_MRP_ANSWER,
  });
  const { variant } = state;
  const status = trainerStatusText(state.statusState.state, ACTIVITY_ID);
  const answerById = new Map(variant.answers.map((field) => [field.id, field]));
  const formulaTasks = mrpFormulaTasks(tasks);

  return (
    <TaskShell
      prefix="mrp"
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
          <dl className="tfigures">
            {variant.given.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd className="num">{item.value}</dd>
              </div>
            ))}
          </dl>
          <SourceNotes heading="Формули і джерела" items={formulaTasks.map((task) => ({ item: task.ref, text: task.title }))} />
        </>
      }
      fields={
        <>
          {ANSWER_GROUPS.map((group) => (
            <div key={group.heading} className="tfield-group">
              <h4 className="tfield-group-title">{group.heading}</h4>
              {group.ids.map((id) => {
                const field = answerById.get(id);
                if (!field) return null;
                return (
                  <NumberField
                    key={field.id}
                    id={`mrp-${field.id}`}
                    name={field.id}
                    label={`${field.label}, ${field.unit}`}
                    value={state.answer[field.id] ?? ''}
                    onChange={(value) => state.setAnswer({ [field.id]: value })}
                    error={state.errors[field.id]}
                    hint="Кому й крапку приймає однаково: 90 або 90,0."
                    placeholder="наприклад, 90"
                  />
                );
              })}
            </div>
          ))}
        </>
      }
    />
  );
}
