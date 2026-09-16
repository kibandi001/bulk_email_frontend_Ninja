import type { ReactNode } from 'react';
import './Card.css';

export function Card({
  title,
  eyebrow,
  actions,
  children,
}: {
  title?: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="card">
      <span className="card__tick card__tick--tl" aria-hidden="true" />
      <span className="card__tick card__tick--br" aria-hidden="true" />
      {(title || actions) && (
        <header className="card__head">
          <div>
            {eyebrow && <p className="card__eyebrow">{eyebrow}</p>}
            {title && <h3 className="card__title">{title}</h3>}
          </div>
          {actions && <div className="card__actions">{actions}</div>}
        </header>
      )}
      <div className="card__body">{children}</div>
    </section>
  );
}
