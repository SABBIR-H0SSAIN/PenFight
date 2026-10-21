import { gameConfig } from "../../config/config.ts";
import type { GameUiState } from "./types";
export const defaultSettings = gameConfig.settings;
export const defaultPreferences = gameConfig.preferences;
export function createUiStore() {
  let state: GameUiState = {
    speed: 1,
    ready: false,
    error: null,
    mode: "menu",
    view: "main",
    menuVisible: true,
    menuTurning: false,
    paused: false,
    fromPause: false,
    end: null,
    names: ["You", "AI"],
    scores: [0, 0],
    round: 1,
    goal: gameConfig.matches.versusGoal,
    title: "",
    human: true,
    turn: { label: "", who: 0 },
    thinking: null,
    banner: null,
    replaying: false,
    camera: {
      preset: "overview",
      ...gameConfig.camera.presets.overview,
      zoom: gameConfig.camera.defaultZoom,
    },
    cameraPinned: false,
    power: null,
    surge: { visible: false, available: false, enabled: false },
    fpsLabel: "",
    labOpen: false,
    labAlgo: gameConfig.ai.defaultAlgorithm as GameUiState["labAlgo"],
    live: null,
    hintBusy: false,
    hintReady: false,
    hintAvailable: false,
    benchmark: { running: false, status: "", result: null },
    settings: { ...defaultSettings },
    preferences: structuredClone(defaultPreferences),
  };
  const serverState = state;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    getServerSnapshot: () => serverState,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set(patch: Partial<GameUiState>) {
      const keys = Object.keys(patch) as (keyof GameUiState)[];
      if (keys.every((key) => Object.is(state[key], patch[key]))) return;
      state = { ...state, ...patch };
      listeners.forEach((listener) => listener());
    },
  };
}
export type GameUiStore = ReturnType<typeof createUiStore>;

/** Stable snapshots let React ignore changes outside a component's selected fields. */
export function selectUiStore<K extends keyof GameUiState>(
  store: GameUiStore,
  keys: readonly K[],
) {
  const pick = (state: GameUiState) =>
    Object.fromEntries(keys.map((key) => [key, state[key]])) as Pick<
      GameUiState,
      K
    >;
  let selected = pick(store.get());
  const server = pick(store.getServerSnapshot());
  return {
    subscribe: store.subscribe,
    get: () => {
      const next = store.get();
      if (!keys.every((key) => Object.is(selected[key], next[key])))
        selected = pick(next);
      return selected;
    },
    getServerSnapshot: () => server,
  };
}
