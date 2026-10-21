"use client";
import { gameConfig, CONFIG_LIMITS } from "@/config/config";
import { memo, useEffect, useRef } from "react";
import {
  useGameServices,
  useGameState,
} from "@/features/game/runtime/GameProvider";
const CameraControls = memo(function CameraControls() {
  const services = useGameServices();
  const state = useGameState([
    "mode",
    "camera",
    "cameraPinned",
    "power",
    "paused",
    "menuVisible",
    "end",
    "replaying",
  ]);
  const panel = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !panel.current?.contains(event.target) &&
        panel.current
      )
        panel.current.open = false;
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);
  useEffect(() => {
    if (
      (state.paused || state.menuVisible || state.end || state.replaying) &&
      panel.current
    )
      panel.current.open = false;
  }, [state.paused, state.menuVisible, state.end, state.replaying]);
  if (state.mode === "menu") return null;
  return (
    <details
      className="camera-controls"
      data-pinned={state.cameraPinned}
      ref={panel}
      onKeyDown={(event) => {
        if (event.key === "Escape" && panel.current?.open) {
          event.preventDefault();
          event.stopPropagation();
          panel.current.open = false;
          panel.current.querySelector("summary")?.focus();
        }
      }}
    >
      <summary
        aria-label={
          state.cameraPinned
            ? "Camera controls, view pinned"
            : "Camera controls"
        }
        title={
          state.cameraPinned ? "Camera controls · Pinned" : "Camera controls"
        }
        aria-controls="camera-options"
      >
        <svg
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M4 6.5h3l1.5-2h7l1.5 2h3a1.5 1.5 0 0 1 1.5 1.5v11a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 19V8A1.5 1.5 0 0 1 4 6.5Z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      </summary>
      <fieldset id="camera-options" disabled={!!state.power}>
        <legend className="sr-only">Camera controls</legend>
        <div className="camera-panel-heading">
          <span>Camera</span>
          <div className="camera-panel-actions">
            <button
              type="button"
              aria-label={
                state.cameraPinned
                  ? "Unpin camera position"
                  : "Pin camera position"
              }
              aria-pressed={state.cameraPinned}
              onClick={() =>
                services.controller?.setCameraPinned(!state.cameraPinned)
              }
            >
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path d="m15 3 6 6-3 1-3 5-3 1-4-4 1-3 5-3 1-3Z M10 14l-7 7" />
              </svg>
              {state.cameraPinned ? "Pinned" : "Pin view"}
            </button>
            <button
              type="button"
              aria-label="Reset camera view and zoom"
              disabled={state.cameraPinned}
              onClick={() => services.controller?.resetCamera()}
            >
              Reset
            </button>
          </div>
        </div>
        <div className="camera-presets" role="group" aria-label="Camera views">
          {(
            [
              ["overview", "Overview", "Recommended view of the whole desk"],
              ["top", "Top", "Look down at the desk"],
              ["side", "Side", "View across the desk"],
              ["player", "Player", "View from the current player's end"],
            ] as const
          ).map(([preset, label, title]) => (
            <button
              type="button"
              key={preset}
              title={title}
              aria-pressed={state.camera.preset === preset}
              disabled={state.cameraPinned}
              onClick={() => services.controller?.setCameraPreset(preset)}
            >
              {label}
            </button>
          ))}
        </div>
        <label>
          <span>
            Rotate <output>{Math.round(state.camera.azimuth)}°</output>
          </span>
          <input
            aria-label="Camera rotation"
            disabled={state.cameraPinned}
            type="range"
            min="-180"
            max="180"
            step="1"
            value={state.camera.azimuth}
            onChange={(event) =>
              services.controller?.setCameraRotation(Number(event.target.value))
            }
          />
        </label>
        <label>
          <span>
            Tilt <output>{Math.round(state.camera.elevation)}°</output>
          </span>
          <input
            aria-label="Camera tilt"
            disabled={state.cameraPinned}
            type="range"
            min={CONFIG_LIMITS.elevation.min}
            max={CONFIG_LIMITS.elevation.max}
            step="1"
            value={state.camera.elevation}
            onChange={(event) =>
              services.controller?.setCameraTilt(Number(event.target.value))
            }
          />
        </label>
        <label>
          <span>
            Zoom <output>{Math.round(state.camera.zoom * 100)}%</output>
          </span>
          <input
            aria-label="Camera zoom"
            disabled={state.cameraPinned}
            aria-valuetext={`${Math.round(state.camera.zoom * 100)} percent`}
            type="range"
            min={CONFIG_LIMITS.zoom.min * 100}
            max={CONFIG_LIMITS.zoom.max * 100}
            step="5"
            value={Math.round(state.camera.zoom * 100)}
            onChange={(event) =>
              services.controller?.setCameraZoom(
                Number(event.target.value) / 100,
              )
            }
          />
        </label>
      </fieldset>
    </details>
  );
});

export function GameControls() {
  const services = useGameServices(),
    state = useGameState(["power", "surge", "turn", "settings", "fpsLabel"]);
  return (
    <>
      <CameraControls />
      {state.power && (
        <div id="flick-guide">
          <div id="pw">
            <div className="t">
              <span>Flick power</span>
              <span>
                {Math.round(
                  state.power.value *
                    (state.power.surge
                      ? gameConfig.physics.surgeMultiplier * 100
                      : 100),
                )}
                {state.power.surge ? " SURGE" : ""}
              </span>
            </div>
            <div className="b">
              <div
                id="pwFill"
                style={{
                  width: `${Math.round(state.power.value * 100)}%`,
                  background: `hsl(${Math.round(140 - 140 * state.power.value)} 70% 48%)`,
                }}
              />
            </div>
          </div>
        </div>
      )}
      <div id="bottom">
        {state.surge.visible && (
          <button
            className="tb"
            title={`Surge ×${gameConfig.physics.surgeMultiplier} · once per round`}
            aria-pressed={state.surge.enabled}
            disabled={!state.surge.available}
            onClick={() => services.controller?.toggleSurge()}
          >
            <span className="tb-icon" aria-hidden="true">
              ✦
            </span>
            <span>Surge ×{gameConfig.physics.surgeMultiplier}</span>
          </button>
        )}
        <div id="turn" data-who={state.turn.who}>
          {state.turn.label}
        </div>
      </div>
      {state.settings.fps && <div id="fps">{state.fpsLabel}</div>}
    </>
  );
}
