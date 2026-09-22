import { describe, expect, it } from 'vitest';
import { course, file } from '../__fixtures__/baseline.mjs';
import { caseAliases, caveatTargets, checkCaseCaveats } from './case-caveats.mjs';

describe('checkCaseCaveats', () => {
  it('reports a causal link where the caveat demands parallel facts', () => {
    const practical = file('content/practicals/p01.yaml', [
      'trainer:',
      '  features:',
      '    - id: f1',
      '      cells:',
      '        - model: japanese',
      '          explanation: Рада Toyota змінила виробничі процеси через причини, повʼязані з конкуренцією.',
    ]);
    const findings = checkCaseCaveats([practical], course.cases);
    expect(findings).toMatchObject([{ level: 'error', rule: 'case-caveat', line: 6 }]);
    expect(findings[0].message).toContain('toyota-tps');
    expect(findings[0].hint).toContain('паралельні');
  });

  it('accepts parallel facts and a bare mention of the entity without a causal marker', () => {
    const clean = file('content/modules/m1/t01/lecture.mdx', [
      'Того ж року Toyota впровадила нові виробничі процеси; частка ринку зросла водночас з іншими змінами.',
      '',
      'Toyota Production System описано в багатьох підручниках з операційного менеджменту.',
    ]);
    expect(checkCaseCaveats([clean], course.cases)).toEqual([]);
  });

  it('skips the caveat field itself', () => {
    const registry = file('content/course.yaml', ['cases:', '  - id: toyota-tps', '    caveat: Toyota змінила процеси через причини — але це саме застереження.']);
    expect(checkCaseCaveats([registry], course.cases)).toEqual([]);
  });

  it('derives entity names from the registry title', () => {
    expect(caseAliases('Toyota — впровадження Toyota Production System')).toEqual(['toyota']);
    expect(caseAliases('Завод «Мотордеталь» — перехід на статистичний контроль процесів')).toEqual(['мотордеталь']);
    expect(caveatTargets('Причинний зв’язок між впровадженням TPS і зростанням частки ринку Toyota джерелами не встановлено.', ['toyota'])).toEqual(['причин']);
  });

  it('does nothing when no case has a machine-checkable caveat', () => {
    expect(checkCaseCaveats([file('content/x.yaml', ['a: b'])], [{ id: 'x', title: 'X', caveat: 'Просто обережно.' }])).toEqual([]);
  });
});
