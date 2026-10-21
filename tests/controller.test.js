import test from "node:test";
import assert from "node:assert/strict";
import { controllerFixture } from "./helpers/controller.js";

test("an overbalanced pen lands, scores once and releases the hand before playback", async (t) => {
  const f = controllerFixture(t, { realCharacters: true, stepMs: 16 });
  f.ui.set({
    settings: { ...f.ui.get().settings, replay: false },
    preferences: {
      ...f.ui.get().preferences,
      pvp: { ...f.ui.get().preferences.pvp, goal: 1 },
    },
  });
  const shoot = f.engine.shoot;
  f.engine.shoot = (pens, who, act, options) => {
    const overhanging = pens.map((p) => ({ ...p }));
    Object.assign(overhanging[who], { x: 66, y: 50, a: 0, vx: 0, vy: 0, w: 0 });
    return shoot(overhanging, who, { ...act, pow: 0 }, options);
  };
  let releasedFrames = 0,
    landed = false;
  const setPen = f.world.setPen;
  f.world.setPen = (slot, state) => {
    setPen(slot, state);
    if (slot !== 0 || !f.shots.length) return;
    assert.equal(
      f.world.students[0].contactTarget,
      null,
      "no contact target follows the falling pen",
    );
    assert.equal(f.world.students[0].goal, null);
    releasedFrames++;
    landed ||= !!state.landed;
  };
  f.controller.start("pvp");
  await f.advance(180);
  const point = f.point();
  f.pointer("pointerdown", point);
  f.pointer("pointerup", { x: point.x + 80, y: point.y + 50 });
  await f.advance(750);
  assert.equal(f.shots.length, 1);
  assert.ok(releasedFrames > 10);
  assert.equal(landed, true);
  assert.deepEqual(f.ui.get().scores, [0, 1]);
  assert.ok(f.ui.get().end);
  assert.equal(f.soundCalls.filter((c) => c.method === "drop").length, 1);
});

test("page turns suspend classroom rendering and resume without blocking gameplay", async (t) => {
  const f = controllerFixture(t, { stepMs: 16 });
  let renders = 0;
  const ambientSteps = [];
  f.world.render = () => renders++;
  f.world.ambient = (dt) => ambientSteps.push(dt);
  await f.advance();
  assert.equal(renders, 1);
  f.ui.set({ menuTurning: true });
  await f.advance(20);
  assert.equal(renders, 1);
  assert.equal(ambientSteps.length, 1);
  f.ui.set({ menuTurning: false });
  await f.advance();
  assert.equal(renders, 2);
  assert.equal(ambientSteps.length, 2);
  assert.ok(ambientSteps[1] < 0.02, "resuming does not accumulate turn time");
  f.controller.start("pvp");
  f.ui.set({ menuTurning: true });
  await f.advance();
  assert.equal(renders, 3, "a hidden menu cannot block an active match");
  f.controller.pause();
  f.controller.settings();
  await f.advance(10);
  assert.equal(renders, 3, "settings turns also leave the paused frame intact");
  f.ui.set({ menuTurning: false });
  await f.advance();
  assert.equal(renders, 4);
});

test("the menu desk uses Matador defaults and respects changed local pen selections", (t) => {
  const f = controllerFixture(t);
  const types = [];
  f.world.setPenType = (slot, kind, color) => {
    types[slot] = { kind, color };
  };
  f.controller.openMenu();
  assert.deepEqual(
    types.map(({ kind }) => kind),
    ["matador_hs", "matador_hs"],
  );
  const preferences = structuredClone(f.ui.get().preferences);
  preferences.pvp.pen1 = { pen: "gel", colors: {} };
  preferences.pvp.pen2 = {
    pen: "matador_smoothy",
    colors: { matador_smoothy: "#123456" },
  };
  f.ui.set({ preferences });
  f.controller.openMenu();
  assert.deepEqual(
    types.map(({ kind }) => kind),
    ["gel", "matador_smoothy"],
  );
  assert.equal(types[1].color, "#123456");
});

test("a configured zero AI think time does not add the fallback 800 ms pause", async (t) => {
  const f = controllerFixture(t);
  f.engine.LEVELS = structuredClone(f.engine.LEVELS);
  f.engine.LEVELS.advanced.think = 0;
  f.engine.decide = function* () {
    return {
      action: { ang: -Math.PI / 2, pow: 0.2, off: 0 },
      info: { moves: [], nodes: [], stats: {} },
    };
  };
  f.controller.start("aivai");
  let started = false,
    thinkingFrames = 0;
  for (
    let i = 0;
    i < 100 && !f.soundCalls.some((c) => c.method === "flick");
    i++
  ) {
    await f.advance();
    if (f.ui.get().thinking) started = true;
    if (started) thinkingFrames++;
  }
  assert.ok(f.soundCalls.some((c) => c.method === "flick"));
  assert.ok(
    thinkingFrames < 16,
    "zero think time must not become another 800 ms wait",
  );
});

