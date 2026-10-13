"use client";
import { useEffect, useRef } from "react";
import { drawTree } from "./draw-tree.js";
import type { LiveDecision } from "@/game/state/types";
export function SearchTree({ decision }: { decision: LiveDecision | null }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const draw = () => drawTree(element, decision || { nodes: [] });
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(element);
    return () => observer.disconnect();
  }, [decision]);
  return (
    <>
      <canvas id="tree" ref={canvas} aria-label="AI search tree" />
      <p className="mute">
        Dot colour is the heuristic score, size is MCTS visits, and the
        highlighted path is the chosen shot.
      </p>
    </>
  );
}
