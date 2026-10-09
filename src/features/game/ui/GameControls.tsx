"use client";
import {
  useGameServices,
  useGameState,
} from "@/features/game/runtime/GameProvider";
export function GameControls() {
  const services = useGameServices(),
    state = useGameState([
      "tipVisible",
      "flickCorner",
      "power",
      "surge",
      "turn",
      "settings",
      "fpsLabel",
    ]);
  return (
    <>
      {(state.tipVisible || state.power) && (
        <div id="flick-guide" data-corner={state.flickCorner}>
          {state.tipVisible && (
            <div id="tip">
              Press on your pen, pull back, release to flick. Where you grab it
              sets the spin.
            </div>
          )}
          {state.power && (
            <div id="pw">
              <div className="t">
                <span>Flick power</span>
                <span>
                  {Math.round(
                    state.power.value * (state.power.surge ? 160 : 100),
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
          )}
        </div>
      )}
      <div id="bottom">
        {state.surge.visible && (
          <button
            className="tb"
            aria-pressed={state.surge.enabled}
            disabled={!state.surge.available}
            onClick={() => services.controller?.toggleSurge()}
          >
            <span className="tb-icon" aria-hidden="true">
              ✦
            </span>
            <span>Surge ×1.6 (once per round)</span>
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
