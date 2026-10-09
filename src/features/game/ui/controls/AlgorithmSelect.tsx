"use client";
import { ALGORITHMS } from "@/game/ai/catalog.js";
import type { Algorithm } from "@/game/state/types";
export function AlgorithmSelect({
  value,
  onChange,
  label,
  auto = false,
}: {
  value: Algorithm | "auto";
  onChange(value: Algorithm | "auto"): void;
  label: string;
  auto?: boolean;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value as Algorithm | "auto")}
    >
      {auto && <option value="auto">Auto (by difficulty)</option>}
      {(Object.keys(ALGORITHMS) as Algorithm[]).map((key) => (
        <option key={key} value={key}>
          {ALGORITHMS[key]}
        </option>
      ))}
    </select>
  );
}
