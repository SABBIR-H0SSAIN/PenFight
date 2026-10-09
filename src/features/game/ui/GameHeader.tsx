import Link from "next/link";

export function GameHeader() {
  return (
    <header className="app-header">
      <Link className="app-brand" href="/" aria-label="Pen Fight Arena home">
        <span className="app-brand-mark" aria-hidden="true">
          ✎
        </span>
        <span>Pen Fight Arena</span>
      </Link>
      <span className="app-caption">
        Classroom challenge · play, experiment, and build
      </span>
    </header>
  );
}
