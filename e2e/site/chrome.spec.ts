import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll } from './helpers';

test.describe('перемикач теми', () => {
  test('перемикає data-theme і зберігає вибір у localStorage під ключем om:v1:theme; без мерехтіння після перезавантаження', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('');
    const toggle = page.locator('[data-theme-toggle]').first();
    await expect(toggle).toHaveAttribute('aria-label', 'Увімкнути темну тему');

    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(toggle).toHaveAttribute('aria-label', 'Увімкнути світлу тему');
    expect(await page.evaluate(() => localStorage.getItem('om:v1:theme'))).toBe('dark');

    await page.reload();
    // Inline-скрипт у <head> ставить атрибут до першого рендеру: тема відома вже на document.readyState=loading
    const early = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(early).toBe('dark');
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe('rgb(11, 20, 36)');

    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
});

test.describe('мобільне меню', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) > 1280, 'меню є лише на вузьких екранах');

  test('відкривається з клавіатури, тримає фокус, закривається Esc і повертає фокус на кнопку', async ({ page }) => {
    await page.goto('');
    const button = page.locator('[data-menu-open]');
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.nav')).toBeHidden();

    await button.focus();
    await page.keyboard.press('Enter');
    const dialog = page.locator('#site-menu');
    await expect(dialog).toBeVisible();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(dialog.getByRole('link', { name: /^Теми/ })).toBeVisible();

    // Tab кілька разів не виходить за межі меню (модальний dialog робить решту сторінки inert)
    for (let i = 0; i < 12; i += 1) await page.keyboard.press('Tab');
    const focusInside = await page.evaluate(() => document.activeElement?.closest('#site-menu') !== null);
    expect(focusInside).toBe(true);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(button).toBeFocused();
  });

  test('посилання «Теми» з меню веде на сторінку тем', async ({ page }) => {
    await page.goto('');
    await page.locator('[data-menu-open]').click();
    await page.locator('#site-menu').getByRole('link', { name: /^Теми/ }).click();
    await expect(page).toHaveURL(/\/temy\/$/);
  });
});

test.describe('шапка на десктопі', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) <= 1280, 'навігація видима лише на широких екранах');

  test('навігація видима, поточний розділ позначено, кнопка меню схована', async ({ page }) => {
    await page.goto('temy/');
    await expect(page.locator('.nav a[aria-current="page"]')).toHaveText('Теми');
    await expect(page.locator('[data-menu-open]')).toBeHidden();
    await expect(page.locator('.nav .nav-soon')).toHaveCount(1);
    await expect(page.locator('.nav a[href$="/trenazhery/"]')).toHaveText('Тренажери');
    await expect(page.locator('.nav a[href$="/testy/"]')).toHaveText('Тести');
  });
});

test('вітрина: підказка терміна відкривається кнопкою і закривається Esc; самоперевірка відкриває розбір', async ({ page }) => {
  await page.goto('rozrobka/komponenty/');
  const term = page.locator('button.term[data-term="operations-system"]').first();
  await term.click();
  const pop = page.locator('#pop-operations-system');
  await expect(pop).toBeVisible();
  await expect(term).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(pop).toBeHidden();

  const selfcheck = page.locator('[data-selfcheck]');
  const answered = page.evaluate(() => new Promise<{ correct: boolean }>((resolve) => document.addEventListener('om:selfcheck', (e) => resolve((e as CustomEvent).detail), { once: true })));
  await selfcheck.locator('.sc-q').first().locator('.opt').nth(1).click();
  expect((await answered).correct).toBe(false);
  await expect(selfcheck.locator('.sc-q').first().locator('.options')).toHaveAttribute('data-answered', '');
  await expect(selfcheck.locator('.sc-q').first().locator('.opt-why').first()).toBeVisible();

  await page.locator('[data-demo-toast]').click();
  await expect(page.locator('#toast')).toHaveAttribute('data-show', '');
});

test('шапка на ширинах 1024–1920 px: пункти меню, перемикач ролі й чип гравця не накладаються, чип в один рядок', async ({ page }) => {
  const problems: string[] = [];
  for (const width of [1024, 1152, 1280, 1296, 1344, 1400, 1440, 1536, 1600, 1920]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('');
    const found = await page.evaluate(() => {
      const items = [...document.querySelectorAll<HTMLElement>('.topbar-in > *, .topbar-actions > *, .nav > *')].filter((item) => item.getBoundingClientRect().width > 0);
      const hits: string[] = [];
      items.forEach((first, index) => {
        for (const second of items.slice(index + 1)) {
          if (first.contains(second) || second.contains(first)) continue;
          const a = first.getBoundingClientRect();
          const b = second.getBoundingClientRect();
          if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) hits.push(`«${first.textContent?.trim()}» × «${second.textContent?.trim()}»`);
        }
      });
      const chip = document.querySelector('.topbar-actions > .me');
      if (chip && chip.getBoundingClientRect().height > 48) hits.push('чип гравця переноситься на два рядки');
      return hits;
    });
    problems.push(...found.map((hit) => `${width}px: ${hit}`));
  }
  expect(problems).toEqual([]);
});

test('великий шрифт у налаштуваннях браузера (24 px): шапка й головна без накладань і горизонтального скролу', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Page.setFontSizes', { fontSizes: { standard: 24 } });
  for (const width of [390, 700, 1024, 1600]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('');
    const header = page.locator('.topbar-in');
    const { scrollWidth, clientWidth } = await header.evaluate((element) => ({ scrollWidth: element.scrollWidth, clientWidth: element.clientWidth }));
    expect(scrollWidth, `шапка на ${width}px`).toBeLessThanOrEqual(clientWidth + 1);
    await expectNoHorizontalScroll(page);
  }
});
