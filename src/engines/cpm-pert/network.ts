import { ok } from '../shared/result';
import { fail, type CpmPertResult } from './errors';
import type { Activity, ActivitySchedule, NetworkResult } from './types';

/**
 * Побудова сітьового графіка методом критичного шляху (CPM): прямий прохід дає ранні терміни (PRJ-01),
 * зворотний — пізні (PRJ-02), різниця — резерви (PRJ-03, PRJ-09), роботи з нульовим резервом складають
 * критичний шлях (PRJ-04). docs/research/formula-baseline.md, розділ 7.
 */

/** Похибка double при роботі з дробовими тривалостями (te методу PERT): резерв «майже нуль» — це нуль. */
const FLOAT_TOLERANCE = 1e-9;

/** Топологічний порядок робіт за алгоритмом Кана; порожній масив — граф містить цикл. */
function topologicalOrder(activities: readonly Activity[]): string[] | null {
  const ids = new Set(activities.map((activity) => activity.id));
  const indegree = new Map<string, number>(activities.map((activity) => [activity.id, activity.predecessors.length]));
  const successorsOf = new Map<string, string[]>(activities.map((activity) => [activity.id, []]));
  for (const activity of activities) {
    for (const predecessor of activity.predecessors) {
      successorsOf.get(predecessor)?.push(activity.id);
    }
  }
  const queue = activities.filter((activity) => activity.predecessors.length === 0).map((activity) => activity.id);
  const order: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    order.push(current);
    for (const successor of successorsOf.get(current) ?? []) {
      const remaining = (indegree.get(successor) ?? 0) - 1;
      indegree.set(successor, remaining);
      if (remaining === 0) queue.push(successor);
    }
  }
  return order.length === ids.size ? order : null;
}

function validate(activities: readonly Activity[]): CpmPertResult<true> {
  if (activities.length === 0) return fail('empty-activities');
  const ids = new Set<string>();
  for (const activity of activities) {
    if (ids.has(activity.id)) return fail('duplicate-id');
    ids.add(activity.id);
  }
  for (const activity of activities) {
    if (activity.duration <= 0) return fail('non-positive-duration');
    for (const predecessor of activity.predecessors) {
      if (!ids.has(predecessor)) return fail('unknown-predecessor');
    }
  }
  return ok(true);
}

export function computeNetwork(activities: readonly Activity[]): CpmPertResult<NetworkResult> {
  const validation = validate(activities);
  if (!validation.ok) return validation;
  const order = topologicalOrder(activities);
  if (order === null) return fail('cycle-detected');

  const byId = new Map(activities.map((activity) => [activity.id, activity]));
  const successorsOf = new Map<string, string[]>(activities.map((activity) => [activity.id, []]));
  for (const activity of activities) {
    for (const predecessor of activity.predecessors) {
      successorsOf.get(predecessor)?.push(activity.id);
    }
  }

  const earlyStart = new Map<string, number>();
  const earlyFinish = new Map<string, number>();
  for (const id of order) {
    const activity = byId.get(id) as Activity;
    const es = activity.predecessors.length === 0 ? 0 : Math.max(...activity.predecessors.map((predecessor) => earlyFinish.get(predecessor) as number));
    earlyStart.set(id, es);
    earlyFinish.set(id, es + activity.duration);
  }
  const projectDuration = Math.max(...[...earlyFinish.values()]);

  const lateFinish = new Map<string, number>();
  const lateStart = new Map<string, number>();
  for (const id of [...order].reverse()) {
    const activity = byId.get(id) as Activity;
    const successors = successorsOf.get(id) ?? [];
    const lf = successors.length === 0 ? projectDuration : Math.min(...successors.map((successor) => lateStart.get(successor) as number));
    lateFinish.set(id, lf);
    lateStart.set(id, lf - activity.duration);
  }

  const schedules: ActivitySchedule[] = order.map((id) => {
    const activity = byId.get(id) as Activity;
    const es = earlyStart.get(id) as number;
    const ef = earlyFinish.get(id) as number;
    const ls = lateStart.get(id) as number;
    const lf = lateFinish.get(id) as number;
    const successors = successorsOf.get(id) ?? [];
    const freeFloat = successors.length === 0 ? projectDuration - ef : Math.min(...successors.map((successor) => earlyStart.get(successor) as number)) - ef;
    return { id, duration: activity.duration, earlyStart: es, earlyFinish: ef, lateStart: ls, lateFinish: lf, totalFloat: ls - es, freeFloat, isCritical: Math.abs(ls - es) < FLOAT_TOLERANCE };
  });

  return ok({ activities: schedules, projectDuration, criticalPath: schedules.filter((schedule) => schedule.isCritical).map((schedule) => schedule.id) });
}

/**
 * Кількість різних критичних шляхів (наскрізних ланцюжків від роботи без критичних попередників до
 * роботи без критичних наступників, де кожна пара сусідів «зв’язана» — EF попередника дорівнює
 * ES наступника). Для мережі з однією гілкою критичних робіт результат — 1; якщо дві гілки мають
 * однакову тривалість (наприклад, обидві сходяться в спільну роботу), критичних шляхів два й більше —
 * вибір «якого саме» шлях база курсу не визначає (використовується, зокрема, у `computePertProject`
 * для дисперсії PRJ-06, яка визначена лише для одного критичного шляху).
 */
export function countCriticalPaths(activities: readonly Activity[], network: NetworkResult): number {
  const scheduleById = new Map(network.activities.map((schedule) => [schedule.id, schedule]));
  const predecessorsById = new Map(activities.map((activity) => [activity.id, activity.predecessors]));
  const criticalIds = network.activities.filter((schedule) => schedule.isCritical).map((schedule) => schedule.id);
  const criticalSet = new Set(criticalIds);

  const successorsOf = new Map<string, string[]>(activities.map((activity) => [activity.id, []]));
  for (const activity of activities) {
    for (const predecessor of activity.predecessors) {
      successorsOf.get(predecessor)?.push(activity.id);
    }
  }

  const isBinding = (fromId: string, toId: string): boolean => {
    const from = scheduleById.get(fromId) as ActivitySchedule;
    const to = scheduleById.get(toId) as ActivitySchedule;
    return Math.abs(from.earlyFinish - to.earlyStart) < FLOAT_TOLERANCE;
  };
  const criticalBindingSuccessors = (id: string): string[] =>
    (successorsOf.get(id) ?? []).filter((successorId) => criticalSet.has(successorId) && isBinding(id, successorId));
  const criticalBindingPredecessors = (id: string): string[] =>
    (predecessorsById.get(id) ?? []).filter((predecessorId) => criticalSet.has(predecessorId) && isBinding(predecessorId, id));

  const memo = new Map<string, number>();
  function pathsFrom(id: string): number {
    const cached = memo.get(id);
    if (cached !== undefined) return cached;
    const successors = criticalBindingSuccessors(id);
    const count = successors.length === 0 ? 1 : successors.reduce((sum, successorId) => sum + pathsFrom(successorId), 0);
    memo.set(id, count);
    return count;
  }

  const roots = criticalIds.filter((id) => criticalBindingPredecessors(id).length === 0);
  return roots.reduce((sum, rootId) => sum + pathsFrom(rootId), 0);
}
