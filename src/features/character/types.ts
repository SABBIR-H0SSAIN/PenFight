import type { Group, MeshStandardMaterial, Object3D } from "three";
/** Public appearance settings for the two classroom characters. */
export interface CharacterAppearance {
  skin: string;
  shirt: string;
  pants: string;
  hair: string;
}

export type CharacterSlot = 0 | 1;

export type CharacterReaction =
  "neutral" | "happy" | "surprise" | "frustrated" | "think" | "smug";

/** Public rendering handle used by React and the simulation. */
export interface CharacterRig {
  group: Group;
  arms: Group;
  head: Object3D;
  mats: Record<
    keyof CharacterAppearance | "tie" | "shoe",
    MeshStandardMaterial
  >;
  reset(): void;
  update(delta: number, time: number): void;
  setEmotion(emotion: CharacterReaction, duration: number): void;
}
