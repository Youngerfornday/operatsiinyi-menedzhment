import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '../shared/random';
import { operativeTime, outputRate, pieceRateTime, pieceTime } from './calculations';
import { createWorkMeasurementVariant, type WorkMeasurementTaskChoice } from './generator';

const TASKS: readonly WorkMeasurementTaskChoice[] = [{ method: 'time-standard' }];

function extractGivenNumbers(items: readonly { readonly value: string }[]): number[] {
  return items.map((item) => Number(item.value.replace(/[^\d.,]/g, '').replace(',', '.')));
}

function unwrap<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false }): T {
  if (!result.ok) throw new Error('unexpected error result in test fixture');
  return result.value;
}

describe('createWorkMeasurementVariant', () => {
  it('той самий seed дає той самий варіант', () => {
    const first = createWorkMeasurementVariant(createSeededRandom('p04:1'), TASKS);
    const second = createWorkMeasurementVariant(createSeededRandom('p04:1'), TASKS);
    expect(second).toEqual(first);
  });

  it('різні seed дають різні варіанти', () => {
    const first = createWorkMeasurementVariant(createSeededRandom('p04:1'), TASKS);
    const second = createWorkMeasurementVariant(createSeededRandom('p04:2'), TASKS);
    expect(second.variantId).not.toEqual(first.variantId);
  });

  it('кидає помилку на порожній пул задач', () => {
    expect(() => createWorkMeasurementVariant(createSeededRandom('x'), [])).toThrow();
  });

  it('очікувані значення узгоджені з ланцюжком WM-01 → WM-02 → WM-03 → WM-04', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const variant = createWorkMeasurementVariant(createSeededRandom(`wm:${seed}`), TASKS);
      const [mainTime, auxTime, servicePercent, restPercent, setupTime, batchSize, shiftFund] = extractGivenNumbers(variant.given) as [
        number,
        number,
        number,
        number,
        number,
        number,
        number,
      ];
      const operative = unwrap(operativeTime(mainTime, auxTime));
      const piece = unwrap(pieceTime(operative, servicePercent / 100, restPercent / 100));
      const pieceRate = unwrap(pieceRateTime(piece, setupTime, batchSize));
      const output = unwrap(outputRate(shiftFund, pieceRate));

      expect(variant.answers[0]!.expected).toBeCloseTo(piece, 9);
      expect(variant.answers[1]!.expected).toBeCloseTo(pieceRate, 9);
      expect(variant.answers[2]!.expected).toBe(output);
      expect(Number.isInteger(output)).toBe(true);
    }
  });

  it('норма виробітку не змінюється, якщо студент округлив Тшт.к до сотих чи тисячних, як у лекції (4,63)', () => {
    for (let seed = 0; seed < 1000; seed += 1) {
      const variant = createWorkMeasurementVariant(createSeededRandom(`wm-robust:${seed}`), TASKS);
      const shiftFund = extractGivenNumbers(variant.given)[6] as number;
      const pieceRate = variant.answers[1]!.expected;
      const output = variant.answers[2]!.expected;
      expect(Math.floor(shiftFund / (Math.round(pieceRate * 100) / 100))).toBe(output);
      expect(Math.floor(shiftFund / (Math.round(pieceRate * 1000) / 1000))).toBe(output);
    }
  });
});
