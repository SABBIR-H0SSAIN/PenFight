"use client";
import { useLayoutEffect } from "react";
import { Group } from "three";
import { createTableFeature } from "./scene/table-scene.js";
import { disposeObjectTree } from "@/game/scene/dispose.js";
import {
  useGameServices,
  useGameState,
} from "@/features/game/runtime/GameProvider";
/** Mounts and owns the playable desk. */
export function Table() {
  const { world } = useGameServices();
  const { settings } = useGameState(["settings"]);
  useLayoutEffect(() => {
    if (!world.initialized) return;
    const group = new Group();
    group.name = "playable-table";
    const feature = createTableFeature({
      ...world.deps,
      sceneRoot: group,
      surface: settings.tableSurface,
    });
    feature.desk();
    world.scene.add(group);
    return () => {
      world.scene.remove(group);
      disposeObjectTree(group);
    };
  }, [settings.tableSurface, world]);
  return null;
}
