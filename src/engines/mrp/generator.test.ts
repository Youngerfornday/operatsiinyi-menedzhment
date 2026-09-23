import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '../shared/random';
import { createMrpVariant } from './generator';

const ANSWER_IDS = ['a-net', 'a-release', 'b-gross', 'b-net', 'b-release', 'c-gross', 'c-net', 'c-release', 'd-gross', 'd-net', 'd-release'];

describe('createMrpVariant', () => {
  it('той самий seed дає той самий варіант', () => {
    const first = createMrpVariant(createSeededRandom('p06:mrp:1'));
    const second = createMrpVariant(createSeededRandom('p06:mrp:1'));
    expect(second).toEqual(first);
  });

  it('різні seed дають різні варіанти', () => {
    const first = createMrpVariant(createSeededRandom('p06:mrp:1'));
    const second = createMrpVariant(createSeededRandom('p06:mrp:2'));
    expect(second.variantId).not.toEqual(first.variantId);
  });

  it('рівно 11 полів відповіді з очікуваними id, у правильному порядку', () => {
    const variant = createMrpVariant(createSeededRandom('p06:mrp:ids'));
    expect(variant.answers.map((field) => field.id)).toEqual(ANSWER_IDS);
  });

  it('усі вихідні дані заповнені (given непорожній, кожен пункт має мітку і значення)', () => {
    const variant = createMrpVariant(createSeededRandom('p06:mrp:given'));
    expect(variant.given.length).toBeGreaterThan(0);
    for (const item of variant.given) {
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.value.length).toBeGreaterThan(0);
    }
  });

  it('усі очікувані значення — невід’ємні цілі числа, допуск 0', () => {
    for (let seed = 0; seed < 50; seed += 1) {
      const variant = createMrpVariant(createSeededRandom(`p06:mrp:invariants:${seed}`));
      for (const field of variant.answers) {
        expect(Number.isInteger(field.expected)).toBe(true);
        expect(field.expected).toBeGreaterThanOrEqual(0);
        expect(field.tolerance).toBe(0);
      }
    }
  });

  it('нетто-потреба ніколи не перевищує брутто-потребу (netRequirement — MRP-02 — не рахується вдруге, лише непряма перевірка форми відповіді)', () => {
    for (let seed = 0; seed < 50; seed += 1) {
      const variant = createMrpVariant(createSeededRandom(`p06:mrp:lot:${seed}`));
      const byId = Object.fromEntries(variant.answers.map((field) => [field.id, field.expected]));
      expect(byId['b-net']).toBeLessThanOrEqual(byId['b-gross']!);
      expect(byId['c-net']).toBeLessThanOrEqual(byId['c-gross']!);
      expect(byId['d-net']).toBeLessThanOrEqual(byId['d-gross']!);
    }
  });

  it('період запуску замовлення А не пізніший за тиждень потреби', () => {
    for (let seed = 0; seed < 50; seed += 1) {
      const variant = createMrpVariant(createSeededRandom(`p06:mrp:release:${seed}`));
      const duePeriodItem = variant.given.find((item) => item.label === 'Тиждень потреби (А)');
      expect(duePeriodItem).toBeDefined();
      const duePeriod = Number(duePeriodItem!.value.replace(/[^\d.,]/g, '').replace(',', '.'));
      const aRelease = variant.answers.find((field) => field.id === 'a-release')!.expected;
      expect(aRelease).toBeLessThanOrEqual(duePeriod);
    }
  });

  it('усі періоди запуску не раніші за тиждень 1 (duePeriod підібрано так, щоб запуск не виходив за горизонт планування)', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const variant = createMrpVariant(createSeededRandom(`p06:mrp:nonneg:${seed}`));
      for (const id of ['a-release', 'b-release', 'c-release', 'd-release']) {
        const field = variant.answers.find((answer) => answer.id === id)!;
        expect(field.expected).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('умова прямо каже, що запланованих надходжень і резервувань немає (MRP-02 у повній формі)', () => {
    const variant = createMrpVariant(createSeededRandom('p06:mrp:receipts'));
    expect(variant.given.find((item) => item.label === 'Заплановані надходження й резервування')?.value).toBe('немає на жодному рівні');
  });

  it('солюшн має по одному кроку на кожен рівень специфікації (А, B, C, D)', () => {
    const variant = createMrpVariant(createSeededRandom('p06:mrp:solution'));
    expect(variant.solution).toHaveLength(4);
  });

  it('промпт і метод — фіксовані (лише один спосіб розгортання специфікації)', () => {
    const variant = createMrpVariant(createSeededRandom('p06:mrp:method'));
    expect(variant.method).toBe('bom-explosion');
    expect(variant.prompt.length).toBeGreaterThan(0);
  });
});
