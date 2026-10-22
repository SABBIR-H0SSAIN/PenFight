"use client";

import { useEffect, useRef, useState } from "react";
import { preload } from "react-dom";
import dynamic from "next/dynamic";
import { GameLoading } from "./GameLoading";
import { MATADOR_MODEL_URL } from "@/features/pen/models/assets.js";
const GameRuntime = dynamic(
  () =>
    import("@/features/game/runtime/GameRuntime").then(
      (module) => module.GameRuntime,
    ),
  {
    ssr: false,
    loading: () => <GameLoading />,
  },
);

export function GameCanvas() {
  // React emits deduplicated hints during prerender, ahead of game hydration.
  preload(MATADOR_MODEL_URL, { as: "fetch", crossOrigin: "anonymous" });
  preload("/fonts/patrick-hand-latin.42156e008dd5.woff2", {
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  });
  const area = useRef<HTMLElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [supported, setSupported] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");

  useEffect(() => {
    setSupported(
      !!document.fullscreenEnabled && !!area.current?.requestFullscreen,
    );
    const update = () =>
      setFullscreen(document.fullscreenElement === area.current);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  async function toggleFullscreen() {
    if (!area.current) return;
    try {
      setFullscreenError("");
      if (document.fullscreenElement) await document.exitFullscreen();
      else await area.current.requestFullscreen();
    } catch {
      setFullscreenError(
        "Full screen is unavailable. You can keep playing here.",
      );
    }
  }

  return (
    <section className="game-area" ref={area} aria-label="Pen Fight game">
      <GameRuntime />
      {supported && (
        <button
          className="fullscreen-button"
          onClick={toggleFullscreen}
          type="button"
          aria-pressed={fullscreen}
        >
          {fullscreen ? "⛶ Exit full screen" : "⛶ Full screen"}
        </button>
      )}
      {fullscreenError && (
        <div className="fullscreen-status" role="status">
          {fullscreenError}
        </div>
      )}
    </section>
  );
}
