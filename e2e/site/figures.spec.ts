import { expect, test } from '@playwright/test';

/**
 * Рисунки лекцій — рукописні SVG з координатами під конкретний шрифт. Сайт малює текст шрифтом Open Sans,
 * тож підпис, розрахований на вужчий шрифт, вилазить із рамки, за край рисунка або на сусідній підпис.
 * Тест вимірює справжні межі тексту в браузері. Окремий рисунок перевіряє tools/checks/figure-check.mjs.
 */

function auditFigures(): string[] {
  const issues: string[] = [];
  type Box = { x: number; y: number; width: number; height: number };
  const overlap = (a: Box, b: Box) =>
    Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  const contains = (outer: Box, inner: Box, pad: number) =>
    inner.x >= outer.x - pad && inner.y >= outer.y - pad && inner.x + inner.width <= outer.x + outer.width + pad && inner.y + inner.height <= outer.y + outer.height + pad;
  const core = (box: Box): Box => ({ x: box.x + 1, y: box.y + box.height * 0.2, width: box.width - 2, height: box.height * 0.6 });

  for (const svg of document.querySelectorAll<SVGSVGElement>('.figure svg.scheme')) {
    const view = svg.viewBox.baseVal;
    const toSvg = (element: SVGGraphicsElement): Box => {
      const box = element.getBBox();
      const matrix = svg.getScreenCTM()!.inverse().multiply(element.getScreenCTM()!);
      const corners = [[box.x, box.y], [box.x + box.width, box.y], [box.x, box.y + box.height], [box.x + box.width, box.y + box.height]].map(([x, y]) => new DOMPoint(x, y).matrixTransform(matrix));
      const xs = corners.map((point) => point.x);
      const ys = corners.map((point) => point.y);
      return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
    };
    // Номер-маркер (.refn) навмисно сидить на куті рамки — з рамками його не порівнюємо.
    const texts = [...svg.querySelectorAll('text')]
      .filter((text) => text.textContent?.trim())
      .map((text) => ({ box: toSvg(text), marker: text.classList.contains('refn'), label: `${svg.id}: «${text.textContent?.trim().slice(0, 40)}»` }));
    const rects = [...svg.querySelectorAll('rect')]
      .map((rect) => toSvg(rect))
      .filter((rect) => rect.width > 8 && rect.height > 8 && !(rect.width >= view.width - 1 && rect.height >= view.height - 1));
    for (const { box, marker, label } of texts) {
      if (!contains(view, box, 1)) issues.push(`${label} за межами рисунка`);
      if (!marker && rects.some((rect) => overlap(box, rect) > 4 && !contains(rect, box, 1) && !contains(box, rect, 0))) issues.push(`${label} виходить за рамку`);
    }
    texts.forEach((first, index) => {
      for (const second of texts.slice(index + 1)) if (overlap(core(first.box), core(second.box)) > 2) issues.push(`${first.label} накладається на ${second.label}`);
    });
  }
  return issues;
}

test('рисунки всіх лекцій: текст не виходить за рамки й межі рисунка і не накладається', async ({ page }) => {
  await page.goto('temy/');
  const hrefs = await page.locator('main a[href]').evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
  const lectures = [...new Set(hrefs.filter((href) => /\/temy\/[a-z0-9-]+\/$/.test(href)))];
  expect(lectures.length).toBeGreaterThanOrEqual(8);

  const issues: string[] = [];
  for (const lecture of lectures) {
    await page.goto(lecture);
    await page.evaluate(() => document.fonts.ready);
    issues.push(...(await page.evaluate(auditFigures)));
  }
  expect(issues).toEqual([]);
});
