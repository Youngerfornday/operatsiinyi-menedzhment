/**
 * React-острів тренажера тривалості виробничого циклу (client:only): «Задача» на каркасі TaskShell +
 * useTrainerTask. Кожен варіант — новий маршрут із 3–4 операцій, розмір партії й транспортна партія;
 * студент рахує тривалість циклу при послідовному, паралельному й паралельно-послідовному русі
 * (PC-01, PC-02, PC-03) з `content/practicals/p03.yaml` → `trainer.tasks`; дані й очікувана відповідь
 * генеруються рушієм `src/engines/production-cycle`.
 */
import { BADGE_ACTIVITY_IDS } from '../../engines/gamification';
import { createProductionCycleVariant, type ProductionCycleVariant } from '../../engines/production-cycle';
import type { CalculationTask } from '../../content/schemas/practical';
import {
  checkProductionCycleTask,
  EMPTY_PRODUCTION_CYCLE_ANSWER,
  findCalculationTask,
  toProductionCycleTaskChoices,
  type ProductionCycleAnswer,
} from './model/production-cycle';
import { trainerStatusText } from './model/xp-text';
import { NumberField } from './ui/fields';
import { SourceNotes } from './ui/parts';
import { TaskShell } from './ui/TaskShell';
import { useTrainerTask } from './ui/use-trainer-task';

export interface ProductionCycleTrainerProps {
  readonly tasks: readonly CalculationTask[];
}

const ACTIVITY_ID: string = BADGE_ACTIVITY_IDS.productionCycle;

export function ProductionCycleTrainer({ tasks }: ProductionCycleTrainerProps) {
  const pool = toProductionCycleTaskChoices(tasks);
  const state = useTrainerTask<ProductionCycleVariant, ProductionCycleAnswer>({
    activityId: ACTIVITY_ID,
    create: (random) => createProductionCycleVariant(random, pool),
    check: checkProductionCycleTask,
    emptyAnswer: EMPTY_PRODUCTION_CYCLE_ANSWER,
  });
  const { variant } = state;
  const spec = findCalculationTask(tasks, variant);
  const status = trainerStatusText(state.statusState.state, ACTIVITY_ID);

  return (
    <TaskShell
      prefix="production-cycle"
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
          {spec && <SourceNotes heading="Формули і джерело" items={[{ item: spec.ref, text: spec.title }]} />}
        </>
      }
      fields={
        <>
          {variant.answers.map((field) => (
            <NumberField
              key={field.id}
              id={`production-cycle-${field.id}`}
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
