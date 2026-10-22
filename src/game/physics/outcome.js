/** A point for each opponent pen that fell during the completed shot. */
export function roundOutcome(out) {
  if (out < 0) return null;
  return {
    winner: out === 2 ? -1 : 1 - out,
    points: [out === 1 || out === 2 ? 1 : 0, out === 0 || out === 2 ? 1 : 0],
    how: "out",
  };
}
