import { describe, expect, it } from 'vitest';
import {
  assignStationsSequential,
  balanceDelay,
  idleTimePerCycle,
  lineBalancingEfficiency,
  minimumStations,
  taktTime,
} from './calculations';

/**
 * Фікстури — вивірені числа з content/modules/m2/t05/lecture.mdx:
 * WorkedExample code="LB-01" (баланс лінії з восьми операцій) і code="LB-02" (ефективність тієї
 * самої лінії): такт 60 с, часи операцій 40, 35, 25, 45, 30, 20, 38, 27; Nmin = 5, фактично 6 станцій,
 * ефективність ≈ 72,2 %, простій 27,8 %, абсолютний час простою за цикл — 100 с.
 */
const OPERATION_TIMES = [40, 35, 25, 45, 30, 20, 38, 27];
const CYCLE = 60;

describe('taktTime (CAP-05)', () => {
  it('60 с на виріб при 450 хв доступного часу й попиті 450 виробів', () => {
    const result = taktTime(450 * 60, 450);
    expect(result.ok && result.value).toBeCloseTo(60, 9);
  });

  it('відхиляє недодатний доступний час чи попит', () => {
    expect(taktTime(0, 450)).toMatchObject({ ok: false, error: { code: 'non-positive-value' } });
    expect(taktTime(27_000, 0)).toMatchObject({ ok: false, error: { code: 'non-positive-value' } });
  });
});

describe('minimumStations (LB-01)', () => {
  it('мінімум 5 станцій для суми 260 с при такті 60 с', () => {
    expect(minimumStations(OPERATION_TIMES, CYCLE)).toEqual({ ok: true, value: 5 });
  });

  it('відхиляє порожній список операцій і операцію, довшу за такт', () => {
    expect(minimumStations([], CYCLE)).toMatchObject({ ok: false, error: { code: 'empty-operations' } });
    expect(minimumStations([10, 70], CYCLE)).toMatchObject({ ok: false, error: { code: 'operation-exceeds-cycle' } });
  });

  it('відхиляє недодатний такт і недодатний час операції', () => {
    expect(minimumStations([10, 20], 0)).toMatchObject({ ok: false, error: { code: 'non-positive-denominator' } });
    expect(minimumStations([10, -5], CYCLE)).toMatchObject({ ok: false, error: { code: 'non-positive-value' } });
  });
});

describe('assignStationsSequential (LB-05, послідовний ланцюг)', () => {
  it('дає ту саму групу станцій, що й розбір лекції', () => {
    const result = assignStationsSequential(OPERATION_TIMES, CYCLE);
    expect(result).toEqual({ ok: true, value: [[40], [35, 25], [45], [30, 20], [38], [27]] });
  });

  it('відхиляє операцію, довшу за такт', () => {
    expect(assignStationsSequential([10, 70], CYCLE)).toMatchObject({ ok: false, error: { code: 'operation-exceeds-cycle' } });
  });
});

describe('lineBalancingEfficiency / balanceDelay / idleTimePerCycle (LB-02, LB-03, LB-04)', () => {
  it('ефективність ≈ 72,2 % при 6 фактичних станціях', () => {
    const result = lineBalancingEfficiency(OPERATION_TIMES, 6, CYCLE);
    expect(result.ok && result.value).toBeCloseTo(72.222, 2);
  });

  it('втрати на простій доповнюють ефективність до 100 %', () => {
    expect(balanceDelay(72.222)).toBeCloseTo(27.778, 2);
  });

  it('абсолютний час простою за цикл — 100 с', () => {
    expect(idleTimePerCycle(OPERATION_TIMES, 6, CYCLE)).toEqual({ ok: true, value: 100 });
  });

  it('ефективність і простій відхиляють недодатну кількість станцій чи такт', () => {
    expect(lineBalancingEfficiency(OPERATION_TIMES, 0, CYCLE)).toMatchObject({ ok: false, error: { code: 'non-positive-denominator' } });
    expect(idleTimePerCycle(OPERATION_TIMES, 6, 0)).toMatchObject({ ok: false, error: { code: 'non-positive-denominator' } });
  });
});
