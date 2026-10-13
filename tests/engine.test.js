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
