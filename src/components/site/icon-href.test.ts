import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { iconHref } from './icon-href';

const SRC = path.resolve(__dirname, '../..');
const SPRITES = ['components/site/Icons.astro', 'components/cabinet/CabinetIcons.astro'];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(astro|tsx)$/.test(entry.name) && !entry.name.includes('.test.') ? [full] : [];
  });
}

const symbolIds = new Set(SPRITES.flatMap((file) => [...readFileSync(path.join(SRC, file), 'utf8').matchAll(/<symbol id="([^"]+)"/g)].map((match) => match[1])));

/** Літеральні `<Icon name="…">` у розмітці — динамічні імена сюди не потрапляють. */
const usedNames = new Map<string, string>();
for (const file of sourceFiles(SRC)) {
  for (const match of readFileSync(file, 'utf8').matchAll(/<Icon\b[^>]*?\sname="([a-z0-9-]+)"/g)) {
    usedNames.set(match[1] ?? '', path.relative(SRC, file));
  }
}

describe('iconHref', () => {
  it('веде шестикутник на #hex, решту — на #i-<name>', () => {
    expect(iconHref('hex')).toBe('#hex');
    expect(iconHref('check')).toBe('#i-check');
  });

  it('кожна літеральна іконка в розмітці має символ у спрайті', () => {
    expect(usedNames.size).toBeGreaterThan(10);
    const missing = [...usedNames].filter(([name]) => !symbolIds.has(iconHref(name).slice(1))).map(([name, file]) => `${name} (${file})`);
    expect(missing).toEqual([]);
  });

  it('усі три рендерери іконок будують посилання через iconHref, а не вручну', () => {
    for (const file of ['components/site/Icon.astro', 'components/quiz/Icon.tsx', 'components/progress/dom.ts']) {
      const source = readFileSync(path.join(SRC, file), 'utf8');
      expect(source, file).toContain('iconHref(name)');
      expect(source, file).not.toContain('#i-${');
    }
  });
});
