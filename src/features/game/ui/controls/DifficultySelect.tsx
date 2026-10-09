"use client";
import { DIFFICULTIES } from "@/game/ai/catalog.js";
import type { Difficulty } from "@/game/contracts";
export function DifficultySelect({
  value,
  onChange,
  label,
  chips = false,
}: {
  value: Difficulty;
  onChange(value: Difficulty): void;
  label: string;
  chips?: boolean;
}) {
  const keys = Object.keys(DIFFICULTIES) as Difficulty[];
  if (chips)
    return (
      <div className="chips" role="group" aria-label={label}>
        {keys.map((key) => (
          <button
            type="button"
            key={key}
            aria-pressed={value === key}
            onClick={() => onChange(key)}
          >
            <span>{DIFFICULTIES[key].name}</span>
          </button>
        ))}
      </div>
    );
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value as Difficulty)}
    >
      {keys.map((key) => (
        <option key={key} value={key}>
          {DIFFICULTIES[key].name} accuracy
        </option>
      ))}
    </select>
  );
}
