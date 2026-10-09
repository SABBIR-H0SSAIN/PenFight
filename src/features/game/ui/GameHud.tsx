"use client";
import {
  useGamePreferences,
  useGameServices,
  useGameState,
} from "@/features/game/runtime/GameProvider";
export function GameHud() {
  const services = useGameServices(),
    state = useGameState([
      "mode",
      "human",
      "title",
      "names",
      "scores",
      "round",
      "goal",
      "speed",
      "labOpen",
    ]);
  const { settings, setSettings } = useGamePreferences();
  if (state.mode === "menu") return null;
  return (
    <div id="hud" data-human={state.human ? 1 : 0}>
      <div className="brand">
        Pen Fight AI Arena<small>{state.title}</small>
      </div>
      <div className="score" aria-live="polite">
        <div className="score-heading">
          <span>✎ MATCH SCORE</span>
          <span>CLASS 07</span>
        </div>
        <div className="row">
          <span className="nm" title={state.names[0]}>
            {state.names[0]}
          </span>
          <span className="pt">{state.scores.join(" – ")}</span>
          <span className="nm" title={state.names[1]}>
            {state.names[1]}
          </span>
        </div>
        <small>
          Round {state.round} · first to {state.goal}
        </small>
      </div>
      <div className="tools" role="toolbar" aria-label="Game controls">
        {state.mode === "aivai" && (
          <label id="speedBox">
            <span className="sr-only">Simulation speed</span>
            <select
              aria-label="Simulation speed"
              value={state.speed}
              onChange={(event) =>
                services.controller?.setSpeed(Number(event.target.value))
              }
            >
              {[1, 2, 4].map((speed) => (
                <option value={speed} key={speed}>
                  x{speed}
                </option>
              ))}
            </select>
          </label>
        )}
        {state.mode === "train" && (
          <button
            className="tb"
            onClick={() => void services.controller?.requestHint()}
          >
            <span className="tb-icon" aria-hidden="true">
              ✎
            </span>
            <span>Hint</span>
          </button>
        )}
        <button
          className="tb"
          aria-pressed={settings.follow}
          onClick={() => setSettings({ follow: !settings.follow })}
        >
          <span className="tb-icon" aria-hidden="true">
            ◉
          </span>
          <span>Follow cam</span>
        </button>
        {state.mode !== "pvp" && (
          <button
            className="tb"
            aria-pressed={state.labOpen}
            onClick={() => services.controller?.toggleLab()}
          >
            <span className="tb-icon" aria-hidden="true">
              ▤
            </span>
            <span>AI Lab</span>
          </button>
        )}
        <button className="tb" onClick={() => services.controller?.pause()}>
          <span className="tb-icon" aria-hidden="true">
            ☰
          </span>
          <span>Menu</span>
        </button>
      </div>
    </div>
  );
}
