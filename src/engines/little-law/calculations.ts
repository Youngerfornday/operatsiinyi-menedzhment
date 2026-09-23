import { ok } from '../shared/result';
import { fail, isFinitePositive, type LittleLawResult } from './errors';

/**
 * Закон Літтла (docs/research/formula-baseline.md, код CAP-04): L = λ · W, де L — середня кількість
 * одиниць у системі (незавершене виробництво), λ — пропускна здатність (темп надходження), W — середній
 * час перебування одиниці в системі. Тотожність дійсна у стійкому стані: темп надходження дорівнює темпу
 * виходу. Рушій лише захищається від від’ємних значень і нульового чи від’ємного знаменника — коректність
 * величин за той самий період перевіряє контент і генератор варіантів.
 */

/** L = λ · W — незавершене виробництво за пропускною здатністю й часом перебування. */
export function littleLawWip(throughput: number, time: number): LittleLawResult<number> {
  if (throughput < 0 || time < 0) return fail('negative-value');
  return ok(throughput * time);
}

/** W = L / λ — середній час перебування в системі за незавершеним виробництвом і пропускною здатністю. */
export function littleLawTime(wip: number, throughput: number): LittleLawResult<number> {
  if (wip < 0) return fail('negative-value');
  if (!isFinitePositive(throughput)) return fail('non-positive-denominator');
  return ok(wip / throughput);
}

/** λ = L / W — пропускна здатність за незавершеним виробництвом і середнім часом перебування. */
export function littleLawThroughput(wip: number, time: number): LittleLawResult<number> {
  if (wip < 0) return fail('negative-value');
  if (!isFinitePositive(time)) return fail('non-positive-denominator');
  return ok(wip / time);
}
