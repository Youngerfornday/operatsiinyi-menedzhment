// Перевірка верстки SVG-рисунків лекцій у справжньому браузері зі шрифтом сайту (Open Sans).
// Підставляє вміст файлу рисунка в сторінку теми (preview-сервер), шукає текст за межами рисунка,
// текст, що виходить за рамку, і накладання тексту; зберігає скриншоти світлої й темної теми.
// Використання: node tools/checks/figure-check.mjs [--shots <dir>] content/modules/m1/t01/fig-03-*.svg ...
// Потрібен запущений `npx astro preview --port 4330` (або BASE=<url>).
import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE ?? 'http://localhost:4330/operatsiinyi-menedzhment/';
const args = process.argv.slice(2);
const shotsAt = args.indexOf('--shots');
const shotsDir = shotsAt >= 0 ? args.splice(shotsAt, 2)[1] : null;
const course = readFileSync('content/course.yaml', 'utf8');
const slugOf = (topic) => course.match(new RegExp(`id: ${topic}\\n\\s+[\\s\\S]*?slug: ([a-z0-9-]+)`))?.[1];

function audit() {
  const res = [];
  const inter = (a, b) => Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  const contains = (o, i, pad = 0) => i.x >= o.x - pad && i.y >= o.y - pad && i.x + i.width <= o.x + o.width + pad && i.y + i.height <= o.y + o.height + pad;
  const svg = document.querySelector('[data-figure-under-check] svg');
  const vb = svg.viewBox.baseVal;
  const r1 = (q) => `${Math.round(q.x)},${Math.round(q.y)} ${Math.round(q.width)}×${Math.round(q.height)}`;
  // Межі в координатах самого рисунка з урахуванням transform груп.
  const toSvg = (el) => { const b = el.getBBox(); const m = svg.getScreenCTM().inverse().multiply(el.getScreenCTM());
    const pts = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]].map(([x, y]) => new DOMPoint(x, y).matrixTransform(m));
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y); return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) }; };
  // Номер-маркер (.refn) навмисно сидить на куті рамки — його не порівнюємо з рамками.
  const texts = [...svg.querySelectorAll('text')].filter((t) => t.textContent.trim()).map((t) => ({ b: toSvg(t), s: t.textContent.trim().slice(0, 50), marker: t.classList.contains('refn') }));
  const rects = [...svg.querySelectorAll('rect')].map((r) => toSvg(r)).filter((r) => r.width > 8 && r.height > 8 && !(r.width >= vb.width - 1 && r.height >= vb.height - 1));
  for (const x of texts) {
    if (x.b.x < vb.x - 1 || x.b.y < vb.y - 1 || x.b.x + x.b.width > vb.x + vb.width + 1 || x.b.y + x.b.height > vb.y + vb.height + 1) res.push(`за межами viewBox ${vb.width}×${vb.height}: «${x.s}» (${r1(x.b)})`);
    if (!x.marker) for (const r of rects) if (inter(x.b, r) > 4 && !contains(r, x.b, 1) && !contains(x.b, r)) res.push(`виходить за рамку ${r1(r)}: «${x.s}» (${r1(x.b)})`);
  }
  const core = (q) => ({ x: q.x + 1, y: q.y + q.height * 0.2, width: q.width - 2, height: q.height * 0.6 });
  for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) if (inter(core(texts[i].b), core(texts[j].b)) > 2) res.push(`накладання: «${texts[i].s}» × «${texts[j].s}»`);
  // Текст не перетинають лінії, стрілки й кружки-маркери (точки на лініях — через getPointAtLength).
  const inside = (q, x, y) => x > q.x && x < q.x + q.width && y > q.y && y < q.y + q.height;
  const strokes = [...svg.querySelectorAll('path, line, polyline')].filter((e) => !e.closest('defs, marker') && getComputedStyle(e).stroke !== 'none');
  const circles = [...svg.querySelectorAll('circle')].map((c) => ({ b: toSvg(c), marker: c.classList.contains('refc') }));
  // Цифра маркера сидить у непрозорому кружку поверх лінії — лінію під ним не видно.
  for (const x of texts.filter((t) => !t.marker)) {
    const c0 = core(x.b);
    for (const e of strokes) {
      const len = e.getTotalLength(); const m = svg.getScreenCTM().inverse().multiply(e.getScreenCTM());
      let hit = false;
      for (let d = 0; d <= len && !hit; d += 2) { const p = new DOMPoint(e.getPointAtLength(d).x, e.getPointAtLength(d).y).matrixTransform(m); hit = inside(c0, p.x, p.y); }
      if (hit) { res.push(`лінія перетинає текст «${x.s}»`); break; }
    }
    for (const c of circles) if (inter(c0, c.b) > 4 && !contains(c.b, x.b, 0)) { res.push(`кружок накладається на текст «${x.s}»`); break; }
  }
  return res;
}

const browser = await chromium.launch();
let failed = 0;
for (const file of args) {
  const markup = readFileSync(file, 'utf8');
  const id = markup.match(/<svg[^>]*\sid="([^"]+)"/)?.[1];
  const topic = id?.match(/fig-(t\d\d)-/)?.[1];
  const slug = topic && slugOf(topic);
  if (!slug) { console.log(`${file}: не вдалося визначити тему за id «${id}»`); failed++; continue; }
  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: theme });
    await page.goto(`${BASE}temy/${slug}/`, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const found = await page.evaluate(({ id, markup }) => {
      const old = document.getElementById(id);
      if (!old) return false;
      old.outerHTML = markup;
      document.getElementById(id).parentElement.setAttribute('data-figure-under-check', '');
      return true;
    }, { id, markup });
    if (!found) { console.log(`${file}: рисунка #${id} немає на сторінці теми (новий? спершу зберіть сайт)`); failed++; await page.close(); break; }
    if (theme === 'light') {
      const issues = await page.evaluate(audit);
      console.log(`${issues.length ? '✘' : '✓'} ${file}${issues.map((i) => `\n    ${i}`).join('')}`);
      if (issues.length) failed++;
    }
    if (shotsDir) {
      mkdirSync(shotsDir, { recursive: true });
      await page.addStyleTag({ content: '.topbar, .reading-progress { display: none !important; }' });
      await page.locator('[data-figure-under-check]').screenshot({ path: path.join(shotsDir, `${id}-${theme}.png`) });
    }
    await page.close();
  }
}
await browser.close();
process.exitCode = failed ? 1 : 0;
