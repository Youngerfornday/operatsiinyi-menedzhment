import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { REQUIRED_KEY_FEATURES } from '../../src/engines/matrix';
import { expectNoHorizontalScroll, expectNoSeriousAxeViolations } from './helpers';
import { P01_PATH, answerCurrentFeature, chip, matrix, matrixTotals } from './trainers-helpers';

/**
 * E2E-покриття тренажерів, що лишились після переходу на «Операційний менеджмент»: тренажер-матриця
 * (єдиний, що пережив зачистку) і каталоги — тренажери, практичні, головна. Калькулятори (кворум,
 * кумулятивне голосування, дивіденди) і вибір форми бізнесу видалені разом з контентом корпоративного
 * управління; нові калькулятори цієї дисципліни ще не написані (`CALCULATOR_TRAINERS` порожній) —
 * для них тестів поки немає.
 */

const P01_CONTENT_FILE = fileURLToPath(new URL('../../content/practicals/p01.yaml', import.meta.url));
const hasP01Content = existsSync(P01_CONTENT_FILE);

test.describe('практична 1: тренажер-матриця', () => {
  // Дані матриці ще не написані для цієї дисципліни (content/practicals/p01.yaml). Тест лишається
  // content-driven (matrixTotals/matrixAnswers читають той самий файл) — запрацює сам, щойно файл з’явиться.
  test.skip(!hasP01Content, 'content/practicals/p01.yaml ще не опубліковано');
  test.setTimeout(150_000);

  test('навчальна спроба з розбором → оцінювана без розбору → бал за рубрикою і XP, що зберігаються після перезавантаження', async ({ page }) => {
    const { features: FEATURES, items: MATRIX_ITEMS } = matrixTotals();
    const GRADED_WRONG = Math.min(4, FEATURES);
    const GRADED_RIGHT = MATRIX_ITEMS - GRADED_WRONG;
    const GRADED_XP = Math.round((60 * GRADED_RIGHT) / MATRIX_ITEMS);

    await page.goto(P01_PATH);
    await expect(matrix(page)).toHaveAttribute('data-stage', 'learning');
    await expect(chip(page)).toHaveAttribute('data-xp', '0');

    // Спроба 1: після перевірки кожної ознаки відкривається розбір кожної клітинки з джерелом.
    for (let feature = 0; feature < FEATURES; feature += 1) {
      await answerCurrentFeature(page);
      await matrix(page).locator('[data-matrix-check]').click();
      await expect(matrix(page).locator('[data-matrix-review]')).toHaveCount(4);
      await expect(matrix(page).locator('[data-matrix-feature]')).toBeFocused();
      if (feature === 0) {
        await expect(matrix(page).locator('[data-matrix-card]').first()).toHaveAttribute('data-state', 'right');
        await expect(matrix(page).locator('[data-matrix-review] .msrc a').first()).toHaveAttribute('href', /^https:\/\//);
        await expect(matrix(page).locator('[data-matrix-live]')).toContainText('правильно 4 з 4');
      }
      if (feature < FEATURES - 1) await matrix(page).locator('[data-matrix-next]').click();
    }
    await matrix(page).locator('[data-matrix-finish]').click();
    await expect(matrix(page)).toHaveAttribute('data-stage', 'learning-done');
    await expect(page.locator('[data-matrix-stage-heading]')).toBeFocused();
    await expect(matrix(page).locator('[data-matrix-learning-done]')).toContainText(`${MATRIX_ITEMS} з ${MATRIX_ITEMS}`);
    await expect(chip(page)).toHaveAttribute('data-xp', '0');

    // Спроба 2: розбору немає до завершення; по одній хибній відповіді в перших чотирьох ознаках.
    await matrix(page).locator('[data-matrix-start-graded]').click();
    await expect(matrix(page)).toHaveAttribute('data-stage', 'graded');
    await expect(page.locator('[data-matrix-stage-heading]')).toBeFocused();
    await expect(page.locator('[data-matrix-stage-heading]')).toHaveText('Спроба 2 · оцінювана');
    for (let feature = 0; feature < FEATURES; feature += 1) {
      await answerCurrentFeature(page, feature < GRADED_WRONG ? 1 : 0);
      await expect(matrix(page).locator('[data-matrix-review]')).toHaveCount(0);
      if (feature < FEATURES - 1) await matrix(page).locator('[data-matrix-next]').click();
    }
    await matrix(page).locator('[data-matrix-finish]').click();

    await expect(matrix(page)).toHaveAttribute('data-stage', 'result');
    await expect(page.locator('[data-matrix-stage-heading]')).toBeFocused();
    await expect(page.locator('[data-matrix-outcome]')).toContainText(`+${GRADED_XP}`);
    await expect(chip(page)).toHaveAttribute('data-xp', String(GRADED_XP));

    await page.reload();
    await expect(matrix(page)).toHaveAttribute('data-stage', 'recorded');
    await expect(chip(page)).toHaveAttribute('data-xp', String(GRADED_XP));

    // Тренувальний повтор не змінює результат і не дає XP.
    await page.locator('[data-matrix-practice]').click();
    await expect(matrix(page)).toHaveAttribute('data-stage', 'learning');
    await expect(matrix(page)).toHaveAttribute('data-practice', '');

    await page.goto('profil/');
    await expect(page.locator('[data-map-topic="t01"] [data-practicum-state]')).toHaveAttribute('data-practicum-state', 'done');
  });

  test('клавіатура: перевірка без відповідей показує помилку рушія; перетягування картки на модель — альтернатива списку', async ({ page, isMobile }) => {
    await page.goto(P01_PATH);
    const firstSelect = matrix(page).locator('[data-matrix-card] select').first();
    if (!isMobile) {
      // Зони моделей і перша картка в одному екрані: перетягування без прокручування посеред жесту.
      await matrix(page).locator('[data-matrix-feature]').scrollIntoViewIfNeeded();
      const card = matrix(page).locator('[data-matrix-card]').first();
      const dropZone = matrix(page).locator('[data-drop-model]').first();
      const modelId = await dropZone.getAttribute('data-drop-model');
      await card.locator('.mcard-n').dragTo(dropZone);
      await expect(firstSelect).toHaveValue(modelId ?? '');
      await expect(dropZone).toContainText('картки 1');
    }

    const check = matrix(page).locator('[data-matrix-check]');
    await check.focus();
    await page.keyboard.press('Enter');
    await expect(matrix(page).locator('[data-matrix-issue]')).toContainText('Зіставте усі формулювання');

    await firstSelect.focus();
    await expect(firstSelect).toBeFocused();

    await answerCurrentFeature(page);
    await check.focus();
    await page.keyboard.press('Enter');
    await expect(matrix(page).locator('[data-matrix-feature]')).toBeFocused();
    await expect(matrix(page).locator('[data-matrix-nav="0"]')).toHaveAttribute('data-state', 'ok');
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveCount(1);
  });

  test('завдання «визнач модель»: помилка без вибору, розбір ключових ознак після перевірки', async ({ page }) => {
    await page.goto(P01_PATH);
    const task = page.locator('[data-company]').first();
    await task.locator('[data-company-check]').click();
    await expect(task.locator('[data-field-error]')).toContainText('Оберіть модель');
    await task.getByRole('radio').first().check();
    const checkboxes = task.getByRole('checkbox');
    for (let index = 0; index < REQUIRED_KEY_FEATURES; index += 1) await checkboxes.nth(index).check();
    await task.locator('[data-company-check]').click();
    await expect(task).toHaveAttribute('data-state', /right|partial|wrong/);
    expect(await task.locator('[data-company-review] li').count()).toBeGreaterThan(0);
  });

  test('сторінка практичної: рубрика, есе з підказками, дані; axe без serious і без горизонтального скролу', async ({ page }) => {
    await page.goto(P01_PATH);
    expect(await page.locator('table.rubric tbody tr').count()).toBeGreaterThan(0);
    await expect(page.locator('#ese .essay-prompt')).not.toBeEmpty();
    const hints = page.locator('[data-essay-hints]');
    if ((await hints.count()) > 0) {
      await hints.locator('summary').click();
      await expect(hints.locator('ol li').first()).toBeVisible();
    }
    await answerCurrentFeature(page, 1);
    await matrix(page).locator('[data-matrix-check]').click();
    await expect(matrix(page).locator('[data-matrix-card][data-state="wrong"]')).toHaveCount(1);
    await expectNoHorizontalScroll(page);
    await expectNoSeriousAxeViolations(page);
  });
});

test.describe('каталоги й інтеграція: тренажери і практичні готуються', () => {
  test('головна: розділ тренажерів порожній, доки не додано перший калькулятор дисципліни', async ({ page }) => {
    await page.goto('');
    const cards = page.locator('[data-trainers] [data-trainer]');
    await expect(cards).toHaveCount(0);
    await expect(page.locator('[data-trainers]')).toBeVisible();
  });

  test('тренажери: лише матриця моделей у каталозі', async ({ page }) => {
    await page.goto('trenazhery/');
    const cards = page.locator('[data-trainer-card]');
    await expect(cards).toHaveCount(1);
    await expect(page.locator('[data-trainer-card="priorities-matrix"]')).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoSeriousAxeViolations(page);
  });

  test('практичні: усі готуються, жодна ще не опублікована', async ({ page }) => {
    await page.goto('praktychni/');
    await expect(page.locator('[data-practical]')).toHaveCount(8);
    await expect(page.locator('[data-practical][data-status="published"]')).toHaveCount(0);
    await expect(page.locator('[data-practical] .soon').first()).toContainText('готується');
    await expectNoHorizontalScroll(page);
    await expectNoSeriousAxeViolations(page);
  });
});
