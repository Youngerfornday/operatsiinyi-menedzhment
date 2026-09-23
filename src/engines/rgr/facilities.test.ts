import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '../shared/random';
import { pickFacility } from './facilities';

describe('pickFacility', () => {
  it('той самий seed дає ту саму дільницю', () => {
    const first = pickFacility(createSeededRandom('facility:1'));
    const second = pickFacility(createSeededRandom('facility:1'));

    expect(second).toEqual(first);
  });

  it('дає узгоджений підпис типу підприємства', () => {
    const facility = pickFacility(createSeededRandom('facility:2'));

    expect(['переробна промисловість', 'сфера послуг']).toContain(facility.enterpriseTypeLabel);
    expect(facility.enterpriseTypeLabel).toBe(facility.enterpriseType === 'processing' ? 'переробна промисловість' : 'сфера послуг');
  });

  it('перебирає різні дільниці на широкому діапазоні seed', () => {
    const ids = new Set(Array.from({ length: 100 }, (_, index) => pickFacility(createSeededRandom(`facility:${index}`)).id));

    expect(ids.size).toBeGreaterThan(1);
  });
});
