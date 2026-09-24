import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { parse } from 'yaml';
import { CALCULATOR_TRAINERS, PRACTICAL_TRAINERS, PUBLISHED_PRACTICALS } from '../../src/components/trainers/catalog';
import { REQUIRED_KEY_FEATURES } from '../../src/engines/matrix';
import { expectNoHorizontalScroll, expectNoSeriousAxeViolations } from './helpers';
import { MATRIX_CONTENT_FILE, MATRIX_PRACTICAL_PATH, answerCurrentFeature, chip, matrix, matrixTotals } from './trainers-helpers';

/**
 * E2E-покриття тренажерів «Операційного менеджменту»: тренажер-матриця пріоритетів і рішень на практичній 2
 * і каталоги — тренажери, практичні, головна (дані каталогів — з src/components/trainers/catalog.ts і
 * course.yaml, тож тести не застарівають з кожною новою практичною). Розрахункові тренажери практичних
 * перевірено на рівні «варіант показано, порожня відповідь не перевіряється»; розрахунки покривають
 * юніт-тести рушіїв. Калькуляторів з власною сторінкою ще немає (`CALCULATOR_TRAINERS` порожній).
 */

const hasMatrixContent = existsSync(MATRIX_CONTENT_FILE);
const COURSE_FILE = new URL('../../content/course.yaml', import.meta.url);

/** Кількість практичних у реєстрі course.yaml — сторінка «Практичні» показує кожну. */
function practicalCount(): number {
  const course = parse(readFileSync(COURSE_FILE, 'utf8')) as { readonly practicals: readonly unknown[] };
  return course.practicals.length;
}

test.describe('практична 2: тренажер-матриця пріоритетів', () => {
  // Тест content-driven: matrixTotals/matrixAnswers читають content/practicals/p02.yaml.
  test.skip(!hasMatrixContent, 'content/practicals/p02.yaml ще не опубліковано');
  test.setTimeout(150_000);

  test('навчальна спроба з розбором → оцінювана без розбору → бал за рубрикою і XP, що зберігаються після перезавантаження', async ({ page }) => {
    const { features: FEATURES, items: MATRIX_ITEMS } = matrixTotals();
    const GRADED_WRONG = Math.min(4, FEATURES);
    const GRADED_RIGHT = MATRIX_ITEMS - GRADED_WRONG;
    const GRADED_XP = Math.round((60 * GRADED_RIGHT) / MATRIX_ITEMS);

    await page.goto(MATRIX_PRACTICAL_PATH);
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
    await expect(page.locator('[data-map-topic="t02"] [data-practicum-state]')).toHaveAttribute('data-practicum-state', 'done');
  });

  test('клавіатура: перевірка без відповідей показує помилку рушія; перетягування картки на модель — альтернатива списку', async ({ page, isMobile }) => {
    await page.goto(MATRIX_PRACTICAL_PATH);
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
    await page.goto(MATRIX_PRACTICAL_PATH);
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
    await page.goto(MATRIX_PRACTICAL_PATH);
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

test.describe('каталоги й інтеграція: тренажери практичних і статус практичних', () => {
  test('головна: розділ тренажерів показує тренажери опублікованих практичних', async ({ page }) => {
    await page.goto('');
    const cards = page.locator('[data-trainers] [data-trainer]');
    await expect(cards).toHaveCount(PRACTICAL_TRAINERS.length + CALCULATOR_TRAINERS.length);
    for (const trainer of PRACTICAL_TRAINERS) {
      await expect(page.locator(`[data-trainers] [data-trainer="${trainer.registryId}"]`)).toBeVisible();
    }
  });

  test('тренажери: у каталозі тренажери опублікованих практичних', async ({ page }) => {
    await page.goto('trenazhery/');
    await expect(page.locator('[data-trainer-card]')).toHaveCount(PRACTICAL_TRAINERS.length + CALCULATOR_TRAINERS.length);
    await expect(page.locator('[data-trainer-card="priorities-matrix"]')).toBeVisible();
    await expect(page.locator('[data-trainer-card="productivity"]')).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoSeriousAxeViolations(page);
  });

  test('практичні: опубліковані позначено, решта готуються', async ({ page }) => {
    await page.goto('praktychni/');
    await expect(page.locator('[data-practical]')).toHaveCount(practicalCount());
    await expect(page.locator('[data-practical][data-status="published"]')).toHaveCount(PUBLISHED_PRACTICALS.length);
    for (const id of PUBLISHED_PRACTICALS) {
      await expect(page.locator(`[data-practical="${id}"]`)).toHaveAttribute('data-status', 'published');
    }
    const pending = page.locator('[data-practical][data-status="pending"]');
    if ((await pending.count()) > 0) await expect(pending.locator('.soon').first()).toContainText('готується');
    await expectNoHorizontalScroll(page);
    await expectNoSeriousAxeViolations(page);
  });
});

/** Практичні з розрахунковими задачами: `practicals[].trainers` без матриці. */
function calculationPracticals(): readonly { readonly id: string; readonly trainers: readonly string[] }[] {
  const course = parse(readFileSync(COURSE_FILE, 'utf8')) as { readonly practicals: readonly { readonly id: string; readonly trainers: readonly string[] }[] };
  return course.practicals.filter((practical) => PUBLISHED_PRACTICALS.includes(practical.id) && !practical.trainers.includes('priorities-matrix'));
}

test.describe('практичні з розрахунковими задачами: усі тренажери на сторінці', () => {
  for (const practical of calculationPracticals()) {
    test(`${practical.id}: кожен тренажер показує варіант і перевіряє порожню відповідь`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`praktychni/${practical.id}/`);
      const tasks = page.locator('#trenazher [data-task]');
      await expect(tasks).toHaveCount(practical.trainers.length);
      if (practical.trainers.length > 1) {
        for (const registryId of practical.trainers) await expect(page.locator(`#trenazher-${registryId}`)).toBeVisible();
      }
      for (const task of await tasks.all()) {
        await expect(task.locator('[data-task-heading]')).toContainText('Варіант 1');
        await task.locator('[data-task-check]').click();
        await expect(task.locator('[data-task-result]')).toHaveCount(0);
      }
      expect(errors).toEqual([]);
      await expectNoHorizontalScroll(page);
      await expectNoSeriousAxeViolations(page);
    });
  }
});

test.describe('посилання каталогу на конкретний тренажер практичної', () => {
  for (const trainer of PRACTICAL_TRAINERS.filter((item) => PUBLISHED_PRACTICALS.includes(item.practicalId) && item.path.includes('#trenazher-'))) {
    test(`${trainer.path}: сторінка прокручується до тренажера, що рендериться в браузері`, async ({ page }) => {
      await page.goto(trainer.path);
      await expect(page.locator(`#${trainer.path.split('#')[1]}`)).toBeInViewport();
    });
  }
});
