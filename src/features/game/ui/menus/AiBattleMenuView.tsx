"use client";
import { CONFIG_LIMITS } from "@/config/config";
import {
  useGamePreferences,
  useGameServices,
} from "@/features/game/runtime/GameProvider";
import { PenSelector } from "@/features/pen/ui/PenSelector";
import { AlgorithmSelect } from "@/features/game/ui/controls/AlgorithmSelect";
import { MenuPage } from "./MenuPage";
export function AiBattleMenuView() {
  const services = useGameServices();
  const { preferences, setPreferences } = useGamePreferences();
  const value = preferences.ai;
  const update = (patch: Partial<typeof value>) =>
    setPreferences({ ...preferences, ai: { ...value, ...patch } });
  return (
    <MenuPage view="aivai" title="AI Battle">
      <div className="two">
        <label className="f">
          AI A
          <AlgorithmSelect
            label="AI A algorithm"
            value={value.a}
            onChange={(a) => {
              if (a !== "auto") update({ a });
            }}
          />
        </label>
        <label className="f">
          AI B
          <AlgorithmSelect
            label="AI B algorithm"
            value={value.b}
            onChange={(b) => {
              if (b !== "auto") update({ b });
            }}
          />
        </label>
      </div>
      <div className="two ai-pen-columns">
        <section className="ai-pen-panel">
          <h3>AI A pen</h3>
          <PenSelector
            label="AI A pen"
            value={value.penA}
            onChange={(penA) => update({ penA })}
          />
        </section>
        <section className="ai-pen-panel">
          <h3>AI B pen</h3>
          <PenSelector
            label="AI B pen"
            value={value.penB}
            onChange={(penB) => update({ penB })}
          />
        </section>
      </div>
      <label className="f">
        Shot playback speed
        <select
          value={value.speed}
          onChange={(event) => update({ speed: Number(event.target.value) })}
        >
          {CONFIG_LIMITS.speeds.map((speed) => (
            <option key={speed} value={speed}>
              {speed}×
            </option>
          ))}
        </select>
      </label>
      <button
        className="mbtn primary"
        onClick={() => services.controller?.start("aivai")}
      >
        Run simulation
      </button>
    </MenuPage>
  );
}
