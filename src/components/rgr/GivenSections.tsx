/** Таблиці вихідних даних одного етапу варіанта РГР (`GivenSection[]` рушія `src/engines/rgr`). */
import { Fragment } from 'react';
import type { GivenSection } from '../../engines/rgr';

export interface GivenSectionsProps {
  readonly sections: readonly GivenSection[];
}

export function GivenSections({ sections }: GivenSectionsProps) {
  return (
    <>
      {sections.map((section) => (
        <div className="card rgr-section" key={section.title}>
          <h4 className="h5">{section.title}</h4>
          <dl className="kv">
            {section.rows.map((row, index) => (
              <Fragment key={`${row.label}-${index}`}>
                <dt>{row.label}</dt>
                <dd className="num">{row.value}</dd>
              </Fragment>
            ))}
          </dl>
        </div>
      ))}
    </>
  );
}
