import Image from "next/image";

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand-logo${compact ? " brand-logo--compact" : ""}`}>
      <Image
        className="brand-logo-mark"
        src="/brand/penfight-mark.svg"
        width={128}
        height={128}
        alt=""
        loading="eager"
      />
      <span className="brand-logo-type">
        <span className="brand-logo-name">
          Pen<span>Fight</span>
        </span>
        <span className="brand-logo-arena">Arena</span>
      </span>
    </span>
  );
}
