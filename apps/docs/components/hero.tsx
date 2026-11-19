import Link from 'next/link';

/**
 * The first page's opening: what Builderset is in one line, the two ways in,
 * and a document assembling itself from blocks (pure CSS — global.css, .bs-hero).
 */
export function Hero() {
  return (
    <div className="bs-hero not-prose">
      <div className="bs-hero-text">
        <p className="bs-eyebrow">Visual editors, your stack</p>
        <p className="bs-hero-title">
          Let your users design emails and articles —{' '}
          <span className="bs-gradient">inside your own app.</span>
        </p>
        <p className="bs-hero-lead">
          Builderset gives you the editor, the renderer and the checker. Your theme, your language,
          your database.
        </p>
        <div className="bs-hero-actions">
          <Link className="bs-button" href="/docs/quick-start/email">
            Quick start
            <span aria-hidden="true">→</span>
          </Link>
          <Link className="bs-button ghost" href="/playground">
            Try the playground
          </Link>
        </div>
      </div>
      <div className="bs-stack" aria-hidden="true">
        <div className="bs-doc">
          <span className="row r1" />
          <span className="row r2" />
          <span className="split">
            <span className="cell c1" />
            <span className="cell c2" />
          </span>
          <span className="row r3" />
          <span className="btn" />
        </div>
      </div>
    </div>
  );
}
