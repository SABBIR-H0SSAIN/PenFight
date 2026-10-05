import type { CSSProperties } from "react";
import type { PenKind } from "@/features/pen/types";
export function PenPreview({
  model,
  color,
}: {
  model: PenKind;
  color: string;
}) {
  return (
    <span
      className={`pen-preview pen-${model}`}
      style={{ "--pen-body": color } as CSSProperties}
      aria-hidden="true"
    >
      <span className="cap" />
      <span className="clip" />
      <span className="body" />
      <span className="ring" />
      <span className="end" />
      <span className="tip" />
    </span>
  );
}
