import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { CALCULATION_TRAINER_COMPONENTS } from '../PracticalCalculationTrainers';
import { CALCULATION_TRAINER_METHODS } from './calculation-methods';

interface PracticalFile {
  readonly id: string;
  readonly trainer: { readonly kind: string; readonly tasks?: readonly { readonly method: string }[] };
}

const PRACTICALS_DIR = new URL('../../../../content/practicals/', import.meta.url);
const course = parse(readFileSync(new URL('../../../../content/course.yaml', import.meta.url), 'utf8')) as {
  readonly practicals: readonly { readonly id: string; readonly trainers: readonly string[] }[];
};
const calculationFiles = readdirSync(PRACTICALS_DIR)
  .filter((name) => name.endsWith('.yaml'))
  .map((name) => parse(readFileSync(new URL(name, PRACTICALS_DIR), 'utf8')) as PracticalFile)
  .filter((file) => file.trainer.kind === 'calculation-tasks');

describe('розрахункові задачі практичних', () => {
  it('у кожного тренажера з таблицею методів є острів, і навпаки', () => {
    expect(Object.keys(CALCULATION_TRAINER_COMPONENTS).sort()).toEqual(Object.keys(CALCULATION_TRAINER_METHODS).sort());
  });

  it.each(calculationFiles.map((file) => [file.id, file] as const))('%s: кожну задачу бере якийсь тренажер практичної, і кожен тренажер має задачу', (id, file) => {
    // Arrange
    const trainers = course.practicals.find((practical) => practical.id === id)?.trainers ?? [];
    const methodsOf = (registryId: string) => CALCULATION_TRAINER_METHODS[registryId] ?? [];
    const methods = (file.trainer.tasks ?? []).map((task) => task.method);

    // Act
    const orphans = methods.filter((method) => !trainers.some((registryId) => methodsOf(registryId).includes(method)));
    const idle = trainers.filter((registryId) => !methods.some((method) => methodsOf(registryId).includes(method)));

    // Assert
    expect(orphans).toEqual([]);
    expect(idle).toEqual([]);
  });
});
