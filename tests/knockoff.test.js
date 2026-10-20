import test from "node:test";
import assert from "node:assert/strict";
import { createGameEngine } from "../src/game/engine.js";
import { roundOutcome } from "../src/game/physics/outcome.js";
import { createShotEvaluator } from "../src/game/ai/evaluation.js";
import { createBenchmarkRunner } from "../src/game/ai/benchmark.js";
import { createUiStore } from "../src/game/state/store.ts";
import { interpolateRecording } from "../src/game/controller/playback.js";
import { controllerFixture } from "./helpers/controller.js";

const noFlick = { ang: 0, pow: 0, off: 0 };

function fallingPens(pens, sides = [0, 1]) {
  return pens.map((p, i) => ({
    ...p,
    x: sides.includes(i) ? 60 + p.r - 0.1 : 30,
    y: i ? 80 : 20,
    a: Math.PI / 2,
    vx: sides.includes(i) ? 30 : 0,
    vy: 0,
    w: 0,
    mu: 0,
  }));
}

test("knock-off points follow both fallen pens, independently of the shooter", () => {
  assert.equal(roundOutcome(-1), null);
  assert.deepEqual(roundOutcome(0), { winner: 1, points: [0, 1], how: "out" });
  assert.deepEqual(roundOutcome(1), { winner: 0, points: [1, 0], how: "out" });
  assert.deepEqual(roundOutcome(2), { winner: -1, points: [1, 1], how: "out" });
});

for (const real of [true, false]) {
  for (const who of [0, 1]) {
    for (const first of [0, 1]) {
      for (const delayed of [false, true]) {
        test(`both falls score: real=${real}, shooter=${who}, first=${first}, delayed=${delayed}`, () => {
          const e = createGameEngine();
          e.setRealism(real);
          const pens = [20, 80].map((y) =>
            e.makePen("ball", 60.9, y, Math.PI / 2),
          );
          pens.forEach((p) => {
            p.mu = 0;
            p.vx = 30;
          });
          if (delayed) pens[1 - first].x = 30;
          const before = structuredClone(pens);
          const results = [0, 0.45].map((afterOut) =>
            e.shoot(pens, who, noFlick, {
              afterOut,
              record: 1 / 60,
              maxT: 4.8,
            }),
          );
          assert.deepEqual(pens, before);
          for (const res of results) {
            assert.equal(res.out, 2);
            assert.deepEqual(
              res.pens.map((p) => p.out),
              [true, true],
            );
            assert.equal(
              res.events.filter((ev) => ev.type === "out").length,
              2,
            );
            assert.deepEqual(roundOutcome(res.out).points, [1, 1]);
            if (delayed)
              assert.ok(res.pens[1 - first].outT - res.pens[first].outT > 0.45);
            else assert.equal(res.pens[0].outT, res.pens[1].outT);
          }
        });
      }
    }
  }
}

test("one falling pen does not give the surviving player an extra fall", () => {
  const e = createGameEngine();
  const pens = [
    e.makePen("ball", 60.9, 20, Math.PI / 2),
    e.makePen("ball", 40, 80, 0),
  ];
  pens[0].vx = 30;
  pens[0].mu = 0;
  pens[1].vx = 2;
  const res = e.shoot(pens, 0, noFlick, { afterOut: 0.45 });
  assert.equal(res.out, 0);
  assert.equal(res.pens[1].out, false);
  assert.deepEqual(roundOutcome(res.out).points, [0, 1]);
});

test("pens remain balanced when their centres are on the desk, despite overhanging ends", () => {
  const e = createGameEngine();
  for (const type of Object.keys(e.PENS)) {
    const r = e.PENS[type].r;
    for (const [x, y, a] of [
      [1, 50, 0],
      [59, 50, 0],
      [30, 1, Math.PI / 2],
      [30, 99, Math.PI / 2],
      [r / 2, 50, Math.PI / 2],
      [60 - r / 2, 50, Math.PI / 2],
      [30, r / 2, 0],
      [30, 100 - r / 2, 0],
    ]) {
      const p = e.makePen(type, x, y, a);
      assert.equal(e.hasTableSupport(p), true, `${type} at ${x},${y}`);
      const res = e.shoot([p, e.makePen("ball", 30, 25, 0)], 0, noFlick);
      assert.equal(res.out, -1);
      assert.equal(res.pens[0].z, 0);
    }
    // The capsule's bounding box overlaps this corner, but its barrel does not.
    assert.equal(
      e.hasTableSupport(e.makePen(type, -2, -2, -Math.PI / 4)),
      false,
    );
  }
});

