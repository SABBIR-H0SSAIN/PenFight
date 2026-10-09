import type { GameUiState } from "./types";
export const defaultSettings: GameUiState["settings"] = {
  name: "Player",
  vol: 0.7,
  amb: true,
  quality: "auto",
  tableSurface: "oak",
  follow: true,
  replay: true,
  slowmo: true,
  fps: false,
  guide: true,
  friction: 0.98,
  real: true,
};
export const defaultPreferences: GameUiState["preferences"] = {
  vs: { pen: "ball", colors: {}, difficulty: "advanced" },
  train: { pen: "ball", colors: {}, difficulty: "advanced", algorithm: "auto" },
  ai: {
    a: "astar",
    b: "mcts",
    sa: "advanced",
    sb: "advanced",
    speed: 2,
    penA: { pen: "ball", colors: {} },
    penB: { pen: "gel", colors: {} },
  },
  pvp: {
    name1: "Player 1",
    name2: "Player 2",
    goal: 3,
    pen1: { pen: "ball", colors: {} },
    pen2: { pen: "gel", colors: {} },
  },
};
export function createUiStore() {
  let state: GameUiState = {
    speed: 1,
    ready: false,
    error: null,
    mode: "menu",
    view: "main",
    menuVisible: true,
    paused: false,
    fromPause: false,
    end: null,
    names: ["You", "AI"],
    scores: [0, 0],
    round: 1,
    goal: 3,
    title: "",
    human: true,
    turn: { label: "", who: 0 },
    thinking: null,
    banner: null,
    replaying: false,
    tipVisible: false,
    flickCorner: "bottom-left",
    power: null,
    surge: { visible: false, available: false, enabled: false },
    fpsLabel: "",
    labOpen: false,
    labAlgo: "astar",
    live: null,
    hintBusy: false,
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
