import test from "node:test";
import assert from "node:assert/strict";
import { controllerFixture } from "./helpers/controller.js";
import { gameConfig } from "../src/config/config.ts";

const touch = (pointerId) => ({
  pointerId,
  pointerType: "touch",
  isPrimary: pointerId === 1,
});

test("pen protection covers every model and camera preset with mouse, touch and stylus", async (t) => {
  for (const pen of Object.keys(gameConfig.pens))
    await t.test(pen, async (t) => {
      const f = controllerFixture(t),
        preferences = f.ui.get().preferences;
      f.ui.set({
        preferences: {
          ...preferences,
          pvp: {
            ...preferences.pvp,
            pen1: { pen, colors: {} },
            pen2: { pen, colors: {} },
          },
        },
      });
      f.controller.start("pvp");
      await f.advance(100);
      for (const width of [360, 1280])
        for (const preset of ["overview", "top", "side", "player"]) {
          f.canvas.clientWidth = width;
          f.window.dispatchEvent(new Event("resize"));
          f.controller.setCameraPreset(preset);
          for (const zoom of [0.5, 2]) {
            f.controller.setCameraZoom(zoom);
            await f.advance(60);
            for (const pointerType of ["mouse", "touch", "pen"])
              for (const who of [0, 1]) {
                const center = f.point(who),
                  start = {
                    x: center.x + (pointerType === "touch" ? 30 : 18),
                    y: center.y,
                  };
                const camera = { ...f.ui.get().camera };
                const extra = { pointerId: 1, pointerType };
                f.pointer("pointerdown", start, extra);
                f.pointer(
                  "pointermove",
                  { x: start.x + 80, y: start.y + 25 },
                  extra,
                );
                f.pointer("pointercancel", start, extra);
                await f.advance();
                assert.equal(f.ui.get().camera.azimuth, camera.azimuth);
                assert.equal(f.ui.get().camera.elevation, camera.elevation);
                assert.equal(f.captured.size, 0);
              }
          }
        }
      assert.equal(f.shots.length, 0);
    });
});

test("pinch starts with nearly coincident fingers and cleans up through settings, blur and menu", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(100);
  const start = () => {
    f.pointer("pointerdown", { x: 10, y: 200 }, touch(1));
    f.pointer("pointerdown", { x: 12, y: 200 }, touch(2));
    f.pointer("pointermove", { x: 40, y: 200 }, touch(2));
    assert.ok(Number.isFinite(f.ui.get().camera.zoom));
    f.pointer("pointermove", { x: 70, y: 200 }, touch(2));
    assert.ok(f.ui.get().camera.zoom >= 1);
  };
  start();
  f.controller.settings();
  assert.equal(f.captured.size, 0);
  f.controller.back();
  f.controller.resume();
  start();
  f.window.dispatchEvent(new Event("blur"));
  assert.equal(f.captured.size, 0);
  assert.equal(f.ui.get().paused, true);
  f.controller.resume();
  start();
  f.controller.openMenu();
  assert.equal(f.captured.size, 0);
  assert.equal(f.ui.get().mode, "menu");
  assert.equal(f.shots.length, 0);
});

test("wheel zoom handles pixel, line and page deltas and Safari ignores invalid/out-of-sequence scales", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(100);
  for (const [deltaMode, deltaY] of [
    [0, -16],
    [1, -1],
    [2, -16 / f.canvas.clientHeight],
  ]) {
    f.controller.resetCamera();
    const event = Object.assign(new Event("wheel", { cancelable: true }), {
      ctrlKey: true,
      deltaMode,
      deltaY,
    });
    f.canvas.dispatchEvent(event);
    assert.ok(
      Math.abs(
        f.ui.get().camera.zoom -
          Math.exp(16 * gameConfig.input.wheelZoomSensitivity),
      ) < 1e-8,
    );
    assert.equal(event.defaultPrevented, true);
  }
  const gesture = (type, scale) =>
    f.canvas.dispatchEvent(
      Object.assign(new Event(type, { cancelable: true }), { scale }),
    );
  const zoom = f.ui.get().camera.zoom;
  gesture("gesturechange", 2);
  assert.equal(f.ui.get().camera.zoom, zoom);
  gesture("gesturestart", 1);
  for (const scale of [0, -1, NaN, Infinity]) gesture("gesturechange", scale);
  assert.equal(f.ui.get().camera.zoom, zoom);
  gesture("gestureend", 1);
  gesture("gesturechange", 0.5);
  assert.equal(f.ui.get().camera.zoom, zoom);
  f.controller.pause();
  gesture("gesturestart", 1);
  gesture("gesturechange", 2);
  assert.equal(f.ui.get().camera.zoom, zoom);
});

test("nearby presses on either pen never rotate the camera across screen sizes and zooms", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(120);
  for (const width of [1000, 320]) {
    f.canvas.clientWidth = width;
    for (const zoom of [0.5, 1, 2]) {
      f.controller.setCameraZoom(zoom);
      await f.advance(80);
      for (const who of [0, 1]) {
        const center = f.point(who),
          point = { x: center.x + 20, y: center.y + 8 };
        const angle = { ...f.ui.get().camera };
        f.pointer("pointerdown", point);
        f.pointer("pointermove", { x: point.x + 80, y: point.y + 40 });
        f.pointer("pointercancel", point);
        await f.advance(5);
        assert.equal(f.ui.get().camera.azimuth, angle.azimuth);
        assert.equal(f.ui.get().camera.elevation, angle.elevation);
      }
    }
  }
  assert.equal(f.shots.length, 0);
  const p = f.point(f.ui.get().turn.who);
  f.pointer("pointerdown", { x: p.x + 15, y: p.y });
  f.pointer("pointerup", { x: p.x + 15, y: p.y });
  await f.advance(20);
  assert.equal(
    f.shots.length,
    0,
    "a nearby tap cannot fire a shot without dragging",
  );
});

