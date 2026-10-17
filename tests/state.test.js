import test from "node:test";
import assert from "node:assert/strict";
import { createUiStore, selectUiStore } from "../src/game/state/store.ts";
import { createScope } from "../src/game/controller/scope.js";
import { createBenchmarkRunner } from "../src/game/ai/benchmark.js";
import { createGameEngine } from "../src/game/engine.js";

test("unrelated state updates keep selected React snapshots stable", () => {
  const store = createUiStore(),
    hud = selectUiStore(store, ["scores", "round"]);
  const original = hud.get(),
    server = hud.getServerSnapshot();
  let notifications = 0;
  const unsubscribe = store.subscribe(() => notifications++);
  store.set({ power: { value: 0.7, surge: false } });
  assert.equal(hud.get(), original);
  store.set({ round: 2 });
  assert.notEqual(hud.get(), original);
  assert.equal(hud.get().round, 2);
  assert.equal(hud.getServerSnapshot(), server);
  store.set({ round: 2 });
  assert.equal(notifications, 2, "no notification for unchanged values");
  unsubscribe();
  store.set({ round: 3 });
  assert.equal(notifications, 2);
});
test("separate providers keep selections independent", () => {
  const a = createUiStore(),
    b = createUiStore();
  a.set({
    preferences: {
      ...a.get().preferences,
      vs: { pen: "gel", colors: {}, difficulty: "beginner" },
    },
  });
  assert.equal(b.get().preferences.vs.pen, "ball");
});
test("unmount cleanup cancels frames, timers and listeners and resolves pending frame waits", async (t) => {
  const frames = new Map();
  let id = 0;
  globalThis.requestAnimationFrame = (cb) => {
    frames.set(++id, cb);
    return id;
  };
  globalThis.cancelAnimationFrame = (value) => frames.delete(value);
  t.after(() => {
    delete globalThis.requestAnimationFrame;
    delete globalThis.cancelAnimationFrame;
  });
  const scope = createScope(),
    target = new EventTarget();
  let calls = 0;
  scope.listen(target, "move", () => calls++);
  scope.timeout(() => calls++, 1);
  scope.interval(() => calls++, 1);
  const frame = scope.nextFrame();
  scope.dispose();
  scope.dispose();
  await frame;
  scope.listen(target, "move", () => calls++);
  scope.timeout(() => calls++, 1);
  target.dispatchEvent(new Event("move"));
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(calls, 0);
  assert.equal(frames.size, 0);
});
test("stopping a benchmark cancels further round publications", async () => {
  const ui = createUiStore(),
    runner = createBenchmarkRunner(createGameEngine(), ui);
  const done = runner.run("dfs", "dls", 20, "beginner");
  runner.stop();
  const stopped = ui.get().benchmark;
  await done;
  assert.equal(ui.get().benchmark, stopped);
  assert.equal(stopped.running, false);
});

test("persisted removed algorithms fall back to supported menu defaults", async (t) => {
  const { hydrateState } = await import("../src/game/state/preferences.js");
  const saved = {
    train: { algorithm: "hybrid" },
    ai: { a: "planner", b: "bfs" },
  };
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key) =>
        key === "pfa.preferences" ? JSON.stringify(saved) : null,
    },
  });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else delete globalThis.localStorage;
  });
  const engine = createGameEngine(),
    ui = createUiStore();
  hydrateState(engine, ui);
  const preferences = ui.get().preferences;
  assert.equal(preferences.train.algorithm, "auto");
  assert.equal(preferences.ai.a, "astar");
  assert.equal(preferences.ai.b, "mcts");
});

test("completed benchmarks alternate the starting player and publish final totals", async () => {
  const ui = createUiStore(),
    starts = [];
  const engine = createGameEngine();
  engine.playRound = function* (configs, options) {
    starts.push(options.first);
    options.onDecision(0, 8);
    options.onDecision(1, 12);
    yield { roundInProgress: true, turns: 1 };
    return { winner: options.first, how: "out", turns: 2 };
  };
  await createBenchmarkRunner(engine, ui).run("dfs", "astar", 4, "advanced");
  assert.deepEqual(starts, [0, 1, 0, 1]);
  assert.equal(ui.get().benchmark.running, false);
  assert.deepEqual(ui.get().benchmark.result.wins, [2, 2]);
  assert.deepEqual(ui.get().benchmark.result.averageMs, [8, 12]);
  assert.equal(ui.get().benchmark.result.done, 4);
  assert.equal(ui.get().benchmark.result.outs, 4);
});

test("corrupt saved settings and unavailable storage recover to valid playable preferences", async (t) => {
  const { hydrateState } = await import("../src/game/state/preferences.js");
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  t.after(() => {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else delete globalThis.localStorage;
  });
  const engine = createGameEngine();
  for (const value of [
    null,
    [],
    "bad",
    {
      vol: 900,
      friction: -9,
      quality: "bad",
      tableSurface: "bad",
      name: "a".repeat(40),
    },
  ]) {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: { getItem: () => JSON.stringify(value) },
    });
    const ui = createUiStore();
    hydrateState(engine, ui);
    assert.ok(ui.get().settings.vol >= 0 && ui.get().settings.vol <= 1);
    assert.ok(
      ui.get().settings.friction >= 0.8 && ui.get().settings.friction <= 1.1,
    );
    assert.ok(ui.get().settings.name.length <= 14);
    assert.ok(
      ["auto", "low", "medium", "high"].includes(ui.get().settings.quality),
    );
    assert.ok(
      ["oak", "maple", "walnut"].includes(ui.get().settings.tableSurface),
    );
  }
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem() {
        throw new Error("Storage disabled");
      },
    },
  });
  assert.doesNotThrow(() => hydrateState(engine, createUiStore()));
});
