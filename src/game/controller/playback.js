import { gameConfig } from "../../config/config.ts";

/** Physics samples may be unevenly spaced or share the final timestamp. */
export function interpolateRecording(recording, time) {
  if (!recording?.length) return null;
  const t = Math.max(
    recording[0].t,
    Math.min(recording.at(-1).t, Number.isFinite(time) ? time : recording[0].t),
  );
  let low = 0,
    high = recording.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (recording[middle].t <= t) low = middle;
    else high = middle - 1;
  }
  const a = recording[low],
    b = recording[Math.min(low + 1, recording.length - 1)],
    span = b.t - a.t,
    u = span > 0 ? (t - a.t) / span : 0;
  return {
    t,
    p: a.p.map((pen, index) => {
      const next = b.p[index];
      const result = { ...pen };
      for (const key of ["x", "y", "a", "z", "vx", "vy", "roll", "tipAngle"])
        if (pen[key] != null && next[key] != null)
          result[key] = pen[key] + (next[key] - pen[key]) * u;
      if (pen.tipPhase === 1 && next.tipPhase > 0) {
        // Interpolate the edge pivot, not a chord through the tabletop.
        for (const key of ["tipPivotX", "tipPivotY", "tipDistance"])
          result[key] = pen[key] + (next[key] - pen[key]) * u;
        const horizontal = result.tipDistance * Math.cos(result.tipAngle);
        result.x = result.tipPivotX + result.tipNX * horizontal;
        result.y = result.tipPivotY + result.tipNY * horizontal;
        result.z = -result.tipDistance * Math.sin(result.tipAngle);
      }
      return result;
    }),
  };
}
/** A single brief impact accent: adjacent collisions must never multiply slowdown. */
export function impactPlaybackRate(time, impactTime, speed = 1) {
  const accent =
    impactTime != null &&
    time >= impactTime - gameConfig.playback.impactLead &&
    time < impactTime + gameConfig.playback.impactDuration;
  return speed * (accent ? gameConfig.playback.impactSpeed : 1);
}
/** Show just the decisive moment, not the entire shot again in slow motion. */
export function replayWindow(events, duration) {
  const out = events.find((event) => event.type === "out");
  const hits = events.filter(
    (event) => event.type === "hit" && (!out || event.t <= out.t),
  );
  const focus = out?.t ?? hits.at(-1)?.t ?? duration;
  return {
    start: Math.max(0, focus - gameConfig.playback.replayLead),
    end: Math.min(duration, focus + gameConfig.playback.replayTail),
  };
}
