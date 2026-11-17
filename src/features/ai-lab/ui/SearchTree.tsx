"use client";
import { useEffect, useRef } from "react";
import { drawTree, selectedTreeNode } from "./draw-tree.js";
import type { LiveDecision, SearchNode } from "@/game/state/types";
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
  if (!decision?.nodes.length) {
    return (
      <p className="mute">Take a turn or request a hint to see a decision.</p>
    );
  }
  const choice: SearchNode | undefined = selectedTreeNode(decision);
  const byId = new Map(decision.nodes.map((node) => [node.id, node]));
  const path: SearchNode[] = [];
  for (let node = choice; node; node = byId.get(node.p)) path.unshift(node);
  const replies = choice
    ? decision.nodes.filter((node) => node.p === choice.id)
    : [];
  const measure = {
    dfs: "simulated shot score",
    best: "simulated shot score",
    astar: "simulated shot score",
    minimax: "backed-up value",
    mcts: "mean reward for the mover",
    fuzzy: "rule output",
  }[decision.algo];

  function values(node: SearchNode) {
    const metrics: string[] = [];
    if (node.v != null) metrics.push(`${measure} ${node.v.toFixed(2)}/100`);
    if (node.g != null) metrics.push(`g = ${node.g.toFixed(3)}`);
    if (node.h != null) metrics.push(`h = ${node.h.toFixed(3)}`);
    if (node.f != null) {
      metrics.push(
        `${decision?.algo === "astar" ? "f" : "priority"} = ${node.f.toFixed(3)}`,
      );
    }
    if (node.n != null) metrics.push(`${node.n} visits`);
    if (node.reward != null)
      metrics.push(`total reward ${node.reward.toFixed(2)}`);
    return metrics.join(" · ");
  }

  return (
    <>
      <canvas id="tree" ref={canvas} aria-label="AI search tree" />
      <p className="mute">
        Colour shows {measure}.{" "}
        {decision.algo === "mcts" && "Larger dots have more visits. "}
        The outline marks the selected branch when it appears in the recorded
        tree.
      </p>
      {choice ? (
        <>
          <h4>Selected branch</h4>
          <ol>
            {path.map((node) => (
              <li key={node.id}>
                {node.label}
                {values(node) && ` · ${values(node)}`}
              </li>
            ))}
          </ol>
          {replies.length > 0 && (
            <>
              <h4>Recorded replies</h4>
              <ul>
                {replies.map((node) => (
                  <li key={node.id}>
                    {node.label} · {values(node)}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      ) : (
        decision.selected && (
          <p className="mute">
            The selected shot has no node in the recorded tree.
          </p>
        )
      )}
    </>
  );
}
