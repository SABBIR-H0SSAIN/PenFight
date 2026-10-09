"use client";
import {
  useGamePreferences,
  useGameServices,
} from "@/features/game/runtime/GameProvider";
import { PenSelector } from "@/features/pen/ui/PenSelector";
import { AlgorithmSelect } from "@/features/game/ui/controls/AlgorithmSelect";
import { DifficultySelect } from "@/features/game/ui/controls/DifficultySelect";
import { MenuPage } from "./MenuPage";
export function AiBattleMenuView() {
  const services = useGameServices();
  const { preferences, setPreferences } = useGamePreferences();
  const value = preferences.ai;
  const update = (patch: Partial<typeof value>) =>
    setPreferences({ ...preferences, ai: { ...value, ...patch } });
  return (
    <MenuPage view="aivai" title="AI Battle" eyebrow="AI SHOWDOWN">
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
      <div className="two">
        <label className="f">
          A accuracy
          <DifficultySelect
            label="AI A accuracy"
            value={value.sa}
            onChange={(sa) => update({ sa })}
          />
        </label>
        <label className="f">
          B accuracy
          <DifficultySelect
            label="AI B accuracy"
            value={value.sb}
            onChange={(sb) => update({ sb })}
          />
        </label>
      </div>
      <p className="lead">
        Choose a pen for each AI. They can use the same model or different pens.
      </p>
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
        Speed
        <select
          value={value.speed}
          onChange={(event) => update({ speed: Number(event.target.value) })}
        >
          {[1, 2, 4].map((speed) => (
            <option key={speed} value={speed}>
              x{speed}
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
