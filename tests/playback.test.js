import test from "node:test";
import assert from "node:assert/strict";
import {
  impactPlaybackRate,
  replayWindow,
} from "../src/game/controller/playback.js";
import { reachProgress, handAngle } from "../src/features/character/motion.js";

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
