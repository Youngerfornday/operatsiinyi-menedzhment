import { describe, expect, it } from 'vitest';
import { gradebookPlan } from './build-plan.mjs';

const grading = {
  categories: [
    { id: 'attendance', title: 'Присутність та активність на лекціях', items: 2, pointsPerItem: 5 },
    { id: 'practicals', title: 'Практичні роботи', items: 7, pointsPerItem: 5 },
    { id: 'case-project', title: 'Розрахунково-графічна робота', items: 1, pointsPerItem: 15 },
    { id: 'final-test', title: 'Екзамен у формі тестування', items: 1, pointsPerItem: 40 },
  ],
};
const refs = ['assign:p01', 'assign:p02', 'assign:case', 'quiz:final', 'scorm:p02-matrix'];

describe('gradebookPlan', () => {
  it('категорія без елементів курсу отримує ручні оцінки, і ваги дають 100', () => {
    const categories = gradebookPlan(grading, refs);
    const attendance = categories.find((category) => category.name === grading.categories[0].title);
    expect(attendance).toEqual({
      name: 'Присутність та активність на лекціях',
      weight: 10,
      refs: [],
      manualItems: [
        { name: 'Присутність та активність на лекціях — модуль 1', max: 5 },
        { name: 'Присутність та активність на лекціях — модуль 2', max: 5 },
      ],
    });
    const total = categories.reduce((sum, category) => sum + category.weight, 0);
    expect(total).toBe(100);
  });

  it('категорії з елементами курсу не мають ручних оцінок, тренажери — окремо з вагою 0', () => {
    const categories = gradebookPlan(grading, refs);
    expect(categories.find((category) => category.name === 'Практичні роботи')).toEqual({
      name: 'Практичні роботи',
      weight: 35,
      refs: ['assign:p01', 'assign:p02'],
      manualItems: [],
    });
    expect(categories.at(-1)).toEqual({ name: 'Тренажери (поза підсумком)', weight: 0, refs: ['scorm:p02-matrix'], manualItems: [] });
  });
});
