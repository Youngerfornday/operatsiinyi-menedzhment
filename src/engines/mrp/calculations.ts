import { ok } from '../shared/result';
import { fail, type MrpResult } from './errors';
import type { MrpExplosionInput, MrpItemResult } from './types';

/**
 * Формули розгортання специфікації виробу — MRP (docs/research/formula-baseline.md, розділ 3).
 * Рушій навмисно не будує тижневого графіка надходжень: кожен рівень отримує один номер періоду
 * запуску замовлення (`releasePeriod`), а не повну відомість «тиждень за тижнем» — для тренажера
 * практичної цього достатньо, повний часовий графік лишається темою окремого прикладу лекції.
 */

/** MRP-01: Брутто-потреба дочірнього рівня = планове замовлення батьківського рівня × норма витрати. */
export function grossRequirement(parentPlannedOrder: number, quantityPerParent: number): MrpResult<number> {
  if (parentPlannedOrder < 0) return fail('negative-value');
  if (!(quantityPerParent > 0)) return fail('non-positive-quantity-per-parent');
  return ok(parentPlannedOrder * quantityPerParent);
}

/** MRP-02: Нетто-потреба = max(0, Брутто − Наявний запас) — від’ємне значення прирівнюється до нуля. */
export function netRequirement(gross: number, onHand: number): MrpResult<number> {
  if (gross < 0 || onHand < 0) return fail('negative-value');
  return ok(Math.max(0, gross - onHand));
}

/** MRP-03: Qзамовлення = Нетто-потреба періоду («партія за партією», без страхового запасу понад потребу). */
export function lotForLotOrder(net: number): MrpResult<number> {
  if (net < 0) return fail('negative-value');
  return ok(net);
}

/**
 * Період запуску замовлення = період потреби − час постачання: механічний наслідок «запуску зі
 * зсувом на час постачання», описаного у worked-прикладі MRP-02 лекції (запуск = надходження,
 * зсунуте назад на час постачання). Не сама формула MRP-02, а її похідна для одного числа періоду.
 */
export function releasePeriod(needPeriod: number, leadTime: number): MrpResult<number> {
  if (leadTime < 0) return fail('negative-lead-time');
  return ok(needPeriod - leadTime);
}

function itemResult(
  id: MrpItemResult['id'],
  title: string,
  gross: number,
  onHand: number,
  leadTime: number,
  needPeriod: number,
): MrpResult<MrpItemResult> {
  const net = netRequirement(gross, onHand);
  if (!net.ok) return net;
  const planned = lotForLotOrder(net.value);
  if (!planned.ok) return planned;
  const release = releasePeriod(needPeriod, leadTime);
  if (!release.ok) return release;
  return ok({ id, title, grossRequirement: gross, onHand, netRequirement: net.value, plannedOrder: planned.value, leadTime, releasePeriod: release.value });
}

/**
 * Повне розгортання триярусної специфікації (MRP-01 + MRP-02 + MRP-03), крок за кроком у порядку
 * ієрархії: А (рівень 0) → B, C (рівень 1) → D (дочірній вузла B, рівень 2). Кожен наступний рівень
 * бере «потрібний період» від *запуску* батьківського замовлення, а не від його терміну готовності —
 * саме тоді батьківський рівень споживає компонент.
 */
export function explodeBom(input: MrpExplosionInput): MrpResult<readonly MrpItemResult[]> {
  if (input.mpsQuantity < 0) return fail('negative-value');

  const resultA = itemResult(input.a.id, input.a.title, input.mpsQuantity, input.a.onHand, input.a.leadTime, input.duePeriod);
  if (!resultA.ok) return resultA;

  const grossB = grossRequirement(resultA.value.plannedOrder, input.b.quantityPerParent);
  if (!grossB.ok) return grossB;
  const resultB = itemResult(input.b.id, input.b.title, grossB.value, input.b.onHand, input.b.leadTime, resultA.value.releasePeriod);
  if (!resultB.ok) return resultB;

  const grossC = grossRequirement(resultA.value.plannedOrder, input.c.quantityPerParent);
  if (!grossC.ok) return grossC;
  const resultC = itemResult(input.c.id, input.c.title, grossC.value, input.c.onHand, input.c.leadTime, resultA.value.releasePeriod);
  if (!resultC.ok) return resultC;

  const grossD = grossRequirement(resultB.value.plannedOrder, input.d.quantityPerParent);
  if (!grossD.ok) return grossD;
  const resultD = itemResult(input.d.id, input.d.title, grossD.value, input.d.onHand, input.d.leadTime, resultB.value.releasePeriod);
  if (!resultD.ok) return resultD;

  return ok([resultA.value, resultB.value, resultC.value, resultD.value]);
}
