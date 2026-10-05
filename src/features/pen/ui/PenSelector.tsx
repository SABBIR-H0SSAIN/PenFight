"use client";
import { PEN_DEFINITIONS, CUSTOM_PEN_COLORS } from "@/features/pen/catalog.js";
import { PenPreview } from "./PenPreview";
import type { PenKind } from "@/features/pen/types";
import type { PenSelection } from "@/game/state/types";
interface PenSelectorProps {
  value: PenSelection;
  onChange(value: PenSelection): void;
  label: string;
  includePremium?: boolean;
}
export function PenSelector({
  value,
  onChange,
  label,
  includePremium = true,
}: PenSelectorProps) {
  const custom = CUSTOM_PEN_COLORS[value.pen as keyof typeof CUSTOM_PEN_COLORS];
  const color =
    value.colors[value.pen] ||
    custom?.default ||
    PEN_DEFINITIONS[value.pen].color;
  function changeColor(next: string) {
    onChange({ ...value, colors: { ...value.colors, [value.pen]: next } });
  }
  return (
    <section aria-label={label}>
      <div className="chips">
        {(Object.keys(PEN_DEFINITIONS) as PenKind[])
          .filter((key) => includePremium || key !== "premium")
          .map((key) => {
            const pen = PEN_DEFINITIONS[key];
            return (
              <button
                type="button"
                key={key}
                className="pen-opt"
                aria-pressed={key === value.pen}
                onClick={() => onChange({ ...value, pen: key })}
              >
                <PenPreview
                  model={key}
                  color={value.colors[key] || pen.color}
                />
                <span className="pen-copy">
                  {pen.name}
                  <small>{pen.desc}</small>
                </span>
              </button>
            );
          })}
      </div>
      {custom && (
        <div className="pen-color-box">
          <div className="pc-top">
            <strong>{custom.label}</strong>
            <span className="pc-name">{PEN_DEFINITIONS[value.pen].name}</span>
          </div>
          <div className="pc-swatches">
            {custom.swatches.map((swatch) => (
              <button
                key={swatch}
                type="button"
                className={`pc-swatch${color.toLowerCase() === swatch.toLowerCase() ? " on" : ""}`}
                style={{ background: swatch }}
                aria-label={`Choose ${swatch}`}
                aria-pressed={color.toLowerCase() === swatch.toLowerCase()}
                onClick={() => changeColor(swatch)}
              />
            ))}
          </div>
          <div className="pc-row">
            <label className="pc-input-label">
              Pick any colour{" "}
              <input
                className="pc-input"
                type="color"
                value={color}
                onChange={(event) => changeColor(event.target.value)}
              />
            </label>
            <span className="pc-hex">{color}</span>
          </div>
        </div>
      )}
    </section>
  );
}