test("two touch pointers zoom both ways, clamp safely, and never rotate or flick", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(120);
  const a = { x: 10, y: 200 },
    b = { x: 210, y: 200 };
  const angle = f.ui.get().camera.azimuth;
  f.pointer("pointerdown", a, touch(1));
  f.pointer("pointerdown", b, touch(2));
  f.pointer("pointerdown", { x: 400, y: 300 }, touch(3));
  assert.equal(
    f.captured.size,
    2,
    "an extra finger cannot replace the pinch pair",
  );
  f.pointer("pointerup", { x: 400, y: 300 }, touch(3));
  f.pointer("pointermove", { x: 310, y: 200 }, touch(2));
  assert.equal(f.ui.get().camera.zoom, 1.5);
  f.pointer("pointermove", { x: 110, y: 200 }, touch(2));
  assert.equal(f.ui.get().camera.zoom, 0.5);
  f.pointer("pointermove", { x: 900, y: 200 }, touch(2));
  assert.equal(f.ui.get().camera.zoom, 2);
  assert.equal(f.ui.get().camera.azimuth, angle);
  f.pointer("pointerup", { x: 900, y: 200 }, touch(2));
  f.pointer("pointermove", { x: 150, y: 350 }, touch(1));
  f.pointer("pointerup", { x: 150, y: 350 }, touch(1));
  assert.equal(f.ui.get().camera.azimuth, angle);
  assert.equal(f.captured.size, 0);
  assert.equal(f.shots.length, 0);
  f.pointer("pointerdown", a, touch(1));
  f.pointer("pointermove", { x: 110, y: 220 }, touch(1));
  f.pointer("pointerup", { x: 110, y: 220 }, touch(1));
  await f.advance();
  assert.notEqual(
    f.ui.get().camera.azimuth,
    angle,
    "a fresh empty-board drag still orbits",
  );
});

test("pinching from an aimed pen cancels aiming safely and pause releases all touches", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(120);
  const p = f.point(f.ui.get().turn.who);
  f.pointer("pointerdown", p, touch(1));
  f.pointer("pointermove", { x: p.x + 80, y: p.y + 30 }, touch(1));
  f.pointer("pointerdown", { x: p.x - 100, y: p.y }, touch(2));
  f.pointer("pointermove", { x: p.x - 170, y: p.y }, touch(2));
  assert.equal(f.ui.get().power, null);
  assert.ok(f.ui.get().camera.zoom > 1);
  f.controller.pause();
  assert.equal(f.captured.size, 0);
  const zoom = f.ui.get().camera.zoom;
  f.pointer("pointermove", { x: 900, y: 500 }, touch(2));
  f.pointer("pointerup", p, touch(1));
  f.pointer("pointerup", p, touch(2));
  assert.equal(f.ui.get().camera.zoom, zoom);
  assert.equal(f.shots.length, 0);
});

test("trackpad pinch zooms the board while ordinary scrolling and active aiming do not", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(120);
  function wheel(ctrlKey, deltaY) {
    const event = Object.assign(new Event("wheel", { cancelable: true }), {
      ctrlKey,
      deltaY,
      deltaMode: 0,
    });
    f.canvas.dispatchEvent(event);
    return event;
  }
  assert.equal(wheel(false, -50).defaultPrevented, false);
  assert.equal(f.ui.get().camera.zoom, 1);
  assert.equal(wheel(true, -50).defaultPrevented, true);
  assert.ok(f.ui.get().camera.zoom > 1);
  const p = f.point(f.ui.get().turn.who);
  f.pointer("pointerdown", p);
  const zoom = f.ui.get().camera.zoom;
  assert.equal(
    wheel(true, -100).defaultPrevented,
    true,
    "pinching while aiming cannot zoom the browser page",
  );
  assert.equal(f.ui.get().camera.zoom, zoom);
  f.pointer("pointercancel", p);
  const gesture = (type, scale) =>
    f.canvas.dispatchEvent(
      Object.assign(new Event(type, { cancelable: true }), { scale }),
    );
  gesture("gesturestart", 1);
  gesture("gesturechange", 0.5);
  gesture("gestureend", 0.5);
  assert.ok(f.ui.get().camera.zoom < zoom);
  assert.equal(f.shots.length, 0);
});

test("pinch cancellation, viewport resize and disposal release pointer capture", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(120);
  const start = () => {
    f.pointer("pointerdown", { x: 5, y: 200 }, touch(1));
    f.pointer("pointerdown", { x: 205, y: 200 }, touch(2));
    f.pointer("pointermove", { x: 255, y: 200 }, touch(2));
    assert.equal(f.captured.size, 2);
  };
  start();
  const zoom = f.ui.get().camera.zoom;
  f.pointer("lostpointercapture", { x: 5, y: 200 }, touch(1));
  f.pointer("pointermove", { x: 500, y: 500 }, touch(2));
  assert.equal(f.ui.get().camera.zoom, zoom);
  f.pointer("pointercancel", { x: 500, y: 500 }, touch(2));
  assert.equal(f.captured.size, 0);
  start();
  f.canvas.clientWidth = 900;
  f.window.dispatchEvent(new Event("resize"));
  assert.equal(f.captured.size, 0);
  start();
  f.controller.dispose();
  assert.equal(f.captured.size, 0);
  const last = f.ui.get().camera;
  f.pointer("pointermove", { x: 800, y: 300 }, touch(2));
  assert.equal(f.ui.get().camera, last);
  assert.equal(f.shots.length, 0);
});
