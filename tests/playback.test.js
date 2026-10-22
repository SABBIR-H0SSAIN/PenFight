import test from "node:test";
import assert from "node:assert/strict";
import {
  impactPlaybackRate,
  replayWindow,
  interpolateRecording,
} from "../src/game/controller/playback.js";
import { reachProgress, handAngle } from "../src/features/character/motion.js";
import { createGameEngine } from "../src/game/engine.js";

test("recorded playback interpolates actual timestamps, clamps ends and handles duplicate final samples", () => {
  const frame = (t, x, out = false) => ({
    t,
    p: [{ x, y: x, a: x, z: x, vx: 1, vy: 2, roll: x, out, outT: 0.035 }],
  });
  const rec = [
    frame(0, 0),
    frame(0.02, 2),
    frame(0.035, 3.5),
    frame(0.035, 3.5, true),
  ];
  for (const time of [0, 0.01, 0.02, 0.03, 0.034]) {
    const result = interpolateRecording(rec, time);
    assert.ok(Math.abs(result.p[0].x - time * 100) < 1e-10);
    assert.equal(result.p[0].out, false);
  }
  assert.equal(interpolateRecording(rec, -1).p[0].x, 0);
  assert.equal(interpolateRecording(rec, 10).p[0].x, 3.5);
  assert.equal(interpolateRecording(rec, 0.035).p[0].out, true);
  assert.deepEqual(interpolateRecording([rec[0]], 10), rec[0]);
  assert.equal(interpolateRecording([], 0), null);
  assert.equal(interpolateRecording(rec, NaN).p[0].x, 0);
});

test("playback lands on every real physics sample at 30, 60 and 120 Hz recordings", () => {
  const engine = createGameEngine(),
    state = engine.newState(["ball", "gel"], engine.rng(42), 0);
  for (const interval of [1 / 30, 1 / 60, 1 / 120]) {
    const shot = engine.shoot(
      state.pens,
      0,
      { ang: -Math.PI / 2, pow: 0.8, off: 0 },
      { record: interval, afterOut: 0.45 },
    );
    for (const sample of shot.rec) {
      const frame = interpolateRecording(shot.rec, sample.t);
      for (let i = 0; i < 2; i++)
        for (const key of ["x", "y", "z", "a", "roll"]) {
          assert.ok(Number.isFinite(frame.p[i][key]));
          assert.ok(Math.abs(frame.p[i][key] - sample.p[i][key]) < 1e-8);
        }
    }
  }
});

test("impact accents never crawl and normal speed returns after 155 ms of simulation", () => {
  assert.equal(impactPlaybackRate(1, 1), 0.75);
  assert.equal(impactPlaybackRate(1.2, 1), 1);
  assert.equal(impactPlaybackRate(1, null), 1);
  assert.equal(impactPlaybackRate(1, 1, 4), 3);
  let simulated = 0,
    wall = 0;
  while (simulated < 4) {
    simulated += impactPlaybackRate(simulated, 1) / 120;
    wall += 1 / 120;
  }
  assert.ok(
    wall < 4.1,
    "slow motion adds less than a tenth of a second per shot",
  );
});
test("replay is bounded around the decisive event instead of replaying the whole shot", () => {
  const events = [
    { type: "hit", t: 0.7 },
    { type: "out", t: 3.5 },
  ];
  const clip = replayWindow(events, 4.8);
  assert.ok(clip.start > 3 && clip.end < 4.1);
  assert.ok((clip.end - clip.start) / 0.9 < 1.1);
  assert.deepEqual(replayWindow([], 0.1), { start: 0, end: 0.1 });
});
test("reaching is smooth and wrists stay within a comfortable forward range", () => {
  assert.equal(reachProgress(0), 0);
  assert.equal(reachProgress(1), 1);
  assert.ok(reachProgress(0.001) < 0.000001);
  let previous = 0;
  for (let i = 0; i <= 100; i++) {
    const value = reachProgress(i / 100);
    assert.ok(value >= previous && value <= 1);
    previous = value;
  }
  for (const forward of [-Math.PI / 2, Math.PI / 2])
    for (let angle = -Math.PI; angle < Math.PI; angle += 0.2) {
      const yaw = handAngle(forward, forward, angle) - forward;
      assert.ok(Math.abs(yaw) <= 1.150001);
    }
});
