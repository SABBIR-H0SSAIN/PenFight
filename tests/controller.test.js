import test from "node:test";
import assert from "node:assert/strict";
import { controllerFixture } from "./helpers/controller.js";

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
