/** Спільні блоки тренажерів: покроковий розбір, вердикт зі знаком, джерела й формули з датою перевірки, перевірка задачі. */
import type { ReactNode } from 'react';
import { formatDate } from '../../../lib/course-data-pure';
import { Icon } from '../../quiz/Icon';
import type { TaskCheck } from '../model/task-check';
import { useTaskHeadingLevel } from './heading-level';

export function Steps({ title, steps, name }: { readonly title: string; readonly steps: readonly string[]; readonly name: string }) {
  const Heading = `h${useTaskHeadingLevel() + 1}` as 'h4' | 'h5';
  if (steps.length === 0) return null;
  return (
    <div className="steps" data-steps={name}>
      <Heading className="steps-title">{title}</Heading>
      <ol className="steps-list">
        {steps.map((step, index) => (
          <li key={index} className="num">
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}

export interface VerdictProps {
  readonly ok: boolean;
  readonly title: string;
  readonly children?: ReactNode;
  readonly name?: string;
}

/** Вердикт: знак (чек / хрест) з підписом + текст — стан не лише кольором. */
export function Verdict({ ok, title, children, name }: VerdictProps) {
  return (
    <div className={`tverdict ${ok ? 'is-ok' : 'is-err'}`} data-verdict={name} data-state={ok ? 'ok' : 'err'}>
      <Icon name={ok ? 'check' : 'x'} className="icon" />
      <div>
        <strong>{title}</strong>
        {children}
      </div>
    </div>
  );
}

/**
 * Перевірене джерело чи формула тренажера: підручник, стандарт або норма (`RefSchema` контенту —
 * `{ source, locator, checkedAt, url? }`). `locator` уже містить код рядка бази, якщо він є
 * («с. 142, форм. 5.3 (EOQ-01)»), тож окремого поля для коду немає.
 */
export interface SourceRef {
  readonly source: string;
  readonly locator: string;
  readonly checkedAt: string;
  readonly url?: string;
}

export interface SourceItem {
  readonly item: SourceRef;
  /** Що саме дає це джерело чи формула — на розсуд тренажера. */
  readonly text?: string;
  /** Значення з рушія, якщо джерело задає число: «більше 50 % голосуючих акцій». */
  readonly value?: string;
}

export interface SourceNotesProps {
  readonly items: readonly SourceItem[];
  readonly note?: string;
  /** «Джерела» (тексти, норми) або «Формули» (розрахункові залежності) — обирає тренажер. */
  readonly heading?: string;
}

export function SourceNotes({ items, note, heading = 'Джерела' }: SourceNotesProps) {
  return (
    <aside className="tnorms" aria-label={`${heading}, за якими рахує тренажер`}>
      <h4 className="steps-title">{heading}</h4>
      <ul>
        {items.map(({ item, text, value }, index) => (
          <li key={`${item.source}-${item.locator}-${index}`}>
            <Icon name="scale" className="icon icon-sm" />
            <span>
              {value && <b>{value}. </b>}
              {text && <>{text} </>}
              <SourceRefLink item={item} />
            </span>
          </li>
        ))}
      </ul>
      {note && <p className="tnorm-note">{note}</p>}
    </aside>
  );
}

export function CheckParts({ check }: { readonly check: TaskCheck }) {
  return (
    <ul className="tparts" aria-label="Перевірка за частинами">
      {check.parts.map((part) => (
        <li key={part.id} data-part={part.id} data-state={part.correct ? 'ok' : 'err'}>
          <Icon name={part.correct ? 'check' : 'x'} className="icon icon-sm" label={part.correct ? 'правильно' : 'неправильно'} />
          <span>
            <span className="tpart-label">{part.label}</span> <b className="num">{part.given}</b>
            {!part.correct && (
              <span className="tpart-expected">
                {' '}
                — правильно: <b className="num">{part.expected}</b>
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Значення у фабулі задачі: сире число в data-атрибуті, щоб E2E і скрінрідер читали те саме. */
export function TaskValue({ name, raw, children }: { readonly name: string; readonly raw: number; readonly children: ReactNode }) {
  return (
    <b className="num tvalue" data-task-value={name} data-raw={raw}>
      {children}
    </b>
  );
}

/** Посилання на джерело чи формулу поруч із поясненням: локатор, назва джерела і дата перевірки. */
export function SourceRefLink({ item }: { readonly item: SourceRef }) {
  return (
    <span className="tnorm-src" data-source={item.source}>
      {item.url ? (
        <a href={item.url} target="_blank" rel="noopener noreferrer">
          {item.source}, {item.locator}
          <Icon name="external" className="icon icon-sm" label="відкривається в новій вкладці" />
        </a>
      ) : (
        <span>
          {item.source}, {item.locator}
        </span>
      )}
      <span className="verified">
        <Icon name="check" className="icon icon-sm" />
        перевірено {formatDate(item.checkedAt)}
      </span>
    </span>
  );
}