test("sliding and spinning falls record balance loss and finish landing, including playback", () => {
  const e = createGameEngine();
  let falls = 0;
  for (const real of [true, false]) {
    e.setRealism(real);
    for (const type of Object.keys(e.PENS)) {
      for (const [x, y, normal] of [
        [59, 65, 0],
        [1, 65, Math.PI],
        [35, 99, Math.PI / 2],
        [35, 1, -Math.PI / 2],
      ]) {
        for (const [angle, spin] of [
          [0, 0],
          [Math.PI / 2, 0],
          [Math.PI / 4, 8],
          [(3 * Math.PI) / 4, -8],
        ]) {
          const p = e.makePen(type, x, y, normal + angle);
          p.vx = 40 * Math.cos(normal);
          p.vy = 40 * Math.sin(normal);
          p.w = spin;
          const other = e.makePen("ball", 20, 30, 0);
          const res = e.shoot([p, other], 0, noFlick, {
            record: 1 / 60,
            afterOut: 0.45,
            maxT: 4.8,
          });
          if (!res.pens[0].out) continue;
          falls++;
          const departure = res.rec.find((f) => f.t === res.pens[0].outT);
          assert.ok(
            departure,
            "record the exact loss of support before interpolating gravity",
          );
          assert.equal(departure.p[0].z, 0);
          assert.equal(res.pens[0].landed, true);
          assert.equal(
            res.events.filter((e) => e.type === "landing" && e.who === 0)
              .length,
            1,
          );
          for (let t = 0; t < res.t; t += 1 / 240) {
            const state = { ...p, ...interpolateRecording(res.rec, t).p[0] };
            if (state.z < 0 && state.z > -4 - p.L / 2 - 2 * p.r) {
              assert.equal(
                state.tipAngle > 0 || !e.overlapsTable(state),
                true,
                `${type}, real=${real}, edge=${normal}, spin=${spin}, t=${t}`,
              );
            }
          }
        }
      }
    }
  }
  assert.ok(falls > 50, "exercise actual falls across models and edges");
});

test("AI evaluation counts a shared fall as both a point and self-fall risk", () => {
  const e = createGameEngine();
  e.shoot = () => ({
    out: 2,
    pens: [{ out: true }, { out: true }],
    hit: true,
    minGap: 0,
  });
  for (const me of [0, 1]) {
    const result = createShotEvaluator(e)({}, me, noFlick, { samples: 1 });
    assert.equal(result.pSucc, 1);
    assert.equal(result.pSelf, 1);
    assert.equal(result.E, 0.5);
  }
});

test("headless rounds and benchmarks award both points for a shared fall", async () => {
  const e = createGameEngine();
  e.decide = function* () {
    return { action: noFlick };
  };
  e.shoot = () => ({ out: 2, pens: [{ out: true }, { out: true }], hit: true });
  assert.deepEqual(e.runSync(e.playRound([{}, {}], { seed: 10 })), {
    winner: -1,
    points: [1, 1],
    how: "out",
    turns: 1,
  });
  const ui = createUiStore();
  await createBenchmarkRunner(e, ui).run("dfs", "astar", 2, "advanced");
  assert.deepEqual(ui.get().benchmark.result.wins, [2, 2]);
});

for (const replay of [true, false]) {
  test(`shared fall updates both HUD scores and ends a tied match fairly, replay=${replay}`, async (t) => {
    const f = controllerFixture(t);
    f.ui.set({
      settings: { ...f.ui.get().settings, replay },
      preferences: {
        ...f.ui.get().preferences,
        pvp: { ...f.ui.get().preferences.pvp, goal: 1 },
      },
    });
    const shoot = f.engine.shoot;
    f.engine.shoot = (pens, who, _act, opts) =>
      shoot(fallingPens(pens), who, noFlick, opts);
    f.controller.start("pvp");
    await f.advance(100);
    const p = f.point();
    f.pointer("pointerdown", p);
    f.pointer("pointerup", { x: p.x + 600, y: p.y });
    await f.advance(400);
    assert.deepEqual(f.ui.get().scores, [1, 1]);
    assert.deepEqual(f.world.board.scores, [1, 1]);
    assert.equal(f.ui.get().end.title, "Match drawn");
    assert.match(f.ui.get().end.subtitle, /1 – 1 · 1 rounds/);
    assert.equal(f.ui.get().replaying, false);
    assert.ok(f.world.students.every((s) => s.react.kind === "happy"));
    f.controller.start("pvp");
    await f.advance(100);
    assert.deepEqual(f.ui.get().scores, [0, 0]);
  });
}

test("a shared round below the goal advances play and preserves a later outright winner", async (t) => {
  const f = controllerFixture(t);
  f.ui.set({
    settings: { ...f.ui.get().settings, replay: false },
    preferences: {
      ...f.ui.get().preferences,
      pvp: { ...f.ui.get().preferences.pvp, goal: 2 },
    },
  });
  const shoot = f.engine.shoot;
  let shots = 0;
  f.engine.shoot = (pens, who, _act, opts) =>
    shoot(fallingPens(pens, shots++ ? [1] : [0, 1]), who, noFlick, opts);
  f.controller.start("pvp");
  await f.advance(100);
  let p = f.point();
  f.pointer("pointerdown", p);
  f.pointer("pointerup", { x: p.x + 600, y: p.y });
  await f.advance(200);
  assert.deepEqual(f.ui.get().scores, [1, 1]);
  assert.equal(f.ui.get().round, 2);
  assert.equal(f.ui.get().turn.who, 1);
  assert.equal(f.ui.get().end, null);
  p = f.point(1);
  f.pointer("pointerdown", p);
  f.pointer("pointerup", { x: p.x + 600, y: p.y });
  await f.advance(200);
  assert.equal(shots, 2);
  assert.deepEqual(f.ui.get().scores, [2, 1]);
  assert.match(f.ui.get().end.title, /wins the series/);
  assert.equal(f.ui.get().end.title, `${f.ui.get().names[0]} wins the series`);
});
