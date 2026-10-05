"use client";
import { useLayoutEffect } from "react";
import { createCharacterFeature } from "./scene/character-scene.js";
import { disposeObjectTree } from "@/game/scene/dispose.js";
import { useGameServices } from "@/features/game/runtime/GameProvider";
import type { CharacterAppearance, CharacterSlot } from "./types";
export interface CharacterProps {
  slot: CharacterSlot;
  appearance?: Partial<CharacterAppearance>;
}
/** Mounts one student, including its articulated arms, and applies optional appearance props. */
export function Character({ slot, appearance }: CharacterProps) {
  const { world } = useGameServices();
  useLayoutEffect(() => {
    if (!world.initialized) return;
    const feature = createCharacterFeature(world.deps);
    const character = feature.makeStudent(slot);
    character.group.name = `character-${slot}`;
    character.arms.name = `character-${slot}-arms`;
    world.registerCharacter(slot, character);
    world.scene.add(character.group, character.arms);
    return () => {
      character.reset();
      world.scene.remove(character.group, character.arms);
      disposeObjectTree(character.group);
      disposeObjectTree(character.arms);
    };
  }, [world, slot]);
  useLayoutEffect(() => {
    const character = world.students[slot];
    if (!character || !appearance) return;
    for (const key of ["skin", "shirt", "pants", "hair"] as const) {
      const color = appearance[key];
      if (color) character.mats[key].color.set(color).convertSRGBToLinear();
    }
  }, [world, slot, appearance]);
  return null;
}
