"use client";
import {
  useGameServices,
  useGameState,
} from "@/features/game/runtime/GameProvider";
export function GameFeedback() {
  const services = useGameServices(),
    state = useGameState(["thinking", "banner", "replaying"]);
  return (
    <>
      {state.thinking && (
        <div id="think" role="status">
          <span className="dots">
            <i />
            <i />
            <i />
          </span>
          <span>{state.thinking}</span>
        </div>
      )}
      <div
        id="banner"
        className={state.banner ? "on" : undefined}
        aria-live="polite"
      >
        <div id="bnT">{state.banner?.title}</div>
        <div id="bnS">{state.banner?.subtitle}</div>
      </div>
      {state.replaying && (
        <button id="rpl" onClick={() => services.controller?.skipReplay()}>
          REPLAY · tap to skip
        </button>
      )}
    </>
  );
}
