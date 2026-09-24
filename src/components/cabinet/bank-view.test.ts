import { describe, expect, it } from 'vitest';
import { QuestionSchema, type Question } from '../../content/schemas/questions';
import { e2eBankQuestions } from '../quiz/__fixtures__/e2e-bank';
import { bankQuestionView, type BankQuestionView } from './bank-view';

const questions = e2eBankQuestions();

function viewOf(type: Question['type']): BankQuestionView {
  const index = questions.findIndex((question) => question.type === type);
  const question = questions[index];
  if (!question) throw new Error(`У фікстурі немає типу ${type}`);
  return bankQuestionView(question, index);
}

function stemText(view: BankQuestionView): string {
  return view.stem.map((part) => (part.kind === 'answer' ? `[${part.text}]` : part.text)).join('');
}

describe('bankQuestionView', () => {
  it('спільні поля: номер, тип, Блум, бал, джерело з датою перевірки', () => {
    const view = bankQuestionView(questions[0]!, 0);
    expect(view).toMatchObject({ number: 1, typeLabel: 'одиночний вибір', bloomLabel: 'Запам’ятовування', mark: '1 бал' });
    expect(view.refs[0]).toMatchObject({ locator: 'ст. 3', checked: '01.09.2026' });
  });

  it('одиночний вибір: правильний варіант позначено, частковий відсоток не показується для 0 і 100', () => {
    const view = viewOf('multichoice');
    expect(view.answers.filter((a) => a.correct)).toHaveLength(1);
    expect(view.answers.every((a) => a.fraction === undefined)).toBe(true);
  });

  it('множинний вибір: частки й штрафи у відсотках українською', () => {
    const question = QuestionSchema.parse({
      id: 't01-q900',
      type: 'multichoice',
      topic: 't01',
      bloom: 'understand',
      single: false,
      stem: 'Оберіть ознаки корпорації.',
      generalFeedback: 'Дві ознаки.',
      answers: [
        { text: 'Обмежена відповідальність', fraction: 50, feedback: 'Так.' },
        { text: 'Вільне відчуження часток', fraction: 50, feedback: 'Так.' },
        { text: 'Необмежена відповідальність', fraction: -50, feedback: 'Ні.' },
      ],
    });
    const view = bankQuestionView(question, 4);
    expect(view.answers.map((a) => [a.correct, a.fraction])).toEqual([
      [true, '50\u00A0%'],
      [true, '50\u00A0%'],
      [false, '−50\u00A0%'],
    ]);
  });

  it('правда/неправда, числова, розрахунок', () => {
    expect(viewOf('truefalse').correctText).toMatch(/^(Правда|Неправда)$/);
    expect(viewOf('numerical').correctText).toBe('30 ± 0,5');
    expect(viewOf('calculated').correctText).toBe('{n} / {m}, допуск ±1\u00A0%');
  });

  it('відповідність: пари й дистрактори', () => {
    const view = viewOf('matching');
    expect(view.pairs.length).toBeGreaterThan(0);
    expect(view.pairs[0]).toHaveProperty('prompt');
  });

  it('пропуски: відповіді підставлено в текст, невикористані варіанти — дистрактори', () => {
    const view = viewOf('ddwtos');
    expect(stemText(view)).toBe('Операційна система перетворює [ресурси] на [продукцію чи послугу].');
    expect(view.distractors).toEqual(['прибуток']);
  });

  it('Cloze: правильні відповіді підпитань у тексті', () => {
    expect(stemText(viewOf('multianswer'))).toBe(
      'Показник відношення випуску до одного виду витрачених ресурсів називають [частковою продуктивністю]. Якщо цех випустив 500 виробів, витративши 250 людино-годин, часткова продуктивність праці становить [2] виробів за годину.',
    );
  });
});
