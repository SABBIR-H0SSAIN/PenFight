"use client";
import { CONFIG_LIMITS } from "@/config/config";
import {
  useGamePreferences,
  useGameServices,
  useGameState,
} from "@/features/game/runtime/GameProvider";
export function GameHud() {
  const services = useGameServices(),
    state = useGameState([
      "mode",
      "cameraPinned",
      "human",
      "title",
      "names",
      "scores",
      "round",
      "goal",
      "speed",
      "labOpen",
      "hintReady",
      "hintBusy",
    ]);
  const { settings, setSettings } = useGamePreferences();
  if (state.mode === "menu") return null;
  return (
    <div id="hud" data-human={state.human ? 1 : 0}>
      <div className="score" aria-live="polite">
        <div className="score-heading">
          <span>✎ MATCH SCORE</span>
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
          Round {state.round} ·{" "}
          {state.mode === "train" ? "Practice" : `first to ${state.goal}`}
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
              {CONFIG_LIMITS.speeds.map((speed) => (
                <option value={speed} key={speed}>
                  {speed}×
                </option>
              ))}
            </select>
            <svg
              className="speed-chevron"
              viewBox="0 0 12 12"
              width="12"
              height="12"
              aria-hidden="true"
            >
              <path
                d="m3 4.5 3 3 3-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </label>
        )}
        {state.mode === "train" && (
          <button
            className="tb"
            disabled={!state.hintReady || state.hintBusy}
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
          aria-label="Follow camera"
          title={
            state.cameraPinned
              ? "Unpin the camera to use Follow"
              : "Follow the moving pen"
          }
          disabled={state.cameraPinned}
          aria-pressed={settings.follow}
          onClick={() => setSettings({ follow: !settings.follow })}
        >
          <span className="tb-icon" aria-hidden="true">
            ◉
          </span>
          <span>Follow</span>
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
        <button
          id="game-menu-button"
          className="tb"
          type="button"
          aria-label="Game menu"
          aria-haspopup="dialog"
          aria-controls="pause"
          onClick={() => services.controller?.pause()}
        >
          <span className="tb-icon" aria-hidden="true">
            ☰
          </span>
          <span>Menu</span>
        </button>
      </div>
    </div>
  );
}
