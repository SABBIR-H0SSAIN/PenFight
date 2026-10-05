/** Minimum-jerk interpolation gives reaches zero velocity and acceleration at either end. */
export function reachProgress(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * x * (10 + x * (-15 + 6 * x));
}
export function handAngle(current, forward, requested) {
  const delta = Math.atan2(
    Math.sin(requested - forward),
    Math.cos(requested - forward),
  );
  const comfortable = forward + Math.max(-1.15, Math.min(1.15, delta));
  return (
    current +
    Math.atan2(Math.sin(comfortable - current), Math.cos(comfortable - current))
  );
}
