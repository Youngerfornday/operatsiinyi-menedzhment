/**
 * Останній уведений номер залікової книжки — лише зручність (щоб не вводити його знову після
 * перезавантаження сторінки), не джерело істини. Сховище недоступне (приватний режим, вимкнене
 * localStorage) — острів просто починає з порожнього поля.
 */
const RGR_GRADEBOOK_STORAGE_KEY = 'om:v1:rgr-gradebook';

export function readStoredGradebookNumber(): string {
  try {
    return localStorage.getItem(RGR_GRADEBOOK_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function writeStoredGradebookNumber(value: string): void {
  try {
    localStorage.setItem(RGR_GRADEBOOK_STORAGE_KEY, value);
  } catch {
    // Сховище недоступне: номер живе лише в стані острова до перезавантаження сторінки.
  }
}
