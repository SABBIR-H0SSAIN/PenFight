import test from "node:test";
import assert from "node:assert/strict";
import { controllerFixture } from "./helpers/controller.js";
import { gameConfig } from "../src/config/config.ts";

const pose = (f) => ({
  position: f.world.camera.position.toArray(),
  rotation: f.world.camera.quaternion.toArray(),
  zoom: f.world.camera.zoom,
  fov: f.world.camera.fov,
});
const touch = (pointerId) => ({
  pointerId,
  pointerType: "touch",
  isPrimary: pointerId === 1,
});

test("pin freezes the rendered pose mid-transition and blocks manual controls until unpinned", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(100);
  f.controller.setCameraAngle(-120, 55);
  await f.advance();
  f.controller.setCameraPinned(true);
  const pinned = pose(f),
    angle = f.ui.get().camera;
  f.controller.setCameraRotation(90);
  f.controller.setCameraTilt(89);
  f.controller.setCameraZoom(2);
  f.controller.setCameraPreset("top");
  f.controller.resetCamera();
  f.pointer("pointerdown", { x: 5, y: 5 });
  f.pointer("pointermove", { x: 150, y: 90 });
  f.pointer("pointerup", { x: 150, y: 90 });
  await f.advance(100);
  assert.equal(f.ui.get().cameraPinned, true);
  assert.equal(f.ui.get().camera, angle);
  assert.deepEqual(pose(f), pinned);
  f.controller.setCameraPinned(false);
  f.controller.setCameraPreset("top");
  await f.advance(100);
  assert.equal(f.ui.get().cameraPinned, false);
  assert.notDeepEqual(pose(f), pinned);
});

test("pinned view ignores touch/trackpad zoom while pen aiming and firing remain usable", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(100);
  f.controller.setCameraPinned(true);
  const pinned = pose(f),
    angle = f.ui.get().camera;
  f.pointer("pointerdown", { x: 5, y: 150 }, touch(1));
  f.pointer("pointerdown", { x: 205, y: 150 }, touch(2));
  f.pointer("pointermove", { x: 450, y: 150 }, touch(2));
  f.pointer("pointerup", { x: 450, y: 150 }, touch(2));
  f.pointer("pointerup", { x: 5, y: 150 }, touch(1));
  f.canvas.dispatchEvent(
    Object.assign(new Event("wheel", { cancelable: true }), {
      ctrlKey: true,
      deltaY: -100,
      deltaMode: 0,
    }),
  );
  for (const type of ["gesturestart", "gesturechange", "gestureend"])
    f.canvas.dispatchEvent(
      Object.assign(new Event(type, { cancelable: true }), { scale: 2 }),
    );
  assert.equal(f.ui.get().camera, angle);
  const point = f.point(f.ui.get().turn.who);
  f.pointer("pointerdown", point);
  f.pointer("pointermove", { x: point.x + 30, y: point.y + 15 });
  assert.ok(f.ui.get().power.value > 0);
  f.pointer("pointerup", { x: point.x + 30, y: point.y + 15 });
  await f.advance(150);
  assert.equal(f.shots.length, 1);
  assert.equal(f.captured.size, 0);
  assert.deepEqual(pose(f), pinned);
});

test("pinning stops Follow exactly where it is, even if Follow is externally re-enabled", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(100);
  f.ui.set({ settings: { ...f.ui.get().settings, follow: true } });
  await f.advance(50);
  f.controller.setCameraPinned(true);
  const pinned = pose(f);
  assert.equal(f.ui.get().settings.follow, false);
  await f.advance(50);
  assert.deepEqual(pose(f), pinned);
  f.ui.set({ settings: { ...f.ui.get().settings, follow: true } });
  await f.advance(50);
  assert.deepEqual(pose(f), pinned);
  f.controller.setCameraPinned(false);
  f.controller.setCameraPreset("side");
  await f.advance(100);
  assert.notDeepEqual(pose(f), pinned);
});

