import test from "node:test";
import assert from "node:assert/strict";
import { createGameEngine } from "../src/game/engine.js";

for (const algorithm of Object.keys(createGameEngine().ALGOS)) {
  test(`${algorithm} produces a finite playable action without mutating the match`, () => {
    const engine = createGameEngine();
    const state = engine.newState(["ball", "gel"], engine.rng(31), 0);
    const before = structuredClone(state);
    const result = engine.runSync(
      engine.decide(state, 0, {
        algo: algorithm,
        seed: 1234,
        budgetScale: 0.02,
        mem: engine.newMemory("advanced"),
      }),
    );
    for (const key of ["ang", "pow", "off"])
      assert.ok(Number.isFinite(result.action[key]), key);
    assert.ok(result.action.pow > 0 && result.action.pow <= 1.05);
    assert.deepEqual(state, before);
    const shot = engine.shoot(state.pens, 0, result.action);
    for (const pen of shot.pens)
      for (const key of ["x", "y", "vx", "vy", "a"])
        assert.ok(Number.isFinite(pen[key]));
    assert.deepEqual(state, before);
  });
}
test("separate sessions do not share physics settings", () => {
  const a = createGameEngine(),
    b = createGameEngine();
  const state = b.newState(["ball", "ball"], b.rng(99), 0);
  const action = { ang: 1.2, pow: 0.5, off: 0.2 };
  const before = b.shoot(state.pens, 0, action);
  a.setFriction(0.8);
  a.setRealism(false);
  assert.deepEqual(b.shoot(state.pens, 0, action), before);
});

for (const pen of Object.keys(createGameEngine().PENS)) {
  test(`${pen} collisions and recorded playback remain finite at both friction limits`, () => {
    const engine = createGameEngine();
    for (const friction of [0.8, 1.1]) {
      engine.setFriction(friction);
      for (const realism of [true, false]) {
        engine.setRealism(realism);
        for (const opponent of Object.keys(engine.PENS)) {
          const state = engine.newState([pen, opponent], engine.rng(42), 0);
          const before = structuredClone(state);
          const shot = engine.shoot(
            state.pens,
            0,
            { ang: -Math.PI / 2, pow: 1, off: 0.8, surge: pen === "premium" },
            { record: 1 / 60, maxT: 4.8 },
          );
          assert.deepEqual(state, before);
          assert.ok([-1, 0, 1, 2].includes(shot.out));
          assert.ok(shot.rec.length > 1);
          let last = -1;
          for (const frame of shot.rec) {
            assert.ok(frame.t >= last);
            last = frame.t;
            for (const p of frame.p)
              for (const key of ["x", "y", "z", "vx", "vy", "a", "roll"])
                assert.ok(
                  Number.isFinite(p[key]),
                  `${pen}/${opponent}: ${key}`,
                );
          }
        }
      }
    }
  });
}
