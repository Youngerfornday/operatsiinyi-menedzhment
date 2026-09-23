/**
 * React-острів методички РГР: студент вводить номер залікової книжки → бачить свій варіант
 * вихідних даних на всі чотири етапи (`src/engines/rgr`), може надрукувати. Номер залікової книжки
 * ніде не зберігається, крім localStorage поточного браузера (лише зручність, у try/catch).
 */
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { createRgrVariant, type GradebookError, type RgrVariant } from '../../engines/rgr';
import { GivenSections } from './GivenSections';
import { readStoredGradebookNumber, writeStoredGradebookNumber } from './storage';

export interface RgrVariantExplorerProps {
  /** Заголовки чотирьох етапів у порядку course.yaml → grading.caseProject.stages. */
  readonly stageTitles: readonly [string, string, string, string];
}

function stageSections(variant: RgrVariant): readonly (readonly [string, RgrVariant['stage1']['sections']])[] {
  return [
    ['stage1', variant.stage1.sections],
    ['stage2', variant.stage2.sections],
    ['stage3', variant.stage3.sections],
    ['stage4', variant.stage4.sections],
  ] as const;
}

export function RgrVariantExplorer({ stageTitles }: RgrVariantExplorerProps) {
  const inputId = useId();
  const errorId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const skipNextFocus = useRef(true);

  const [gradebookInput, setGradebookInput] = useState('');
  const [variant, setVariant] = useState<RgrVariant | null>(null);
  const [error, setError] = useState<GradebookError | null>(null);

  useEffect(() => {
    const stored = readStoredGradebookNumber();
    if (stored.length === 0) return;
    setGradebookInput(stored);
    const result = createRgrVariant(stored);
    if (result.ok) setVariant(result.value);
  }, []);

  useEffect(() => {
    if (skipNextFocus.current) {
      skipNextFocus.current = false;
      return;
    }
    if (variant) headingRef.current?.focus();
  }, [variant]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = createRgrVariant(gradebookInput);
    if (result.ok) {
      setVariant(result.value);
      setError(null);
      writeStoredGradebookNumber(gradebookInput.trim());
    } else {
      setVariant(null);
      setError(result.error);
    }
  };

  return (
    <div className="rgr-explorer">
      <form className="rgr-form no-print" onSubmit={handleSubmit} noValidate>
        <label htmlFor={inputId}>Номер залікової книжки</label>
        <div className="rgr-form-row">
          <input
            id={inputId}
            name="gradebook-number"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={gradebookInput}
            onChange={(event) => setGradebookInput(event.target.value)}
            aria-invalid={error !== null}
            aria-describedby={error ? errorId : undefined}
            placeholder="наприклад, 20401267"
          />
          <button type="submit" className="btn btn-primary">
            Показати варіант
          </button>
        </div>
        {error && (
          <p id={errorId} className="rgr-error" role="alert">
            {error.message}
          </p>
        )}
      </form>

      {variant && (
        <div className="rgr-result">
          <div className="rgr-result-head no-print">
            <h3 className="h4" tabIndex={-1} ref={headingRef}>
              Варіант для залікової книжки № {variant.digits}
            </h3>
            <button type="button" className="btn btn-ghost" onClick={() => window.print()}>
              Надрукувати
            </button>
          </div>
          <p className="print-only rgr-print-title">Варіант для залікової книжки № {variant.digits}</p>

          {stageSections(variant).map(([key, sections], index) => (
            <section className="rgr-stage" aria-labelledby={`rgr-stage-${key}`} key={key}>
              <h4 className="h5" id={`rgr-stage-${key}`}>
                {stageTitles[index]}
              </h4>
              <GivenSections sections={sections} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