test("simulation speeds accept only supported multipliers", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("aivai");
  for (const speed of [1, 2, 4]) {
    f.controller.setSpeed(speed);
    assert.equal(f.ui.get().speed, speed);
  }
  for (const speed of [0, -1, 3, NaN, Infinity, undefined])
    f.controller.setSpeed(speed);
  assert.equal(f.ui.get().speed, 4);
  f.controller.dispose();
  f.controller.setSpeed(2);
  assert.equal(f.ui.get().speed, 4);
});

test("Escape opens and closes the game menu from a focused input without repeat toggling", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(100);
  const key = (repeat = false) => {
    const event = new Event("keydown", { cancelable: true });
    Object.assign(event, { key: "Escape", repeat });
    Object.defineProperty(event, "target", { value: { tagName: "INPUT" } });
    f.window.dispatchEvent(event);
  };
  key();
  assert.equal(f.ui.get().paused, true);
  key(true);
  assert.equal(f.ui.get().paused, true);
  key();
  assert.equal(f.ui.get().paused, false);
});

for (const interruption of [
  "pointercancel",
  "lostpointercapture",
  "pause",
  "blur",
  "hidden",
]) {
  test(`${interruption} cancels a charged aim without firing or spending surge`, async (t) => {
    const f = controllerFixture(t);
    f.ui.set({
      preferences: {
        ...f.ui.get().preferences,
        train: { ...f.ui.get().preferences.train, pen: "premium" },
      },
    });
    f.controller.start("train");
    await f.advance(100);
    f.controller.toggleSurge();
    const p = f.point();
    f.pointer("pointerdown", p);
    f.pointer("pointermove", { x: p.x + 130, y: p.y + 90 });
    assert.ok(f.ui.get().power.value > 0.07);
    if (interruption === "pause") f.controller.pause();
    else if (interruption === "blur") f.window.dispatchEvent(new Event("blur"));
    else if (interruption === "hidden") {
      f.document.hidden = true;
      f.document.dispatchEvent(new Event("visibilitychange"));
    } else f.pointer(interruption, p);
    f.pointer("pointerup", { x: p.x + 130, y: p.y + 90 });
    await f.advance(100);
    assert.equal(f.shots.length, 0);
    assert.equal(f.captured.size, 0);
    assert.equal(f.ui.get().power, null);
    assert.equal(f.ui.get().surge.available, true);
    if (f.ui.get().paused) f.controller.resume();
    await f.advance(50);
    const retry = f.point();
    f.pointer("pointerdown", retry);
    f.pointer("pointerup", { x: retry.x + 100, y: retry.y + 80 });
    await f.advance(40);
    assert.equal(f.shots[0][2].surge, true);
    assert.equal(f.ui.get().surge.available, false);
  });
}

test("secondary mouse buttons do not begin a flick", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(100);
  f.pointer("pointerdown", f.point(), { button: 2 });
  assert.equal(f.ui.get().power, null);
  assert.equal(f.captured.size, 0);
});

for (const interruption of [
  "menu",
  "new match",
  "algorithm",
  "pause",
  "manual shot",
]) {
  test(`a pending hint cannot publish after ${interruption}`, async (t) => {
    const f = controllerFixture(t);
    f.controller.start("train");
    await f.advance(100);
    const action = { ang: 0, pow: 0.5, off: 0 };
    f.engine.decide = function* () {
      yield { algo: "astar", stats: {}, moves: [], nodes: [] };
      return {
        action,
        info: { algo: "astar", stats: {}, moves: [{ act: action }], nodes: [] },
      };
    };
    const hint = f.controller.requestHint();
    assert.equal(f.ui.get().hintBusy, true);
    if (interruption === "menu") f.controller.openMenu();
    if (interruption === "new match") f.controller.start("train");
    if (interruption === "algorithm") f.controller.changeAlgorithm("dfs");
    if (interruption === "pause") f.controller.pause();
    if (interruption === "manual shot") {
      const p = f.point();
      f.pointer("pointerdown", p);
      f.pointer("pointerup", { x: p.x + 100, y: p.y + 80 });
    }
    await f.advance(2);
    await hint;
    assert.equal(f.ui.get().hintAvailable, false);
    assert.equal(f.ui.get().hintBusy, false);
    assert.equal(f.hints.length, 0);
  });
}

