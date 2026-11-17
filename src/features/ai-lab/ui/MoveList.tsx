"use client";
import type { Algorithm, SuggestedMove } from "@/game/state/types";
export function MoveList({
  moves,
  algorithm,
}: {
  moves: SuggestedMove[];
  algorithm?: Algorithm;
}) {
  if (!moves.length)
    return (
      <p className="mute">No decision yet. Take a turn or wait for the AI.</p>
    );
  return (
    <div>
      {moves.map((move, index) => (
        <div
          className={`mv${move.selected ? " sel" : ""}`}
          key={move.act.key ?? index}
        >
          <span className="nm">Move {String.fromCharCode(65 + index)}</span>
          <span className="lb">{move.label}</span>
          <span className="bar">
            <i
              style={{ width: `${Math.max(0, Math.min(100, move.score))}%` }}
            />
          </span>
          <b>{Math.round(move.score)}</b>
          <small>
            {algorithm === "mcts" ? (
              <>
                {move.visits ?? 0} visits · mean reward{" "}
                {(move.score / 100).toFixed(2)}
              </>
            ) : (
              <>
                {move.prob != null &&
                  `Knock-off ${Math.round(move.prob * 100)}%`}
                {move.risk != null &&
                  ` · self knock-off ${Math.round(move.risk * 100)}%`}
              </>
            )}
          </small>
          {move.selected && <em>Selected</em>}
        </div>
      ))}
    </div>
  );
}
