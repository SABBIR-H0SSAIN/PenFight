"use client";
import {
  createContext,
  useContext,
  useState,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createGameEngine } from "@/game/engine.js";
import { createWorld } from "@/game/scene/world.js";
import { createSound } from "@/game/audio/sound.js";
import { createUiStore, selectUiStore } from "@/game/state/store";
import { storage } from "@/game/state/storage.js";
import type { GameController } from "@/game/controller/controller.js";
import type {
  GamePreferences,
  GameSettings,
  GameUiState,
} from "@/game/state/types";
function createServices() {
  const engine = createGameEngine();
  let controller: GameController | null = null;
  let canvas: HTMLCanvasElement | null = null;
  return {
    engine,
    world: createWorld(engine),
    sound: createSound(),
    ui: createUiStore(),
    get controller() {
      return controller;
    },
    get canvas() {
      return canvas;
    },
    setController(next: GameController | null) {
      controller = next;
    },
    setCanvas(next: HTMLCanvasElement | null) {
      canvas = next;
    },
  };
}
type GameServices = ReturnType<typeof createServices>;
const GameContext = createContext<GameServices | null>(null);
export function GameProvider({ children }: { children: ReactNode }) {
  const [services] = useState(createServices);
  return (
    <GameContext.Provider value={services}>{children}</GameContext.Provider>
  );
}
export function useGameServices() {
  const services = useContext(GameContext);
  if (!services)
    throw new Error("Game components must be inside GameProvider.");
  return services;
}
export function useGameState<K extends keyof GameUiState>(keys: readonly K[]) {
  const { ui } = useGameServices();
  const keySignature = keys.join(",");
  const selected = useMemo(
    () => selectUiStore(ui, keySignature.split(",") as K[]),
    [ui, keySignature],
  );
  return useSyncExternalStore(
    selected.subscribe,
    selected.get,
    selected.getServerSnapshot,
  );
}
export function useGamePreferences() {
  const { ui } = useGameServices();
  const { preferences, settings } = useGameState(["preferences", "settings"]);
  function setPreferences(next: GamePreferences) {
    ui.set({ preferences: next });
    storage.set("preferences", next);
  }
  function setSettings(patch: Partial<GameSettings>) {
    const next = { ...ui.get().settings, ...patch };
    ui.set({ settings: next });
    storage.set("settings", next);
  }
  return { preferences, settings, setPreferences, setSettings };
}
