import Link from "next/link";
import { BrandLogo } from "./BrandLogo";

export function GameHeader() {
  return (
    <header className="app-header">
      <Link className="app-brand" href="/" aria-label="Pen Fight Arena home">
        <BrandLogo compact />
      </Link>
    </header>
  );
}
