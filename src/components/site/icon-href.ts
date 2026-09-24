/**
 * Посилання на символ спрайта Icons.astro (і CabinetIcons.astro). Шестикутник бренду має id без префікса i-,
 * бо його ж використовує логотип; решта іконок — `i-<name>`. Єдине місце цього правила для Icon.astro,
 * Icon.tsx і progress/dom.ts.
 */
export function iconHref(name: string): string {
  return name === 'hex' ? '#hex' : `#i-${name}`;
}
