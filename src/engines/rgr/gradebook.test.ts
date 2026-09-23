import { describe, expect, it } from 'vitest';
import { GRADEBOOK_ERROR_MESSAGES, displayVariantNumber, parseGradebookNumber, seedForGradebookNumber } from './gradebook';

describe('parseGradebookNumber', () => {
  it('нормалізує номер до самих цифр', () => {
    const result = parseGradebookNumber('2041234567');

    expect(result).toEqual({ ok: true, value: { digits: '2041234567' } });
  });

  it('приймає пробіли й дефіси як роздільники', () => {
    const result = parseGradebookNumber(' 20-41 23 45 ');

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.digits).toBe('20412345');
  });

  it('провідні нулі номера зберігаються (00 на початку чи в середині — не втрачається)', () => {
    const result = parseGradebookNumber('00123400');

    expect(result).toEqual({ ok: true, value: { digits: '00123400' } });
  });

  it('порожній ввід — помилка "empty"', () => {
    const result = parseGradebookNumber('   ');

    expect(result).toEqual({ ok: false, error: { code: 'empty', message: GRADEBOOK_ERROR_MESSAGES.empty } });
  });

  it('кириличні літери в номері — помилка "invalid-format"', () => {
    const result = parseGradebookNumber('О-123456');

    expect(result).toEqual({ ok: false, error: { code: 'invalid-format', message: GRADEBOOK_ERROR_MESSAGES['invalid-format'] } });
  });

  it('латинські літери в номері — теж помилка "invalid-format" (серії в номері немає)', () => {
    const result = parseGradebookNumber('AB123456');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid-format');
  });

  it('менше двох цифр — помилка "too-short"', () => {
    const result = parseGradebookNumber('7');

    expect(result).toEqual({ ok: false, error: { code: 'too-short', message: GRADEBOOK_ERROR_MESSAGES['too-short'] } });
  });

  it('рівно дві цифри — межовий валідний випадок', () => {
    const result = parseGradebookNumber('42');

    expect(result).toEqual({ ok: true, value: { digits: '42' } });
  });
});

describe('seedForGradebookNumber', () => {
  it('той самий номер дає той самий ключ зерна', () => {
    expect(seedForGradebookNumber('20401267')).toBe(seedForGradebookNumber('20401267'));
  });

  it('різні номери дають різні ключі зерна', () => {
    expect(seedForGradebookNumber('20401267')).not.toBe(seedForGradebookNumber('20401268'));
  });

  it('номери з однаковими двома останніми цифрами дають різні ключі зерна (весь номер іде в зерно)', () => {
    expect(seedForGradebookNumber('1112345')).not.toBe(seedForGradebookNumber('9998745'));
  });
});

describe('displayVariantNumber', () => {
  it('той самий номер дає той самий показовий номер варіанта', () => {
    expect(displayVariantNumber('20401267')).toBe(displayVariantNumber('20401267'));
  });

  it('повертає ціле число в діапазоні 1..999 999', () => {
    for (let index = 0; index < 50; index += 1) {
      const value = displayVariantNumber(`${10_000_000 + index}`);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(999_999);
    }
  });

  it('номери з однаковими двома останніми цифрами переважно дають різний показовий номер варіанта', () => {
    // Раніше показовий номер = ці самі дві цифри, тож збіг був стовідсотковим. Тепер це рідкісний виняток.
    const values = Array.from({ length: 300 }, (_, index) => displayVariantNumber(`${1_000_000 + index * 97}67`));
    expect(new Set(values).size).toBeGreaterThan(290);
  });
});
