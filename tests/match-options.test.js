import test from "node:test";
import assert from "node:assert/strict";
import { createGameEngine } from "../src/game/engine.js";
import { buildMatchOptions } from "../src/game/controller/modes.js";

test("human and AI use identical pen physics and contrasting colours for every selection", () => {
  const engine = createGameEngine();
  for (const difficulty of Object.keys(engine.LEVELS)) {
    for (const pen of Object.keys(engine.PENS)) {
      for (const color of engine.PEN_CUSTOM[pen]?.swatches || [
        engine.PENS[pen].color,
      ]) {
        const selection = {
          pen,
          colors: { [pen]: color },
          difficulty,
          algorithm: "auto",
        };
        for (const mode of ["vs", "train"]) {
          const match = buildMatchOptions(
            engine,
            { name: "Tester" },
            { vs: selection, train: selection },
            mode,
          );
          assert.deepEqual(match.pens, [pen, pen]);
          assert.equal(match.penColors[0], color);
          assert.notEqual(
            match.penColors[0].toLowerCase(),
            match.penColors[1].toLowerCase(),
          );
          assert.equal(match.ai[1].level, difficulty);
          assert.deepEqual(match.humans, [true, false]);
        }
      }
    }
  }
});
test("local multiplayer keeps independent selections and disambiguates equal names", () => {
  const match = buildMatchOptions(
    createGameEngine(),
    {},
    {
      pvp: {
        name1: "Alex",
        name2: "Alex",
        goal: 5,
        pen1: { pen: "gel", colors: {} },
        pen2: { pen: "heavy", colors: {} },
      },
    },
    "pvp",
  );
  assert.deepEqual(match.pens, ["gel", "heavy"]);
  assert.deepEqual(match.names, ["Alex", "Alex (2)"]);
  assert.equal(match.goal, 5);
  assert.deepEqual(match.ai, [null, null]);
});
