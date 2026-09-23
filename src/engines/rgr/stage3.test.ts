import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '../shared/random';
import { computeCpm } from './network';
import { createStage1 } from './stage1';
import { createStage3 } from './stage3';

describe('createStage3', () => {
  it('той самий seed і stage1 дають ті самі дані', () => {
    const stage1 = createStage1(createSeededRandom('stage3:base'));
    const first = createStage3(createSeededRandom('stage3:1'), stage1);
    const second = createStage3(createSeededRandom('stage3:1'), stage1);

    expect(second).toEqual(first);
  });

  it('дає розв’язні дані запасів, специфікації й графіка на широкому діапазоні seed', () => {
    for (let seed = 0; seed < 300; seed += 1) {
      const stage1 = createStage1(createSeededRandom(`stage3:s1:${seed}`));
      const stage3 = createStage3(createSeededRandom(`stage3:${seed}`), stage1);

      expect(stage3.inventory.annualDemand).toBeGreaterThan(0);
      expect(stage3.masterScheduleWeeks).toHaveLength(6);
      expect(stage3.bom.length).toBeGreaterThan(0);
      const { projectDuration } = computeCpm(stage3.network);
      expect(projectDuration).toBeGreaterThan(0);
    }
  });

  it('має чотири розділи вихідних даних у стабільному порядку', () => {
    const stage1 = createStage1(createSeededRandom('stage3:sections'));
    const stage3 = createStage3(createSeededRandom('stage3:sections'), stage1);

    expect(stage3.sections.map((section) => section.title)).toEqual([
      'Запаси: параметри EOQ, точки замовлення й страхового запасу',
      'Тижневий план випуску готового виробу (для розвертання специфікації)',
      'Специфікація виробу (BOM)',
      'Сітьовий графік упровадження',
    ]);
  });
});
