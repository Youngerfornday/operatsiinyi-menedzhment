import { iconHref } from '../site/icon-href';

/** Іконка зі спрайта Icons.astro для React-островів. Декоративна, якщо немає label. */
interface Props {
  readonly name: string;
  readonly className?: string;
  readonly label?: string;
}

export function Icon({ name, className = 'icon', label }: Props) {
  if (label) {
    return (
      <svg className={className} role="img" aria-label={label}>
        <use href={iconHref(name)} />
      </svg>
    );
  }
  return (
    <svg className={className} aria-hidden="true" focusable="false">
      <use href={iconHref(name)} />
    </svg>
  );
}
