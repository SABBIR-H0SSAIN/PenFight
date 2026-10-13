"use client";
import type { SuggestedMove } from "@/game/state/types";
export function MoveList({ moves }: { moves: SuggestedMove[] }) {
  if (!moves.length)
    return (
      <p className="mute">No decision yet. Take a turn or wait for the AI.</p>
    );
  return (
    <div>
      {moves.map((move, index) => (
        <div className={`mv${move.selected ? " sel" : ""}`} key={index}>
          <span className="nm">Move {String.fromCharCode(65 + index)}</span>
          <span className="lb">{move.label}</span>
          <span className="bar">
            <i
              style={{ width: `${Math.max(0, Math.min(100, move.score))}%` }}
            />
          </span>
          <b>{Math.round(move.score)}</b>
          <small>
            {move.visits ? `${move.visits} visits · ` : ""}knock-out{" "}
            {Math.round((move.prob || 0) * 100)}%
            {move.risk ? ` · risk ${Math.round(move.risk * 100)}%` : ""}
          </small>
          {move.selected && <em>Selected</em>}
        </div>
      ))}
    </div>
  );
}
