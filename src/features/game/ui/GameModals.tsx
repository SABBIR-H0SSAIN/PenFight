"use client";
import {
  useGameServices,
  useGameState,
} from "@/features/game/runtime/GameProvider";
import { GameDialog } from "./GameDialog";
export function GameModals() {
  const services = useGameServices(),
    state = useGameState(["paused", "end", "mode"]);
  return (
    <>
      {state.paused && (
        <GameDialog id="pause" title="Paused">
          <button
            className="mbtn primary"
            onClick={() => services.controller?.resume()}
          >
            Resume
          </button>
          <button
            className="mbtn"
            onClick={() => services.controller?.settings()}
          >
            Settings
          </button>
          <button
            className="mbtn"
            onClick={() => services.controller?.openMenu()}
          >
            Quit to menu
          </button>
        </GameDialog>
      )}
      {state.end && (
        <GameDialog id="end" title={state.end.title} won={state.end.won}>
          <p>{state.end.subtitle}</p>
          <button
            className="mbtn"
            onClick={() => {
              if (state.mode !== "menu") services.controller?.start(state.mode);
            }}
          >
            Play again
          </button>
          <button
            className="mbtn"
            onClick={() => services.controller?.openMenu()}
          >
            Menu
          </button>
        </GameDialog>
      )}
    </>
  );
}
