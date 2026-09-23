import { describe, expect, it } from 'vitest';
import { GRADEBOOK_ERROR_MESSAGES, parseGradebookNumber, seedForGradebookNumber } from './gradebook';

describe('parseGradebookNumber', () => {
  it('нормалізує номер до самих цифр', () => {
    const result = parseGradebookNumber('2041234567');

    expect(result).toEqual({ ok: true, value: { digits: '2041234567' } });
  });

  it('приймає звичайний і нерозривний пробіл та дефіс як роздільники', () => {
    const result = parseGradebookNumber(' 20 41 23-45 ');

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.digits).toBe('20412345');
  });

  it('приймає en dash, em dash і знак мінуса як роздільники', () => {
    const result = parseGradebookNumber('2040–41—23−45');

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.digits).toBe('2040412345');
  });

  it('крапка й похила риска — не роздільники, а помилка формату', () => {
    const dot = parseGradebookNumber('2040126.7');
    const slash = parseGradebookNumber('2040/1267');

    expect(dot.ok).toBe(false);
    if (!dot.ok) expect(dot.error.code).toBe('invalid-format');
    expect(slash.ok).toBe(false);
    if (!slash.ok) expect(slash.error.code).toBe('invalid-format');
  });

  it('ведучі нулі не впливають на варіант і не показуються', () => {
    const result = parseGradebookNumber('00123400');

    expect(result).toEqual({ ok: true, value: { digits: '123400' } });
  });

  it('номер із самих нулів лишається одним нулем, а не зникає (і зазнає "too-short")', () => {
    const result = parseGradebookNumber('0000000');

    expect(result).toEqual({ ok: false, error: { code: 'too-short', message: GRADEBOOK_ERROR_MESSAGES['too-short'] } });
  });

  it('порожній ввід — помилка "empty"', () => {
    const result = parseGradebookNumber('   ');

    expect(result).toEqual({ ok: false, error: { code: 'empty', message: GRADEBOOK_ERROR_MESSAGES.empty } });
  });

  it('кириличні літери в номері — помилка "invalid-format"', () => {
    const result = parseGradebookNumber('О-123456');

    expect(result).toEqual({ ok: false, error: { code: 'invalid-format', message: GRADEBOOK_ERROR_MESSAGES['invalid-format'] } });
  });

  it('латинські літери в номері — теж помилка "invalid-format"', () => {
    const result = parseGradebookNumber('AB123456');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid-format');
  });

  it('менше MIN_DIGITS значущих цифр — помилка "too-short" (стара звичка «дві останні цифри» не проходить)', () => {
    const result = parseGradebookNumber('67');

    expect(result).toEqual({ ok: false, error: { code: 'too-short', message: GRADEBOOK_ERROR_MESSAGES['too-short'] } });
  });

  it('ведучі нулі не рятують від "too-short": «0067» так само закороткий, як «67»', () => {
    const result = parseGradebookNumber('0067');

    expect(result).toEqual({ ok: false, error: { code: 'too-short', message: GRADEBOOK_ERROR_MESSAGES['too-short'] } });
  });

  it('рівно чотири значущі цифри — межовий валідний випадок', () => {
    const result = parseGradebookNumber('1234');

    expect(result).toEqual({ ok: true, value: { digits: '1234' } });
  });

  it('рівно двадцять цифр — межовий валідний випадок', () => {
    const twentyDigits = '1'.repeat(20);
    const result = parseGradebookNumber(twentyDigits);

    expect(result).toEqual({ ok: true, value: { digits: twentyDigits } });
  });

  it('двадцять одна цифра — помилка "too-long"', () => {
    const result = parseGradebookNumber('1'.repeat(21));

    expect(result).toEqual({ ok: false, error: { code: 'too-long', message: GRADEBOOK_ERROR_MESSAGES['too-long'] } });
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

  it('ведучі нулі не впливають на ключ зерна', () => {
    expect(seedForGradebookNumber('0020401267')).toBe(seedForGradebookNumber('20401267'));
  });
});
