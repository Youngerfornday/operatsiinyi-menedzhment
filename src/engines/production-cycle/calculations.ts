import { ok } from '../shared/result';
import { fail, type ProductionCycleResult } from './errors';
import type { CycleOperation } from './types';

/**
 * Тривалість виробничого циклу партії деталей при трьох видах руху (docs/research/formula-baseline.md,
 * розділ 9, коди PC-01, PC-02, PC-03; Капінос Г.І., Бабій І.В., 2013, розділ 4, п. 4.5). Спільні
 * позначення: n — розмір партії; ti — норма часу операції i; Ci — кількість робочих місць на операції i;
 * p — розмір транспортної (передавальної) партії, 1 ≤ p ≤ n, ділить n без залишку.
 */

function validateOperations(operations: readonly CycleOperation[]): ProductionCycleResult<true> {
  if (operations.length < 2) return fail('too-few-operations');
  const invalid = operations.some((operation) => !(operation.time > 0) || !(operation.workplaces > 0));
  if (invalid) return fail('negative-value');
  return ok(true);
}

function validateBatchSize(batchSize: number): ProductionCycleResult<true> {
  if (!Number.isInteger(batchSize) || batchSize <= 0) return fail('invalid-batch-size');
  return ok(true);
}

function validateTransferBatch(batchSize: number, transferBatch: number): ProductionCycleResult<true> {
  if (!Number.isInteger(transferBatch) || transferBatch <= 0 || transferBatch > batchSize || batchSize % transferBatch !== 0) {
    return fail('invalid-transfer-batch');
  }
  return ok(true);
}

function operationRate(operation: CycleOperation): number {
  return operation.time / operation.workplaces;
}

/** PC-01: Tпосл = n · Σ(ti/Ci) — кожна наступна операція чекає завершення обробки всієї партії. */
export function sequentialCycleTime(operations: readonly CycleOperation[], batchSize: number): ProductionCycleResult<number> {
  const operationsCheck = validateOperations(operations);
  if (!operationsCheck.ok) return operationsCheck;
  const batchCheck = validateBatchSize(batchSize);
  if (!batchCheck.ok) return batchCheck;
  const sum = operations.reduce((total, operation) => total + operationRate(operation), 0);
  return ok(batchSize * sum);
}

/** PC-02: Tпар = p · Σ(ti/Ci) + (n − p) · max(ti/Ci) — транспортні партії йдуть на наступну операцію одразу. */
export function parallelCycleTime(operations: readonly CycleOperation[], batchSize: number, transferBatch: number): ProductionCycleResult<number> {
  const operationsCheck = validateOperations(operations);
  if (!operationsCheck.ok) return operationsCheck;
  const batchCheck = validateBatchSize(batchSize);
  if (!batchCheck.ok) return batchCheck;
  const transferCheck = validateTransferBatch(batchSize, transferBatch);
  if (!transferCheck.ok) return transferCheck;
  const rates = operations.map(operationRate);
  const sum = rates.reduce((total, rate) => total + rate, 0);
  const max = Math.max(...rates);
  return ok(transferBatch * sum + (batchSize - transferBatch) * max);
}

/** Сума мінімумів норм часу кожної пари суміжних операцій — спільна частина PC-03. */
function adjacentMinSum(operations: readonly CycleOperation[]): number {
  const rates = operations.map(operationRate);
  let total = 0;
  for (let index = 0; index < rates.length - 1; index += 1) {
    total += Math.min(rates[index]!, rates[index + 1]!);
  }
  return total;
}

/** PC-03: Tзм = Tпосл − (n − p) · Σ min(ti/Ci; ti+1/Ci+1) — операції без перерв, ціною частини виграшу PC-02. */
export function mixedCycleTime(operations: readonly CycleOperation[], batchSize: number, transferBatch: number): ProductionCycleResult<number> {
  const transferCheck = validateTransferBatch(batchSize, transferBatch);
  if (!transferCheck.ok) return transferCheck;
  const sequential = sequentialCycleTime(operations, batchSize);
  if (!sequential.ok) return sequential;
  return ok(sequential.value - (batchSize - transferBatch) * adjacentMinSum(operations));
}

export interface ProductionCycleTimes {
  readonly sequential: number;
  readonly parallel: number;
  readonly mixed: number;
}

/** Усі три тривалості циклу для того самого маршруту, партії й транспортної партії за один виклик. */
export function productionCycleTimes(operations: readonly CycleOperation[], batchSize: number, transferBatch: number): ProductionCycleResult<ProductionCycleTimes> {
  const sequential = sequentialCycleTime(operations, batchSize);
  if (!sequential.ok) return sequential;
  const parallel = parallelCycleTime(operations, batchSize, transferBatch);
  if (!parallel.ok) return parallel;
  const mixed = mixedCycleTime(operations, batchSize, transferBatch);
  if (!mixed.ok) return mixed;
  return ok({ sequential: sequential.value, parallel: parallel.value, mixed: mixed.value });
}
