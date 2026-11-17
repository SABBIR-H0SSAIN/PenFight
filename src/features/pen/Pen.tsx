"use client";
import { useLayoutEffect } from "react";
import { gameConfig } from "@/config/config";
import { createPenFeature } from "./models/pen-models.js";
import { disposeObjectTree } from "@/game/scene/dispose.js";
import { useGameServices } from "@/features/game/runtime/GameProvider";
import type { Object3D } from "three";
import type { PenKind } from "./types";
import type { PenRenderState } from "@/game/scene/types";
export interface PenProps {
  slot: 0 | 1;
  model?: PenKind;
  color?: string;
  matadorTemplate?: Object3D;
  smoothyTemplate?: Object3D;
  allTimeTemplate?: Object3D;
  iTeenTemplate?: Object3D;
}
/** Owns one player's meshes. Physics drives its transform through the registered handle. */
export function Pen({
  slot,
  model = gameConfig.preferences.pvp.pen1.pen,
  color,
  matadorTemplate,
  smoothyTemplate,
  allTimeTemplate,
  iTeenTemplate,
}: PenProps) {
  const { world } = useGameServices();
  useLayoutEffect(() => {
    if (!world.initialized) return;
    const feature = createPenFeature(
      world.deps,
      matadorTemplate,
      smoothyTemplate,
      allTimeTemplate,
      iTeenTemplate,
    );
    const pen = feature.makePen(slot);
    const handle = {
      group: pen.group,
      setType: (type: PenKind, tint?: string | null) =>
        feature.setPenType(pen, type, tint),
      setState: (state: PenRenderState, time: number, scale?: number) =>
        feature.setPen(pen, state, time, scale),
    };
    pen.group.name = `pen-${slot}`;
    world.registerPen(slot, handle);
    world.scene.add(pen.group);
    return () => {
      world.scene.remove(pen.group);
      disposeObjectTree(pen.group);
      feature.dispose();
    };
  }, [
    world,
    slot,
    matadorTemplate,
    smoothyTemplate,
    allTimeTemplate,
    iTeenTemplate,
  ]);
  useLayoutEffect(() => {
    world.pens[slot]?.setType(model, color);
  }, [
    world,
    slot,
    model,
    color,
    matadorTemplate,
    smoothyTemplate,
    allTimeTemplate,
    iTeenTemplate,
  ]);
  return null;
}
