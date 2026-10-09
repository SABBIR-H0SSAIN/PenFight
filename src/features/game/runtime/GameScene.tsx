"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Object3D } from "three";
import { loadMatadorHighSchool } from "@/features/pen/models/load-pen-assets.js";
import { Character } from "@/features/character/Character";
import { Pen } from "@/features/pen/Pen";
import { Classroom } from "@/features/classroom/Classroom";
import { Table } from "@/features/table/Table";
import { createController } from "@/game/controller/controller.js";
import { useGameServices } from "./GameProvider";
import { hydrateState } from "@/game/state/preferences.js";
function Renderer() {
  const services = useGameServices();
  const canvas = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    if (!canvas.current) return;
    const { world, ui, engine } = services;
    hydrateState(engine, ui);
    const quality = ui.get().settings.quality;
    services.setCanvas(canvas.current);
    try {
      world.init(
        canvas.current,
        quality === "auto"
          ? canvas.current.clientWidth < 600
            ? "medium"
            : "high"
          : quality,
      );
    } catch (error) {
      ui.set({
        error:
          error instanceof Error
            ? error.message
            : "Could not start the 3D renderer.",
      });
    }
    return () => {
      services.controller?.dispose();
      services.setController(null);
      world.dispose();
      services.setCanvas(null);
    };
  }, [services]);
  return <canvas id="gl" ref={canvas} aria-label="Pen fight desk" />;
}
function Simulation() {
  const services = useGameServices();
  useLayoutEffect(() => {
    if (!services.world.initialized || !services.canvas) return;
    services.world.complete();
    const controller = createController({
      ...services,
      canvas: services.canvas,
    });
    services.setController(controller);
    return () => {
      controller.dispose();
      if (services.controller === controller) services.setController(null);
    };
  }, [services]);
  return null;
}
/** Mount order prepares the renderer and feature models before starting simulation. */
export function GameScene() {
  const { ui } = useGameServices();
  const [matadorTemplate, setMatadorTemplate] = useState<Object3D | null>(null);
  useEffect(() => {
    let active = true;
    loadMatadorHighSchool()
      .then((template) => {
        if (active) setMatadorTemplate(template);
      })
      .catch(() => {
        if (active)
          ui.set({
            error:
              "Could not load the Matador pen model. Please reload the game.",
          });
      });
    return () => {
      active = false;
    };
  }, [ui]);
  if (!matadorTemplate) return null;
  return (
    <>
      <Renderer />
      <Classroom />
      <Table />
      <Pen slot={0} matadorTemplate={matadorTemplate} />
      <Pen slot={1} model="premium" matadorTemplate={matadorTemplate} />
      <Character slot={0} />
      <Character slot={1} />
      <Simulation />
    </>
  );
}
