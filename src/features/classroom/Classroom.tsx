"use client";
import { useLayoutEffect, useRef } from "react";
import { Group, PMREMGenerator } from "three";
import { createClassroomFeature } from "./scene/classroom-scene.js";
import { updateFurnitureSurface } from "@/features/furniture/scene/furniture.js";
import { disposeObjectTree, release } from "@/game/scene/dispose.js";
import {
  useGameServices,
  useGameState,
} from "@/features/game/runtime/GameProvider";
/** Owns room geometry, background props, and the environment lighting map. */
export function Classroom() {
  const { world } = useGameServices();
  const { settings } = useGameState(["settings"]);
  const surface = settings.tableSurface;
  const furnitureRoot = useRef<Group | null>(null);
  useLayoutEffect(() => {
    if (!world.initialized) return;
    const group = new Group();
    group.name = "classroom";
    const feature = createClassroomFeature({
      ...world.deps,
      sceneRoot: group,
    });
    const source = feature.envTexture();
    const generator = new PMREMGenerator(world.renderer);
    const environment = generator.fromEquirectangular(source);
    generator.dispose();
    release(source);
    const spriteTexture = feature.spriteTex();
    world.setEnvironment(environment.texture, spriteTexture);
    feature.room();
    feature.props();
    world.scene.add(group);
    furnitureRoot.current = group;
    return () => {
      world.scene.remove(group);
      furnitureRoot.current = null;
      world.setEnvironment(null);
      disposeObjectTree(group);
      release(spriteTexture);
      release(environment);
    };
  }, [world]);
  useLayoutEffect(() => {
    if (furnitureRoot.current)
      updateFurnitureSurface(furnitureRoot.current, world.deps, surface);
  }, [world, surface]);
  return null;
}
