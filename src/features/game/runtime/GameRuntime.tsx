"use client";
import { GameProvider, useGameState } from "./GameProvider";
import { GameScene } from "./GameScene";
import dynamic from "next/dynamic";
const AiLab = dynamic(
  () => import("@/features/ai-lab/ui/AiLab").then((module) => module.AiLab),
  {
    loading: () => (
      <aside id="lab" aria-label="AI Lab">
        <p role="status">Loading AI Lab…</p>
      </aside>
    ),
  },
);
import { GameControls } from "@/features/game/ui/GameControls";
import { GameFeedback } from "@/features/game/ui/GameFeedback";
import { GameHud } from "@/features/game/ui/GameHud";
import { GameMenu } from "@/features/game/ui/GameMenu";
import { GameModals } from "@/features/game/ui/GameModals";
function GameSurface() {
  const state = useGameState([
    "replaying",
    "labOpen",
    "mode",
    "ready",
    "error",
    "paused",
    "end",
    "menuVisible",
  ]);
  return (
    <div
      id="app"
      className={`game-runtime${state.replaying ? " replay" : ""}${state.labOpen ? " lab-on" : ""}`}
      data-mode={state.mode}
    >
      <GameScene />
      <div id="vig" />
      <div inert={state.paused || !!state.end || state.menuVisible}>
        <GameHud />
        <GameFeedback />
        <GameControls />
        {state.labOpen && <AiLab />}
      </div>
      <GameMenu />
      <GameModals />
      {!state.ready && !state.error && (
        <div className="runtime-status" role="status">
          Preparing the classroom…
        </div>
      )}
      {state.error && (
        <div className="runtime-error" role="alert">
          {state.error}
          <button onClick={() => window.location.reload()}>Reload game</button>
        </div>
      )}
    </div>
  );
}
export function GameRuntime() {
  return (
    <GameProvider>
      <GameSurface />
    </GameProvider>
  );
}
