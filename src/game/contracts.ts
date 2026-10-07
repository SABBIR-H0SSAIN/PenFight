/** Shared simulation snapshots and actions consumed by rendering and match controls. */
import type { PenKind } from "@/features/pen/types";

export type { CharacterAppearance } from "@/features/character/types";
export type { PenKind } from "@/features/pen/types";

export type Difficulty = keyof typeof import("./ai/catalog.js").DIFFICULTIES;

export interface PenState {
  type: PenKind;
  x: number;
  y: number;
  a: number;
  vx: number;
  vy: number;
  w: number;
  z: number;
  vz: number;
  out: boolean;
  outT: number;
  L: number;
  r: number;
  m: number;
  I: number;
  ang: number;
  roll: number;
  rr: number;
  mu: number;
  e: number;
  spd: number;
}

export interface ShotAction {
  ang: number;
  pow: number;
  off: number;
  t?: number;
  ai?: number;
  pi?: number;
  si?: number;
  key?: string;
  surge?: boolean;
}
