import type { Difficulty, ShotAction } from "../contracts";
import type { PenKind } from "@/features/pen/types";
import type { SceneQuality } from "../scene/types";
export type Algorithm = keyof typeof import("../ai/catalog.js").ALGORITHMS;
export type GameMode = "menu" | "pvp" | "vs" | "train" | "aivai";
export type MenuView = "main" | "pvp" | "vs" | "train" | "aivai" | "settings";
export interface PenSelection {
  pen: PenKind;
  colors: Partial<Record<PenKind, string>>;
}
export interface GamePreferences {
  vs: PenSelection & { difficulty: Difficulty };
  train: PenSelection & {
    difficulty: Difficulty;
    algorithm: Algorithm | "auto";
  };
  ai: {
    a: Algorithm;
    b: Algorithm;
    sa: Difficulty;
    sb: Difficulty;
    speed: number;
    penA: PenSelection;
    penB: PenSelection;
  };
  pvp: {
    name1: string;
    name2: string;
    goal: number;
    pen1: PenSelection;
    pen2: PenSelection;
  };
}
export interface GameSettings {
  name: string;
  vol: number;
  amb: boolean;
  quality: SceneQuality | "auto";
  tableSurface: "oak" | "maple" | "walnut";
  follow: boolean;
  replay: boolean;
  slowmo: boolean;
  fps: boolean;
  guide: boolean;
  friction: number;
  real: boolean;
}
export interface SearchNode {
  id: number;
  p: number;
  d: number;
  label: string;
  goal?: boolean;
  order?: number;
  n?: number;
  v?: number;
}
export interface SuggestedMove {
  label: string;
  score: number;
  prob?: number;
  risk?: number;
  visits?: number;
  selected?: boolean;
  act: ShotAction;
}
export interface LiveDecision {
  algo: Algorithm;
  nodes: SearchNode[];
  moves: SuggestedMove[];
  stats: { evals?: number; sims?: number; nodes?: number; ms?: number };
  extra: Record<string, unknown>;
  selected?: ShotAction;
  mistake?: boolean;
}
export interface BenchmarkResult {
  names: [string, string];
  wins: number[];
  averageMs: number[];
  done: number;
  total: number;
  turns: number;
  outs: number;
}
export interface GameUiState {
  speed: number;
  ready: boolean;
  error: string | null;
  mode: GameMode;
  view: MenuView;
  menuVisible: boolean;
  paused: boolean;
  fromPause: boolean;
  end: { title: string; subtitle: string; won: boolean } | null;
  names: string[];
  scores: number[];
  round: number;
  goal: number;
  title: string;
  human: boolean;
  turn: { label: string; who: number };
  thinking: string | null;
  banner: { title: string; subtitle: string } | null;
  replaying: boolean;
  tipVisible: boolean;
  flickCorner: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  power: { value: number; surge: boolean } | null;
  surge: { visible: boolean; available: boolean; enabled: boolean };
  fpsLabel: string;
  labOpen: boolean;
  labAlgo: Algorithm;
  live: LiveDecision | null;
  hintBusy: boolean;
  hintAvailable: boolean;
  benchmark: {
    running: boolean;
    status: string;
    result: BenchmarkResult | null;
  };
  settings: GameSettings;
  preferences: GamePreferences;
}
