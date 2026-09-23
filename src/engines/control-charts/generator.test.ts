import { describe, expect, it } from 'vitest';
import { formatNumber } from '../shared/number-format';
import { createSeededRandom } from '../shared/random';
import { xbarRConstantsFor } from './constants';
import { createControlChartVariant } from './generator';

describe('createControlChartVariant', () => {
  it('той самий сід дає той самий варіант (відтворюваність)', () => {
    const first = createControlChartVariant(createSeededRandom('control-charts:1'), [{ method: 'xbar-r-chart' }]);
    const second = createControlChartVariant(createSeededRandom('control-charts:1'), [{ method: 'xbar-r-chart' }]);

    expect(first).toEqual(second);
  });

  it('кидає виняток на порожній пул задач', () => {
    expect(() => createControlChartVariant(createSeededRandom('control-charts:2'), [])).toThrow();
  });

  it('xbar-r-chart: UCL завжди більший за LCL для обох карт', () => {
    const random = createSeededRandom('control-charts:stress-xbar');
    for (let index = 0; index < 20; index += 1) {
      const variant = createControlChartVariant(random, [{ method: 'xbar-r-chart' }]);
      const byId = Object.fromEntries(variant.answers.map((field) => [field.id, field.expected]));
      expect(byId.uclx).toBeGreaterThan(byId.lclx as number);
      expect(byId.uclr).toBeGreaterThanOrEqual(byId.lclr as number);
      expect(typeof variant.signal.expected).toBe('boolean');
    }
  });

  it('p-chart: LCLp ніколи не від’ємна', () => {
    const random = createSeededRandom('control-charts:stress-p');
    for (let index = 0; index < 20; index += 1) {
      const variant = createControlChartVariant(random, [{ method: 'p-chart' }]);
      const lclp = variant.answers.find((field) => field.id === 'lclp');
      expect(lclp && lclp.expected).toBeGreaterThanOrEqual(0);
    }
  });

  it('xbar-r-chart: умова показує A2/D3/D4 з приміткою про стандартну таблицю, розв’язок — з числом', () => {
    const variant = createControlChartVariant(createSeededRandom('control-charts:constants'), [{ method: 'xbar-r-chart' }]);
    const subgroupSize = Number((variant.given.find((item) => item.label.includes('Розмір підгрупи n')) ?? {}).value);
    const constants = xbarRConstantsFor(subgroupSize);
    expect(constants).not.toBeNull();

    const a2Text = formatNumber(constants?.a2 ?? 0, { maximumFractionDigits: 3 });
    const a2Item = variant.given.find((item) => item.label.startsWith('Коефіцієнт A2'));
    expect(a2Item?.label).toContain('не звірено з підручником викладача');
    expect(a2Item?.value).toBe(a2Text);
    expect(variant.solution.some((step) => step.includes(`${a2Text}·`))).toBe(true);
  });

  it('xbar-r-chart: сигнал поза межами буває і вище UCL, і нижче LCL', () => {
    const random = createSeededRandom('control-charts:direction-xbar');
    const reasons = new Set<string>();
    for (let index = 0; index < 200; index += 1) {
      const variant = createControlChartVariant(random, [{ method: 'xbar-r-chart' }]);
      if (variant.signal.expected) reasons.add(variant.solution.at(-1)?.includes('нижче LCLx̄') ? 'below' : 'above');
    }
    expect(reasons.has('above')).toBe(true);
    expect(reasons.has('below')).toBe(true);
  });

  it('p-chart: «спокійна» точка не завжди рівно round(p̄·n), а сигнал буває нижче LCLp, коли LCLp > 0', () => {
    // Дефектні (defectiveTotal) — двоцифрове-трицифрове число без розрядного пробілу форматування,
    // тож Number() читає його безпечно; підгруп завжди 20 по 100 одиниць — разом 2000 (SUBGROUP_COUNT).
    const random = createSeededRandom('control-charts:direction-p');
    const totalInspected = 2000;
    const quietOffsets = new Set<number>();
    const reasons = new Set<string>();
    for (let index = 0; index < 300; index += 1) {
      const variant = createControlChartVariant(random, [{ method: 'p-chart' }]);
      const defectives = Number(variant.given.find((item) => item.label.startsWith('Дефектних у новій підгрупі'))?.value);
      const defectiveTotal = Number(variant.given.find((item) => item.label === 'Дефектних одиниць за всіма підгрупами')?.value);
      const meanProportion = defectiveTotal / totalInspected;
      if (!variant.signal.expected) quietOffsets.add(defectives - Math.round(meanProportion * 100));
      if (variant.signal.expected) reasons.add(variant.solution.at(-1)?.includes('нижче LCLp') ? 'below' : 'above');
    }
    expect(quietOffsets.size).toBeGreaterThan(1);
    expect(reasons.has('above')).toBe(true);
    expect(reasons.has('below')).toBe(true);
  });

  it('двадцять варіантів обома методами поспіль завжди дають узгоджений сигнал розладнання', () => {
    const random = createSeededRandom('control-charts:mixed');
    for (let index = 0; index < 20; index += 1) {
      const variant = createControlChartVariant(random, [{ method: 'xbar-r-chart' }, { method: 'p-chart' }]);
      expect(variant.given.length).toBeGreaterThan(0);
      expect(variant.solution.length).toBeGreaterThan(0);
      expect(variant.signal.id).toBe('signal');
    }
  });
});
