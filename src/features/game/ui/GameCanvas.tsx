"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
const GameRuntime = dynamic(
  () =>
    import("@/features/game/runtime/GameRuntime").then(
      (module) => module.GameRuntime,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="runtime-status" role="status">
        Loading the classroom…
      </div>
    ),
  },
);

export function GameCanvas() {
  const area = useRef<HTMLElement>(null);

  async function toggleFullscreen() {
    if (!area.current) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await area.current.requestFullscreen();
  }

  return (
    <section className="game-area" ref={area} aria-label="Pen Fight game">
      <GameRuntime />
      <button
        className="fullscreen-button"
        onClick={toggleFullscreen}
        type="button"
      >
        ⛶ Full screen
      </button>
    </section>
  );
}
