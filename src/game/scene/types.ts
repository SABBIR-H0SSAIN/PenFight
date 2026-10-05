import type {
  Object3D,
  PerspectiveCamera,
  Scene,
  Texture,
  WebGLRenderer,
} from "three";
export type SceneQuality = "low" | "medium" | "high";
import type { PenKind } from "@/features/pen/types";
import type { PenState } from "../contracts";
import type { createCharacterFeature } from "@/features/character/scene/character-scene.js";
export type CharacterModel = ReturnType<
  ReturnType<typeof createCharacterFeature>["makeStudent"]
>;
export interface PenHandle {
  group: Object3D;
  setType(type: PenKind, color?: string | null): void;
  setState(state: PenState, time: number, scale?: number): void;
}
export interface SceneWorld {
  registerPen(slot: number, pen: PenHandle): void;
  registerCharacter(slot: number, character: CharacterModel): void;
  setEnvironment(texture: Texture | null, spriteTexture?: Texture): void;
  initialized: boolean;
  deps: Record<string, unknown>;
  scene: Scene;
  renderer: WebGLRenderer;
  camera: PerspectiveCamera;
  quality: SceneQuality;
  pens: PenHandle[];
  students: CharacterModel[];
  spriteTexture: Texture;
  init(canvas: HTMLCanvasElement, quality: SceneQuality): void;
  complete(): void;
  setQuality(quality: SceneQuality): void;
  dispose(): void;
}
