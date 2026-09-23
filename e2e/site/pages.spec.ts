import { expect, test } from '@playwright/test';
import { expectAllReferencesBased, expectNoHorizontalScroll, expectNoSeriousAxeViolations } from './helpers';

const PAGES = [
  { name: 'головна', path: '', heading: 'Операційний менеджмент' },
  { name: 'модуль', path: 'moduli/m1/', heading: /Теоретичні основи організації та регулювання операційної діяльності/ },
  { name: 'тема опублікована', path: 'temy/operatsiinyi-menedzhment-yak-funktsiia/', heading: /Операційний менеджмент як різновид функціонального менеджменту/ },
  { name: 'тема 4 опублікована', path: 'temy/operatsiina-diialnist-resursy-protsesy/', heading: /Операційна діяльність — ресурси, процеси та результати/ },
  { name: 'усі теми', path: 'temy/', heading: 'Теми курсу' },
  { name: 'вітрина компонентів', path: 'rozrobka/komponenty/', heading: 'Вітрина компонентів' },
  { name: 'список тестів', path: 'testy/', heading: 'Тренувальні тести' },
  { name: 'тест теми 1 (фікстурний банк)', path: 'testy/operatsiinyi-menedzhment-yak-funktsiia/', heading: /Тренувальний тест · Тема 1/ },
  { name: 'тест теми 4', path: 'testy/operatsiina-diialnist-resursy-protsesy/', heading: /Тренувальний тест · Тема 4/ },
  { name: 'профіль', path: 'profil/', heading: 'Стажист дільниці' },
  { name: 'РГР', path: 'rgr/', heading: /Операційний план дільниці підприємства/ },
] as const;

for (const item of PAGES) {
  test(`${item.name}: відкривається, українська, посилання з base, без горизонтального скролу, axe без serious`, async ({ page }) => {
    const response = await page.goto(item.path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', 'uk');
    await expect(page.getByRole('heading', { level: 1, name: item.heading })).toBeVisible();
    await expectAllReferencesBased(page);
    await expectNoHorizontalScroll(page);
    await expectNoSeriousAxeViolations(page);
  });
}

test('РГР: номер залікової → варіант за двома останніми цифрами; помилка формату оголошується', async ({ page }) => {
  await page.goto('rgr/');
  const input = page.getByLabel('Номер залікової книжки');
  await input.fill('20-40-1267');
  await page.getByRole('button', { name: 'Показати варіант' }).click();
  await expect(page.getByRole('heading', { level: 3, name: 'Варіант 67' })).toBeFocused();
  await expect(page.locator('.rgr-stage')).toHaveCount(4);
  await expectNoSeriousAxeViolations(page);

  await input.fill('20A1');
  await page.getByRole('button', { name: 'Показати варіант' }).click();
  await expect(page.getByRole('alert')).toContainText('лише цифри');
  await expect(input).toHaveAttribute('aria-invalid', 'true');
});

test('головна: лічильники з реєстру, маршрутна карта з 2 модулів і 8 тем, маршрут 0 із 8', async ({ page }) => {
  await page.goto('');
  const facts = page.locator('dl[aria-label="Обсяг курсу"] dd');
  await expect(facts).toHaveText(['2', '8', '7', '180']);
  await expect(page.locator('[data-agenda] [data-module]')).toHaveCount(2);
  await expect(page.locator('[data-agenda] a.topic')).toHaveCount(8);
  await expect(page.locator('[data-route-label]')).toHaveText('0 із 8 тем');
  await expect(page.locator('[data-route-cells] i')).toHaveCount(8);
  await expect(page.locator('[data-continue-label]')).toHaveText('Почати: Тема 1');
  await expect(page.locator('[data-player-chip]')).toHaveAttribute('data-xp', '0');
});

test('модуль: чотири теми з номерами й посиланнями на сторінки тем', async ({ page }) => {
  await page.goto('moduli/m2/');
  const topics = page.locator('a.topic[data-topic]');
  await expect(topics).toHaveCount(4);
  await expect(topics.first()).toContainText('5.');
  await topics.first().click();
  await expect(page).toHaveURL(/temy\/proektuvannia-operatsiinoi-systemy\/$/);
});

test('тема 1 опублікована: лекція зі змістом, чотирма схемами, самоперевіркою і кнопкою тренувального тесту', async ({ page }) => {
  await page.goto('temy/operatsiinyi-menedzhment-yak-funktsiia/');
  await expect(page.locator('[data-topic-pending]')).toHaveCount(0);
  await expect(page.locator('[data-topic-article]')).toBeVisible();
  expect(await page.locator('[data-topic-article] h2[id]').count()).toBeGreaterThanOrEqual(3);
  await expect(page.locator('[data-topic-article] .figure svg')).toHaveCount(4);
  await expect(page.locator('[data-selfcheck][data-topic="t01"]')).toBeVisible();
  const cta = page.locator('[data-topic-quiz-cta] a');
  await expect(cta).toHaveText(/Пройти тренувальний тест/);
  await cta.click();
  await expect(page).toHaveURL(/testy\/operatsiinyi-menedzhment-yak-funktsiia\/$/);
});

test('SEO: canonical, OG-теги й зображення курсу', async ({ page, request }) => {
  await page.goto('');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://youngerfornday.github.io/operatsiinyi-menedzhment/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/operatsiinyi-menedzhment\/brand\/og-course\.png$/);
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'uk_UA');
  const og = await request.get('brand/og-course.png');
  expect(og.status()).toBe(200);
  expect(Number(og.headers()['content-length'] ?? 0)).toBeGreaterThan(10_000);
});

test('вітрина: службова сторінка noindex і не лінкується з навігації', async ({ page }) => {
  await page.goto('');
  await expect(page.locator('a[href*="rozrobka"]')).toHaveCount(0);
  await page.goto('rozrobka/komponenty/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
});

test('404: невідома адреса показує сторінку курсу з посиланням на головну', async ({ page }) => {
  const response = await page.goto('tsiiei-storinky-nemaie/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1, name: 'Сторінку не знайдено' })).toBeVisible();
  await expectAllReferencesBased(page);
  await page.getByRole('link', { name: 'Перейти на головну сторінку курсу' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Операційний менеджмент' })).toBeVisible();
});