test("pin survives pause/settings and resize without rotating the portrait overview", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(100);
  f.controller.setCameraPinned(true);
  const pinned = pose(f),
    angle = f.ui.get().camera;
  f.controller.pause();
  f.controller.settings();
  f.controller.setCameraPinned(false);
  assert.equal(f.ui.get().cameraPinned, true);
  f.controller.back();
  f.controller.resume();
  f.canvas.clientWidth = 320;
  f.window.dispatchEvent(new Event("resize"));
  await f.advance(50);
  assert.equal(f.ui.get().camera, angle);
  assert.deepEqual(pose(f).position, pinned.position);
  assert.deepEqual(pose(f).rotation, pinned.rotation);
  assert.ok(f.world.camera.projectionMatrix.elements.every(Number.isFinite));
});

test("Player turn changes, knock-offs and replay/end cameras cannot move a pinned view", async (t) => {
  const f = controllerFixture(t),
    p = f.ui.get().preferences;
  f.ui.set({ preferences: { ...p, pvp: { ...p.pvp, goal: 1 } } });
  f.controller.start("pvp");
  await f.advance(100);
  f.controller.setCameraPreset("player");
  await f.advance(100);
  f.controller.setCameraPinned(true);
  const pinned = pose(f),
    angle = f.ui.get().camera;
  let point = f.point(f.ui.get().turn.who);
  f.pointer("pointerdown", point);
  f.pointer("pointerup", { x: point.x + 20, y: point.y + 10 });
  await f.advance(200);
  assert.equal(f.ui.get().turn.who, 1);
  assert.equal(f.ui.get().camera, angle);
  assert.deepEqual(pose(f), pinned);
  point = f.point(1);
  f.pointer("pointerdown", point);
  f.pointer("pointerup", { x: point.x + 600, y: point.y });
  await f.advance(500);
  assert.ok(f.ui.get().end);
  assert.equal(f.ui.get().cameraPinned, true);
  assert.deepEqual(pose(f), pinned);
  f.controller.openMenu();
  assert.equal(f.ui.get().cameraPinned, false);
  f.controller.start("pvp");
  await f.advance(100);
  assert.equal(f.ui.get().cameraPinned, false);
  f.controller.setCameraRotation(60);
  assert.equal(f.ui.get().camera.azimuth, 60);
});

test("pinning cancels existing orbit/pinch capture and ignores invalid, aiming and disposed requests", async (t) => {
  const f = controllerFixture(t);
  f.controller.setCameraPinned(true);
  assert.equal(f.ui.get().cameraPinned, false);
  f.controller.start("pvp");
  await f.advance(100);
  f.pointer("pointerdown", { x: 5, y: 5 });
  f.pointer("pointermove", { x: 70, y: 40 });
  f.controller.setCameraPinned(true);
  assert.equal(f.captured.size, 0);
  const pinned = pose(f);
  f.pointer("pointermove", { x: 140, y: 80 });
  f.pointer("pointerup", { x: 140, y: 80 });
  await f.advance(50);
  assert.deepEqual(pose(f), pinned);
  f.controller.setCameraPinned(false);
  const point = f.point(f.ui.get().turn.who);
  f.pointer("pointerdown", point);
  f.controller.setCameraPinned(true);
  assert.equal(f.ui.get().cameraPinned, false);
  f.pointer("pointercancel", point);
  for (const invalid of [undefined, null, "true", 1])
    f.controller.setCameraPinned(invalid);
  assert.equal(f.ui.get().cameraPinned, false);
  f.pointer("pointerdown", { x: 5, y: 150 }, touch(1));
  f.pointer("pointerdown", { x: 205, y: 150 }, touch(2));
  f.controller.setCameraPinned(true);
  assert.equal(f.captured.size, 0);
  f.controller.dispose();
  f.controller.setCameraPinned(false);
  assert.equal(f.ui.get().cameraPinned, true);
});

test("configuration can start a new match pinned at its safe default view", async (t) => {
  const previous = gameConfig.camera.defaultPinned;
  gameConfig.camera.defaultPinned = true;
  t.after(() => {
    gameConfig.camera.defaultPinned = previous;
  });
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(100);
  assert.equal(f.ui.get().cameraPinned, true);
  assert.equal(f.ui.get().camera.preset, "overview");
  assert.ok(f.world.camera.position.y > 0 && f.world.camera.position.y < 190);
  const pinned = pose(f);
  await f.advance(100);
  assert.deepEqual(pose(f), pinned);
});
