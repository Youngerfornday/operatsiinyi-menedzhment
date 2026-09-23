import { describe, expect, it } from 'vitest';
import { caseProjectIntroHtml, pointsLabel, practicalIntroHtml } from './html.mjs';

const SITE = 'https://example.github.io/operatsiinyi-menedzhment/';

const practical = {
  id: 'p03',
  goal: 'Мета',
  results: ['Результат'],
  tasks: ['Задача'],
  trainers: ['little-law'],
};

describe('pointsLabel', () => {
  it('узгоджує слово «бал» з числом', () => {
    expect(pointsLabel(1)).toBe('1 бал');
    expect(pointsLabel(3)).toBe('3 бали');
    expect(pointsLabel(5)).toBe('5 балів');
    expect(pointsLabel(15)).toBe('15 балів');
    expect(pointsLabel(40)).toBe('40 балів');
  });
});

describe('practicalIntroHtml', () => {
  it('веде на сторінку своєї практичної, де стоять її тренажери', () => {
    const html = practicalIntroHtml(practical, SITE, 5);
    expect(html).toContain(`href="${SITE}praktychni/p03/"`);
    expect(html).not.toContain('praktykumy');
  });

  it('пише бали з правильним відмінком', () => {
    expect(practicalIntroHtml(practical, SITE, 5)).toContain('Максимум 5 балів.');
  });

  it('без тренажерів не дає посилання', () => {
    expect(practicalIntroHtml({ ...practical, trainers: [] }, SITE, 5)).not.toContain('<a ');
  });
});

describe('caseProjectIntroHtml', () => {
  const caseProject = {
    goal: 'Мета РГР',
    companyCriteria: ['Вимога'],
    stages: [{ title: 'Етап 1', deliverable: 'Результат' }],
  };

  it('не називає вимоги РГР «вимогами до компанії»', () => {
    const html = caseProjectIntroHtml(caseProject, 15);
    expect(html).not.toContain('Вимоги до компанії');
    expect(html).toContain('<h4>Вимоги до роботи</h4>');
    expect(html).toContain('Максимум 15 балів.');
  });
});
