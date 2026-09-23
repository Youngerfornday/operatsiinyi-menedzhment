/**
 * Реєстр React-островів калькуляторів для сторінки практичної (`src/pages/praktychni/[id].astro`).
 * Практична з тренажерами виду `calculation-tasks` може мати кілька калькуляторів на одній сторінці
 * (наприклад, p03 — закон Літтла й тривалість циклу): кожен острів отримує лише свої задачі з
 * `trainer.tasks`, відфільтровані за `method`. Новий калькулятор додає сюди один запис — сторінка
 * ітерує список і нічого хардкодити не треба (див. src/engines/README.md → «Як додати тренажер»).
 */
import type { ComponentType } from 'react';
import type { CalculationTask } from '../../content/schemas/practical';
import { LittleLawTrainer } from './LittleLawTrainer';
import { ProductionCycleTrainer } from './ProductionCycleTrainer';
import { ProductivityTrainer } from './ProductivityTrainer';

export interface CalculationTrainerEntry {
  /** ID реєстру тренажера (`content/course.yaml` → `practicals[].trainers`, `catalog.ts`). */
  readonly registryId: string;
  /** `method` задач `content/practicals/pNN.yaml` → `trainer.tasks`, які належать цьому острову. */
  readonly methods: readonly string[];
  readonly heading: string;
  readonly Component: ComponentType<{ readonly tasks: readonly CalculationTask[] }>;
}

export const CALCULATION_TRAINERS: readonly CalculationTrainerEntry[] = [
  {
    registryId: 'productivity',
    methods: ['partial-productivity', 'multifactor-productivity', 'productivity-index', 'capacity-usage', 'capacity-efficiency'],
    heading: 'Тренажер: розрахункові задачі',
    Component: ProductivityTrainer,
  },
  {
    registryId: 'little-law',
    methods: ['little-law'],
    heading: 'Тренажер: закон Літтла',
    Component: LittleLawTrainer,
  },
  {
    registryId: 'production-cycle',
    methods: ['production-cycle'],
    heading: 'Тренажер: тривалість виробничого циклу',
    Component: ProductionCycleTrainer,
  },
];

export interface CalculationTrainerSection {
  readonly entry: CalculationTrainerEntry;
  readonly tasks: readonly CalculationTask[];
}

/**
 * Для кожного тренажера з реєстру практичної (`practical.trainers`) — його запис і власна вибірка задач.
 * Тренажер без жодної своєї задачі в контенті (помилка контенту) чи без запису в реєстрі — пропускається,
 * а не падає сторінка: контентний лінтер ловить розбіжність окремо.
 */
export function calculationTrainerSections(trainerRegistryIds: readonly string[], tasks: readonly CalculationTask[]): readonly CalculationTrainerSection[] {
  return trainerRegistryIds.flatMap((registryId) => {
    const entry = CALCULATION_TRAINERS.find((candidate) => candidate.registryId === registryId);
    if (!entry) return [];
    const ownTasks = tasks.filter((task) => entry.methods.includes(task.method));
    return ownTasks.length > 0 ? [{ entry, tasks: ownTasks }] : [];
  });
}
