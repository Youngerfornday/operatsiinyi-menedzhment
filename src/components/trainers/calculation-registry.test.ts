import { describe, expect, it } from 'vitest';
import type { CalculationTask } from '../../content/schemas/practical';
import { calculationTrainerSections } from './calculation-registry';

function task(id: string, method: string): CalculationTask {
  return { id, method, title: 't', formula: 'f', ref: { source: 's', locator: 'l (X-01)', checkedAt: '2026-09-23' } };
}

describe('calculationTrainerSections', () => {
  it('дає одну секцію на реєстрований тренажер, з лише його задачами', () => {
    const tasks = [task('little-law-time', 'little-law'), task('production-cycle', 'production-cycle')];
    const sections = calculationTrainerSections(['little-law', 'production-cycle'], tasks);
    expect(sections.map((section) => section.entry.registryId)).toEqual(['little-law', 'production-cycle']);
    expect(sections[0]!.tasks).toEqual([tasks[0]]);
    expect(sections[1]!.tasks).toEqual([tasks[1]]);
  });

  it('практична з одним тренажером (p01) дає одну секцію з усіма своїми задачами', () => {
    const tasks = [task('partial-labor', 'partial-productivity'), task('capacity-usage', 'capacity-usage')];
    const sections = calculationTrainerSections(['productivity'], tasks);
    expect(sections).toHaveLength(1);
    expect(sections[0]!.tasks).toEqual(tasks);
  });

  it('пропускає реєстрований тренажер без жодної своєї задачі в контенті', () => {
    const sections = calculationTrainerSections(['little-law', 'production-cycle'], [task('little-law-time', 'little-law')]);
    expect(sections.map((section) => section.entry.registryId)).toEqual(['little-law']);
  });

  it('пропускає ID тренажера, якого немає в реєстрі калькуляторів', () => {
    const sections = calculationTrainerSections(['unknown-trainer'], [task('t', 'unknown-method')]);
    expect(sections).toEqual([]);
  });
});
