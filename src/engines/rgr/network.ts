import { randomInt, type RandomSource } from '../shared/random';
import type { NetworkActivity } from './types';

/**
 * Сітьовий графік упровадження операційного плану (PRJ-01..04, CPM): структура мережі фіксована й
 * заздалегідь перевірена як коректний ациклічний граф з одним стартом і одним фінішем — варіюється
 * лише тривалість кожної роботи, щоб критичний шлях завжди можна було порахувати.
 */
const ACTIVITY_TEMPLATE: ReadonlyArray<{ readonly id: string; readonly name: string; readonly predecessors: readonly string[] }> = [
  { id: 'A', name: 'Затвердження операційного плану дільниці', predecessors: [] },
  { id: 'B', name: 'Закупівля матеріалів і комплектувальних', predecessors: ['A'] },
  { id: 'C', name: 'Навчання персоналу дільниці', predecessors: ['A'] },
  { id: 'D', name: 'Налаштування обладнання', predecessors: ['B'] },
  { id: 'E', name: 'Розроблення робочих інструкцій', predecessors: ['C'] },
  { id: 'F', name: 'Пробний запуск партії', predecessors: ['D', 'E'] },
  { id: 'G', name: 'Контроль якості пробної партії', predecessors: ['F'] },
  { id: 'H', name: 'Запуск дільниці в роботу', predecessors: ['G'] },
];

const MIN_DURATION_DAYS = 2;
const MAX_DURATION_DAYS = 10;

export function createNetwork(random: RandomSource): NetworkActivity[] {
  return ACTIVITY_TEMPLATE.map((activity) => ({ ...activity, durationDays: randomInt(random, MIN_DURATION_DAYS, MAX_DURATION_DAYS) }));
}

export interface CpmActivityResult {
  readonly id: string;
  readonly earlyStart: number;
  readonly earlyFinish: number;
  readonly lateStart: number;
  readonly lateFinish: number;
  readonly slack: number;
  readonly critical: boolean;
}

/**
 * CPM (PRJ-01..04) над мережею. Використовується для внутрішньої перевірки розв’язності
 * (детермінований критичний шлях, додатна тривалість проєкту) — студентові рушій відповіді не показує.
 */
export function computeCpm(activities: readonly NetworkActivity[]): { readonly results: readonly CpmActivityResult[]; readonly projectDuration: number } {
  const byId = new Map(activities.map((activity) => [activity.id, activity]));
  const earlyFinish = new Map<string, number>();
  const earlyStart = new Map<string, number>();
  for (const activity of activities) {
    const start = activity.predecessors.length === 0 ? 0 : Math.max(...activity.predecessors.map((id) => earlyFinish.get(id) ?? 0));
    earlyStart.set(activity.id, start);
    earlyFinish.set(activity.id, start + activity.durationDays);
  }
  const projectDuration = Math.max(...activities.map((activity) => earlyFinish.get(activity.id) ?? 0));

  const successors = new Map<string, string[]>();
  for (const activity of activities) {
    for (const predecessor of activity.predecessors) successors.set(predecessor, [...(successors.get(predecessor) ?? []), activity.id]);
  }
  const lateFinish = new Map<string, number>();
  const lateStart = new Map<string, number>();
  for (const activity of [...activities].reverse()) {
    const following = successors.get(activity.id) ?? [];
    const finish = following.length === 0 ? projectDuration : Math.min(...following.map((id) => lateStart.get(id) ?? projectDuration));
    lateFinish.set(activity.id, finish);
    lateStart.set(activity.id, finish - activity.durationDays);
  }

  const results: CpmActivityResult[] = activities.map((activity) => {
    const es = earlyStart.get(activity.id) ?? 0;
    const ef = earlyFinish.get(activity.id) ?? 0;
    const ls = lateStart.get(activity.id) ?? 0;
    const lf = lateFinish.get(activity.id) ?? 0;
    return { id: activity.id, earlyStart: es, earlyFinish: ef, lateStart: ls, lateFinish: lf, slack: ls - es, critical: ls - es === 0 };
  });
  if (byId.size !== activities.length) throw new Error('Мережа містить роботи з однаковим ID');
  return { results, projectDuration };
}
