import { describe, expect, it } from 'vitest';
import { GRADEBOOK_ERROR_MESSAGES, parseGradebookNumber, seedForVariant } from './gradebook';

describe('parseGradebookNumber', () => {
  it('визначає варіант за останніми двома цифрами номера', () => {
    const result = parseGradebookNumber('2041234567');

    expect(result).toEqual({ ok: true, value: { digits: '2041234567', variantNumber: 67 } });
  });

  it('приймає пробіли й дефіси як роздільники', () => {
    const result = parseGradebookNumber(' 20-41 23 45 ');

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.digits).toBe('20412345');
  });

  it('00 наприкінці номера відповідає варіанту 100', () => {
    const result = parseGradebookNumber('123400');

    expect(result).toEqual({ ok: true, value: { digits: '123400', variantNumber: 100 } });
  });

  it('однакові останні дві цифри дають однаковий варіант для різних номерів', () => {
    const first = parseGradebookNumber('1112345');
    const second = parseGradebookNumber('9998745');

    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) expect(first.value.variantNumber).toBe(second.value.variantNumber);
  });

  it('порожній ввід — помилка "empty"', () => {
    const result = parseGradebookNumber('   ');

    expect(result).toEqual({ ok: false, error: { code: 'empty', message: GRADEBOOK_ERROR_MESSAGES.empty } });
  });

  it('літери в номері — помилка "invalid-format"', () => {
    const result = parseGradebookNumber('О-123456');

    expect(result).toEqual({ ok: false, error: { code: 'invalid-format', message: GRADEBOOK_ERROR_MESSAGES['invalid-format'] } });
  });

  it('менше двох цифр — помилка "too-short"', () => {
    const result = parseGradebookNumber('7');

    expect(result).toEqual({ ok: false, error: { code: 'too-short', message: GRADEBOOK_ERROR_MESSAGES['too-short'] } });
  });

  it('рівно дві цифри — межовий валідний випадок', () => {
    const result = parseGradebookNumber('42');

    expect(result).toEqual({ ok: true, value: { digits: '42', variantNumber: 42 } });
  });
});

describe('seedForVariant', () => {
  it('той самий номер варіанта дає той самий ключ зерна', () => {
    expect(seedForVariant(42)).toBe(seedForVariant(42));
  });

  it('різні номери варіантів дають різні ключі зерна', () => {
    expect(seedForVariant(1)).not.toBe(seedForVariant(2));
  });
});
