/** A single brief impact accent: adjacent collisions must never multiply slowdown. */
export function impactPlaybackRate(time, impactTime, speed = 1) {
  const accent =
    impactTime != null &&
    time >= impactTime - 0.025 &&
    time < impactTime + 0.13;
  return speed * (accent ? 0.75 : 1);
}
/** Show just the decisive moment, not the entire shot again in slow motion. */
export function replayWindow(events, duration) {
  const out = events.find((event) => event.type === "out");
  const hits = events.filter(
    (event) => event.type === "hit" && (!out || event.t <= out.t),
  );
  const focus = out?.t ?? hits.at(-1)?.t ?? duration;
  return {
    start: Math.max(0, focus - 0.4),
    end: Math.min(duration, focus + 0.55),
  };
}