test("hint application plays once and cannot be used during the AI turn", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("train");
  await f.advance(100);
  const hint = f.controller.requestHint();
  await f.advance(100);
  await hint;
  assert.equal(f.ui.get().hintAvailable, true);
  f.controller.applyHint();
  f.controller.applyHint();
  assert.equal(f.ui.get().hintReady, false);
  assert.equal(f.ui.get().hintAvailable, false);
  await f.advance(40);
  assert.equal(f.shots.length, 1);
  await f.controller.requestHint();
  assert.equal(f.ui.get().hintAvailable, false);
});

test("live decisions do not overwrite the selected algorithm or AI score labels", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("aivai");
  await f.advance(35);
  f.controller.changeAlgorithm("dfs");
  await f.advance(50);
  assert.equal(f.ui.get().labAlgo, "dfs");
  assert.equal(f.ui.get().names[0], "DFS");
});

test("returning to the menu cancels playback and resets transient UI", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(100);
  const p = f.point();
  f.pointer("pointerdown", p);
  f.pointer("pointerup", { x: p.x + 100, y: p.y + 80 });
  await f.advance(30);
  f.controller.openMenu();
  const shots = f.shots.length;
  await f.advance(100);
  assert.equal(f.shots.length, shots);
  assert.equal(f.ui.get().mode, "menu");
  assert.equal(f.ui.get().power, null);
  assert.equal(f.ui.get().hintReady, false);
  assert.equal(f.ui.get().thinking, null);
  assert.equal(f.ui.get().replaying, false);
});

test("pause settings stay open on blur and Back returns to the pause dialog", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(100);
  f.controller.pause();
  f.controller.settings();
  f.window.dispatchEvent(new Event("blur"));
  assert.equal(f.ui.get().paused, false);
  assert.equal(f.ui.get().fromPause, true);
  assert.equal(f.ui.get().menuVisible, true);
  f.controller.back();
  assert.equal(f.ui.get().paused, true);
  assert.equal(f.ui.get().menuVisible, false);
  f.controller.resume();
  assert.equal(f.ui.get().paused, false);
});

test("quitting during a drag releases pointer capture", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(100);
  f.pointer("pointerdown", f.point());
  assert.equal(f.captured.size, 1);
  f.controller.openMenu();
  assert.equal(f.captured.size, 0);
  await f.advance(50);
  assert.equal(f.shots.length, 0);
});

test("a real knock-off updates the score, finishes the match, and Play again resets it", async (t) => {
  const f = controllerFixture(t);
  f.ui.set({
    preferences: {
      ...f.ui.get().preferences,
      pvp: { ...f.ui.get().preferences.pvp, goal: 1 },
    },
  });
  f.controller.start("pvp");
  await f.advance(100);
  const p = f.point();
  f.pointer("pointerdown", p);
  f.pointer("pointerup", { x: p.x + 600, y: p.y });
  await f.advance(300);
  assert.equal(f.shots.length, 1);
  assert.equal(
    f.ui.get().scores.reduce((a, b) => a + b, 0),
    1,
  );
  assert.ok(f.ui.get().end);
  assert.equal(f.ui.get().replaying, false);
  f.controller.start("pvp");
  await f.advance(100);
  assert.equal(f.ui.get().end, null);
  assert.deepEqual(f.ui.get().scores, [0, 0]);
  assert.equal(f.ui.get().round, 1);
});

test("floor impact audio follows paused simulation time and cannot leak into the menu", async (t) => {
  const f = controllerFixture(t);
  f.ui.set({ settings: { ...f.ui.get().settings, replay: false } });
  f.controller.start("pvp");
  await f.advance(100);
  const p = f.point();
  f.pointer("pointerdown", p);
  f.pointer("pointerup", { x: p.x + 600, y: p.y });
  for (
    let i = 0;
    i < 100 && !f.soundCalls.some((c) => c.method === "flick");
    i++
  )
    await f.advance();
  assert.ok(f.soundCalls.some((c) => c.method === "flick"));
  f.controller.pause();
  await f.advance(200);
  assert.equal(f.soundCalls.filter((c) => c.method === "drop").length, 0);
  f.controller.resume();
  await f.advance(200);
  assert.equal(f.soundCalls.filter((c) => c.method === "drop").length, 1);
  assert.ok(f.soundCalls.some((c) => c.method === "motion"));
  f.controller.openMenu();
  const count = f.soundCalls.filter((c) => c.method === "drop").length;
  await f.advance(200);
  assert.equal(f.soundCalls.filter((c) => c.method === "drop").length, count);
  assert.ok(f.soundCalls.some((c) => c.method === "reset"));
});
