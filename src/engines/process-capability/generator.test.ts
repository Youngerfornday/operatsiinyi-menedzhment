import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '../shared/random';
import { createProcessCapabilityVariant } from './generator';

describe('createProcessCapabilityVariant', () => {
  it('той самий сід дає той самий варіант (відтворюваність)', () => {
    const pool = [{ method: 'process-capability' as const }];
    const first = createProcessCapabilityVariant(createSeededRandom('process-capability:1'), pool);
    const second = createProcessCapabilityVariant(createSeededRandom('process-capability:1'), pool);

    expect(first).toEqual(second);
  });

  it('кидає виняток на порожній пул задач', () => {
    expect(() => createProcessCapabilityVariant(createSeededRandom('process-capability:2'), [])).toThrow();
  });

  it('Cpk завжди не більший за Cp', () => {
    const random = createSeededRandom('process-capability:stress');
    const pool = [{ method: 'process-capability' as const }];
    for (let index = 0; index < 20; index += 1) {
      const variant = createProcessCapabilityVariant(random, pool);
      const cp = variant.answers.find((field) => field.id === 'cp');
      const cpk = variant.answers.find((field) => field.id === 'cpk');
      expect(cp && cpk && cpk.expected).toBeLessThanOrEqual((cp?.expected ?? 0) + 0.02);
    }
  });
});
