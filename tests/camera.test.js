import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  CAMERA_PRESETS,
  DESK_CAMERA_RADIUS,
  cameraAngle,
  deskCamera,
  deskFov,
  overviewCamera,
  interpolateOrbit,
} from "../src/game/controller/camera.js";
import { controllerFixture } from "./helpers/controller.js";

test("configured Player-view rotation survives a turn change", async (t) => {
  const original = CAMERA_PRESETS.player.azimuth;
  CAMERA_PRESETS.player.azimuth = 20;
  t.after(() => {
    CAMERA_PRESETS.player.azimuth = original;
  });
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(100);
  f.controller.setCameraPreset("player");
  await f.advance(100);
  assert.equal(f.ui.get().camera.azimuth, 20);
  const point = f.point(f.ui.get().turn.who);
  f.pointer("pointerdown", point);
  f.pointer("pointerup", { x: point.x + 20, y: point.y + 10 });
  await f.advance(200);
  assert.equal(f.ui.get().turn.who, 1);
  assert.equal(f.ui.get().camera.azimuth, -160);
});

test("relative slider keypresses publish immediately instead of losing steps before the next frame", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(100);
  for (let i = 0; i < 10; i++)
    f.controller.setCameraZoom(f.ui.get().camera.zoom - 0.05);
  assert.ok(Math.abs(f.ui.get().camera.zoom - 0.5) < 0.001);
  for (let i = 0; i < 10; i++)
    f.controller.setCameraRotation(f.ui.get().camera.azimuth + 1);
  assert.equal(f.ui.get().camera.azimuth, 40);
  for (let i = 0; i < 10; i++)
    f.controller.setCameraTilt(f.ui.get().camera.elevation + 1);
  assert.equal(f.ui.get().camera.elevation, 75);
});

test("zoom changes magnification without moving the camera into scene geometry", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(100);
  const position = f.world.camera.position.clone();
  for (const zoom of [0.5, 0.75, 1, 1.5, 2]) {
    f.controller.setCameraZoom(zoom);
    await f.advance(100);
    assert.equal(f.ui.get().camera.zoom, zoom);
    assert.ok(Math.abs(f.world.camera.zoom - zoom) < 0.001);
    assert.ok(position.distanceTo(f.world.camera.position) < 0.001);
    assert.ok(f.world.camera.projectionMatrix.elements.every(Number.isFinite));
  }
});

test("zoom composes with rotation and tilt and survives presets and resizing", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(100);
  f.controller.setCameraRotation(-117);
  f.controller.setCameraTilt(55);
  f.controller.setCameraZoom(1.65);
  await f.advance();
  assert.equal(f.ui.get().camera.azimuth, -117);
  assert.equal(f.ui.get().camera.elevation, 55);
  assert.equal(f.ui.get().camera.zoom, 1.65);
  for (const preset of Object.keys(CAMERA_PRESETS)) {
    f.controller.setCameraPreset(preset);
    await f.advance(30);
    assert.equal(f.ui.get().camera.zoom, 1.65);
  }
  f.controller.setCameraPreset("overview");
  f.canvas.clientWidth = 320;
  f.canvas.clientHeight = 700;
  f.window.dispatchEvent(new Event("resize"));
  await f.advance(60);
  assert.equal(f.ui.get().camera.zoom, 1.65);
  assert.equal(f.ui.get().camera.azimuth, 0);
  f.controller.resetCamera();
  await f.advance(100);
  assert.equal(f.ui.get().camera.preset, "overview");
  assert.equal(f.ui.get().camera.zoom, 1);
  assert.ok(Math.abs(f.world.camera.zoom - 1) < 0.001);
});

test("zoom limits and invalid values cannot corrupt the projection", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(100);
  for (const [input, expected] of [
    [-100, 0.5],
    [0, 0.5],
    [0.5, 0.5],
    [2, 2],
    [100, 2],
  ]) {
    f.controller.setCameraZoom(input);
    await f.advance(60);
    assert.equal(f.ui.get().camera.zoom, expected);
  }
  const camera = f.ui.get().camera;
  for (const invalid of [NaN, Infinity, -Infinity, undefined])
    f.controller.setCameraZoom(invalid);
  await f.advance(20);
  assert.equal(f.ui.get().camera, camera);
  assert.ok(f.world.camera.projectionMatrix.elements.every(Number.isFinite));
});

test("zoom cannot disrupt a charged flick and aiming still works after zooming", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(100);
  f.controller.setCameraZoom(1.4);
  await f.advance(100);
  const point = f.point(f.ui.get().turn.who),
    camera = f.ui.get().camera;
  f.pointer("pointerdown", point);
  f.controller.setCameraZoom(2);
  f.controller.resetCamera();
  f.pointer("pointermove", { x: point.x + 80, y: point.y + 50 });
  await f.advance(10);
  assert.equal(f.ui.get().camera, camera);
  assert.ok(Math.abs(f.world.camera.zoom - 1.4) < 0.001);
  f.pointer("pointerup", { x: point.x + 80, y: point.y + 50 });
  await f.advance(50);
  assert.equal(f.shots.length, 1);
});

test("new matches reset zoom and disposed controllers ignore zoom changes", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(100);
  f.controller.setCameraZoom(2);
  await f.advance(60);
  f.controller.start("pvp");
  await f.advance(100);
  assert.equal(f.ui.get().camera.zoom, 1);
  f.controller.dispose();
  const camera = f.ui.get().camera;
  f.controller.setCameraZoom(0.5);
  assert.equal(f.ui.get().camera, camera);
});

test("portrait overview keeps the desk readable instead of framing the whole classroom", () => {
  for (const [width, height] of [
    [320, 700],
    [390, 800],
    [430, 900],
  ]) {
    const aspect = width / height,
      angle = overviewCamera(aspect),
      camera = new THREE.PerspectiveCamera(45, aspect, 1, 1500),
      target = new THREE.Vector3();
    assert.equal(angle.azimuth, 0);
    camera.fov = deskCamera(angle, aspect, camera.position, target);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    const corners = [-30, 30].flatMap((x) =>
      [-50, 50].map((z) => new THREE.Vector3(x, 0, z).project(camera)),
    );
    const occupiedWidth =
      (Math.max(...corners.map((p) => p.x)) -
        Math.min(...corners.map((p) => p.x))) /
      2;
    const occupiedHeight =
      (Math.max(...corners.map((p) => p.y)) -
        Math.min(...corners.map((p) => p.y))) /
      2;
    assert.ok(occupiedWidth > 0.85, "desk uses at least 85% of phone width");
    assert.ok(occupiedHeight > 0.55, "pens remain large enough to aim at");
  }
});

test("resizing the default view adapts it to portrait without changing custom views", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(100);
  f.canvas.clientWidth = 320;
  f.canvas.clientHeight = 700;
  f.window.dispatchEvent(new Event("resize"));
  await f.advance(60);
  assert.equal(f.ui.get().camera.azimuth, 0);
  assert.equal(f.ui.get().camera.preset, "overview");
  f.controller.setCameraAngle(-110, 70);
  await f.advance(60);
  f.canvas.clientWidth = 1200;
  f.canvas.clientHeight = 700;
  f.window.dispatchEvent(new Event("resize"));
  await f.advance(60);
  assert.equal(f.ui.get().camera.azimuth, -110);
});

test("all camera angles keep every desk corner in frame on phones and wide screens", () => {
  for (const aspect of [0.45, 0.7, 1, 1.43, 2.4])
    for (const angle of [
      ...Object.values(CAMERA_PRESETS),
      { azimuth: -135, elevation: 45 },
      { azimuth: 179, elevation: 89 },
    ]) {
      const camera = new THREE.PerspectiveCamera(45, aspect, 1, 1500),
        target = new THREE.Vector3();
      camera.fov = deskCamera(angle, aspect, camera.position, target);
      camera.lookAt(target);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
      for (const x of [-30, 30])
        for (const z of [-50, 50]) {
          const point = new THREE.Vector3(x, 0, z).project(camera);
          assert.ok(Math.abs(point.x) < 0.92, "horizontal clearance");
          assert.ok(Math.abs(point.y) < 0.8, "HUD clearance");
          assert.ok(point.z > -1 && point.z < 1, "visible depth");
        }
    }
});

test("overview is steady by default and manual views override follow cam", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(120);
  assert.equal(f.ui.get().camera.preset, "overview");
  assert.equal(f.ui.get().settings.follow, false);
  const position = f.world.camera.position.clone();
  await f.advance(50);
  assert.ok(position.distanceTo(f.world.camera.position) < 0.001);
  f.ui.set({ settings: { ...f.ui.get().settings, follow: true } });
  f.controller.setCameraPreset("top");
  assert.equal(f.ui.get().settings.follow, false);
  await f.advance(100);
  assert.ok(
    f.world.camera.position.y > Math.abs(f.world.camera.position.z) * 20,
  );
  f.controller.setCameraAngle(810, 0);
  await f.advance();
  assert.equal(f.ui.get().camera.azimuth, 90);
  assert.equal(f.ui.get().camera.elevation, 45);
});

test("rotating between opposite views follows an orbit without zooming through the desk", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(100);
  f.controller.setCameraAngle(90, 45);
  await f.advance(100);
  const radius = f.world.camera.position.length();
  f.controller.setCameraAngle(-90, 45);
  for (let frame = 0; frame < 80; frame++) {
    await f.advance();
    assert.ok(
      f.world.camera.position.length() >= radius * 0.99,
      "the transition must not cut through the orbit and zoom into the scene",
    );
  }
});

test("camera stays below the lights and ceiling at every angle on narrow screens", () => {
  for (const aspect of [0.2, 0.3, 0.45, 0.7, 1, 1.43, 2.4, 4])
    for (let azimuth = -180; azimuth <= 180; azimuth += 15)
      for (const elevation of [45, 55, 65, 78, 89]) {
        const camera = new THREE.PerspectiveCamera(45, aspect, 1, 1500),
          target = new THREE.Vector3();
        camera.fov = deskCamera(
          { azimuth, elevation },
          aspect,
          camera.position,
          target,
        );
        assert.ok(
          camera.position.y < 180,
          "camera must stay below ceiling fixtures",
        );
        assert.ok(
          Math.abs(camera.position.length() - DESK_CAMERA_RADIUS) < 1e-8,
        );
        camera.lookAt(target);
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld(true);
        for (const x of [-30, 30])
          for (const z of [-50, 50]) {
            const point = new THREE.Vector3(x, 0, z).project(camera);
            assert.ok(Math.abs(point.x) < 0.92 && Math.abs(point.y) < 0.8);
            assert.ok(point.z > -1 && point.z < 1);
          }
      }
});

test("all preset transitions keep a safe orbit and fit the rendered desk", () => {
  const views = [
    ...Object.values(CAMERA_PRESETS),
    { azimuth: -179, elevation: 45 },
    { azimuth: 179, elevation: 89 },
  ];
  for (const aspect of [0.2, 0.45, 0.85, 1, 1.43, 2.4, 4])
    for (const start of views)
      for (const end of views) {
        const camera = new THREE.PerspectiveCamera(45, aspect, 1, 1500),
          look = new THREE.Vector3(),
          target = new THREE.Vector3(),
          targetLook = new THREE.Vector3();
        camera.fov = deskCamera(start, aspect, camera.position, look);
        deskCamera(end, aspect, target, targetLook);
        camera.updateProjectionMatrix();
        for (let frame = 0; frame < 60; frame++) {
          interpolateOrbit(camera.position, look, target, targetLook, 0.2);
          assert.ok(
            Math.abs(camera.position.length() - DESK_CAMERA_RADIUS) < 1e-8,
          );
          assert.ok(camera.position.y < 180);
          camera.fov = deskFov(camera.position, look, aspect);
          camera.updateProjectionMatrix();
          camera.lookAt(look);
          camera.updateMatrixWorld(true);
          for (const x of [-30, 30])
            for (const z of [-50, 50]) {
              const point = new THREE.Vector3(x, 0, z).project(camera);
              assert.ok(Math.abs(point.x) < 0.92 && Math.abs(point.y) < 0.8);
            }
        }
      }
});

test("the -180/180 seam takes the short route without a full spin", () => {
  const position = new THREE.Vector3(),
    look = new THREE.Vector3(),
    target = new THREE.Vector3(),
    targetLook = new THREE.Vector3();
  deskCamera({ azimuth: 179, elevation: 65 }, 1.4, position, look);
  deskCamera({ azimuth: -179, elevation: 65 }, 1.4, target, targetLook);
  interpolateOrbit(position, look, target, targetLook, 0.5);
  assert.ok(Math.abs(position.x) < 0.001);
  assert.ok(position.z < 0, "seam crossing remains behind the desk");
});

test("the rotation slider keeps both endpoints instead of snapping its thumb across the track", () => {
  for (const [input, expected] of [
    [180, 180],
    [-180, -180],
    [540, 180],
    [-540, -180],
    [179, 179],
    [-179, -179],
  ])
    assert.equal(cameraAngle(input, 65).azimuth, expected);
});

test("rapid camera input publishes once per frame and repeated values do no work", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(100);
  let camera = f.ui.get().camera,
    publications = 0;
  const unsubscribe = f.ui.subscribe(() => {
    if (camera !== f.ui.get().camera) {
      publications++;
      camera = f.ui.get().camera;
    }
  });
  t.after(unsubscribe);
  for (let i = 0; i < 1000; i++) f.controller.setCameraAngle(i % 180, 65);
  assert.equal(publications, 0);
  await f.advance();
  assert.equal(publications, 1);
  assert.equal(f.ui.get().camera.azimuth, 999 % 180);
  for (let i = 0; i < 1000; i++) f.controller.setCameraAngle(999 % 180, 65);
  await f.advance(5);
  assert.equal(publications, 1);
});

test("drag and slider input reach the requested angle promptly", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(100);
  f.controller.setCameraAngle(90, 65);
  await f.advance(5);
  const position = f.world.camera.position;
  assert.ok(
    Math.abs((Math.atan2(position.x, position.z) * 180) / Math.PI - 90) < 1,
  );
});

test("rotation and tilt changes within the same frame compose without stale values", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(100);
  f.controller.setCameraRotation(-180);
  f.controller.setCameraTilt(89);
  await f.advance();
  assert.equal(f.ui.get().camera.azimuth, -180);
  assert.equal(f.ui.get().camera.elevation, 89);
  f.controller.setCameraTilt(45);
  f.controller.setCameraRotation(180);
  await f.advance();
  assert.equal(f.ui.get().camera.azimuth, 180);
  assert.equal(f.ui.get().camera.elevation, 45);
});

test("camera changes preserve automatic quality reductions", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(100);
  f.world.setQuality("low");
  f.ui.set({ settings: { ...f.ui.get().settings, follow: true } });
  f.controller.setCameraPreset("side");
  await f.advance(10);
  assert.equal(f.world.quality, "low");
});

test("invalid angles are ignored and tilt limits keep the projection finite", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(100);
  const original = f.ui.get().camera;
  for (const invalid of [NaN, Infinity, -Infinity, undefined]) {
    f.controller.setCameraAngle(invalid, 65);
    f.controller.setCameraAngle(30, invalid);
  }
  await f.advance();
  assert.equal(f.ui.get().camera, original);
  for (const elevation of [-1000, 0, 45, 89, 90, 1000]) {
    f.controller.setCameraAngle(1e10, elevation);
    await f.advance(50);
    assert.ok(f.world.camera.position.toArray().every(Number.isFinite));
    assert.ok(
      f.ui.get().camera.elevation >= 45 && f.ui.get().camera.elevation <= 89,
    );
  }
});

test("a drag can return to its origin without sticking at the dead zone", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(100);
  const initial = f.ui.get().camera;
  f.pointer("pointerdown", { x: 5, y: 350 });
  f.pointer("pointermove", { x: 100, y: 400 });
  f.pointer("pointermove", { x: 5, y: 350 });
  f.pointer("pointerup", { x: 5, y: 350 });
  assert.equal(f.ui.get().camera.azimuth, initial.azimuth);
  assert.equal(f.ui.get().camera.elevation, initial.elevation);
});

test("a second touch zooms without rotating or turning its remaining finger into an orbit drag", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(100);
  f.pointer("pointerdown", { x: 5, y: 350 }, { pointerType: "touch" });
  f.pointer(
    "pointerdown",
    { x: 100, y: 350 },
    { pointerId: 2, isPrimary: false, pointerType: "touch" },
  );
  f.pointer(
    "pointermove",
    { x: 500, y: 500 },
    { pointerId: 2, isPrimary: false },
  );
  f.pointer(
    "pointerup",
    { x: 500, y: 500 },
    { pointerId: 2, isPrimary: false },
  );
  assert.equal(f.captured.size, 1);
  f.pointer("pointermove", { x: 105, y: 350 }, { pointerType: "touch" });
  f.pointer("pointerup", { x: 105, y: 350 }, { pointerType: "touch" });
  assert.equal(f.captured.size, 0);
  assert.equal(f.ui.get().camera.azimuth, 30);
  assert.ok(f.ui.get().camera.zoom > 1);
  assert.equal(f.shots.length, 0);
});

test("hidden, zero-size, repeated and fullscreen-like resizes cannot corrupt the projection", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(100);
  let resizes = 0;
  const resize = f.world.resize;
  f.world.resize = function (...args) {
    resizes++;
    resize.apply(this, args);
  };
  for (const [width, height] of [
    [1000, 700],
    [0, 0],
    [0, 900],
    [320, 1100],
    [320, 1100],
    [1100, 320],
    [1920, 1080],
    [320, 1100],
  ]) {
    f.canvas.clientWidth = width;
    f.canvas.clientHeight = height;
    f.window.dispatchEvent(new Event("resize"));
    await f.advance(60);
    assert.ok(f.world.camera.position.toArray().every(Number.isFinite));
    assert.ok(f.world.camera.projectionMatrix.elements.every(Number.isFinite));
    assert.ok(f.world.camera.position.y < 180);
  }
  assert.equal(
    resizes,
    4,
    "same-size and hidden updates do not reallocate the drawing buffer",
  );
});

test("resizing during a charged flick cancels it instead of firing from a changed projection", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(100);
  const point = f.point(f.ui.get().turn.who);
  f.pointer("pointerdown", point);
  f.pointer("pointermove", { x: point.x + 100, y: point.y + 80 });
  f.canvas.clientWidth = 320;
  f.canvas.clientHeight = 900;
  f.window.dispatchEvent(new Event("resize"));
  f.pointer("pointerup", { x: point.x + 100, y: point.y + 80 });
  assert.equal(f.captured.size, 0);
  assert.equal(f.ui.get().power, null);
  await f.advance(50);
  assert.equal(f.shots.length, 0);
});

for (const preset of ["overview", "top", "side", "custom"])
  test(`${preset} stays fixed across local player turns`, async (t) => {
    const f = controllerFixture(t);
    f.controller.start("pvp");
    await f.advance(100);
    if (preset === "custom") f.controller.setCameraAngle(-125, 75);
    else f.controller.setCameraPreset(preset);
    await f.advance(100);
    const originalTurn = f.ui.get().turn.who,
      position = f.world.camera.position.clone(),
      point = f.point(originalTurn);
    f.pointer("pointerdown", point);
    f.pointer("pointerup", { x: point.x + 20, y: point.y + 10 });
    await f.advance(200);
    assert.equal(f.ui.get().turn.who, 1 - originalTurn);
    assert.ok(
      position.distanceTo(f.world.camera.position) < 0.01,
      "the overview must not flip to the other end of the desk",
    );
  });

test("Player view alone follows the active player; leaving it keeps the world angle", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(100);
  f.controller.setCameraPreset("player");
  await f.advance(100);
  const originalTurn = f.ui.get().turn.who,
    point = f.point(originalTurn);
  assert.equal(f.ui.get().camera.azimuth, originalTurn === 1 ? 180 : 0);
  f.pointer("pointerdown", point);
  f.pointer("pointerup", { x: point.x + 20, y: point.y + 10 });
  await f.advance(200);
  assert.equal(f.ui.get().turn.who, 1 - originalTurn);
  assert.equal(f.ui.get().camera.azimuth, originalTurn === 0 ? 180 : 0);
  assert.equal(
    Math.sign(f.world.camera.position.z),
    originalTurn === 0 ? -1 : 1,
  );
  const angle = f.ui.get().camera;
  f.controller.setCameraAngle(angle.azimuth, angle.elevation);
  const position = f.world.camera.position.clone();
  await f.advance(30);
  assert.ok(position.distanceTo(f.world.camera.position) < 0.01);
});

for (const mode of ["pvp", "vs", "train", "aivai"])
  test(`${mode} supports presets, pause/settings/resume, and restarting without stale camera work`, async (t) => {
    const f = controllerFixture(t);
    f.engine.decide = function* () {
      return {
        action: { ang: 0, pow: 0.1, off: 0 },
        info: { algo: "astar", stats: {}, nodes: [], moves: [] },
      };
    };
    f.controller.start(mode);
    await f.advance(100);
    for (const preset of Object.keys(CAMERA_PRESETS)) {
      f.controller.setCameraPreset(preset);
      await f.advance(10);
      assert.equal(f.ui.get().camera.preset, preset);
      assert.ok(f.world.camera.position.toArray().every(Number.isFinite));
      assert.ok(f.world.camera.position.y < 180);
    }
    f.controller.pause();
    f.controller.settings();
    const angle = f.ui.get().camera;
    f.controller.setCameraAngle(100, 70);
    await f.advance();
    assert.equal(f.ui.get().camera, angle);
    f.controller.back();
    f.controller.resume();
    f.controller.setCameraPreset("side");
    f.controller.start(mode);
    await f.advance(100);
    assert.equal(f.ui.get().camera.preset, "overview");
  });

test("follow mode can be re-enabled after manual control and manual selection exits it again", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(100);
  f.controller.setCameraPreset("top");
  await f.advance(60);
  f.ui.set({ settings: { ...f.ui.get().settings, follow: true } });
  const point = f.point(f.ui.get().turn.who);
  f.pointer("pointerdown", point);
  f.pointer("pointerup", { x: point.x + 90, y: point.y + 50 });
  for (
    let i = 0;
    i < 60 && !f.soundCalls.some((c) => c.method === "flick");
    i++
  )
    await f.advance();
  await f.advance(3);
  assert.ok(
    f.world.camera.position.y < 160,
    "follow mode moves toward the pen",
  );
  f.controller.setCameraPreset("overview");
  await f.advance(80);
  assert.equal(f.ui.get().settings.follow, false);
  assert.equal(f.ui.get().camera.preset, "overview");
});

test("Follow reacts immediately between turns and toggling off restores the board view", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(120);
  const overview = f.world.camera.position.clone();
  f.ui.set({ settings: { ...f.ui.get().settings, follow: true } });
  await f.advance(60);
  assert.equal(
    f.soundCalls.filter((call) => call.method === "flick").length,
    0,
  );
  assert.ok(
    f.world.camera.position.distanceTo(overview) > 30,
    "Follow visibly activates without firing a shot",
  );
  const followed = f.world.camera.position.clone();
  await f.advance(40);
  assert.ok(
    followed.distanceTo(f.world.camera.position) < 0.1,
    "idle following settles instead of bouncing",
  );
  const point = f.point(f.ui.get().turn.who);
  f.pointer("pointerdown", point);
  const aiming = f.world.camera.position.clone();
  await f.advance(20);
  assert.ok(
    aiming.distanceTo(f.world.camera.position) < 0.001,
    "following stays still while aiming",
  );
  f.pointer("pointercancel", point);
  f.ui.set({ settings: { ...f.ui.get().settings, follow: false } });
  await f.advance(100);
  assert.ok(overview.distanceTo(f.world.camera.position) < 0.05);
});

test("knock-off, replay, end dialog and play-again keep finite camera state", async (t) => {
  const f = controllerFixture(t);
  f.ui.set({
    preferences: {
      ...f.ui.get().preferences,
      pvp: { ...f.ui.get().preferences.pvp, goal: 1 },
    },
  });
  f.controller.start("pvp");
  await f.advance(100);
  let replayed = false;
  const unsubscribe = f.ui.subscribe(() => {
    if (f.ui.get().replaying) replayed = true;
  });
  t.after(unsubscribe);
  const point = f.point(f.ui.get().turn.who);
  f.pointer("pointerdown", point);
  f.pointer("pointerup", { x: point.x + 600, y: point.y });
  for (let frame = 0; frame < 350; frame++) {
    await f.advance();
    assert.ok(f.world.camera.position.toArray().every(Number.isFinite));
    assert.ok(f.world.camera.projectionMatrix.elements.every(Number.isFinite));
    assert.ok(f.world.camera.position.y < 180);
  }
  assert.ok(replayed);
  assert.ok(f.ui.get().end);
  assert.equal(f.ui.get().replaying, false);
  f.controller.start("pvp");
  await f.advance(100);
  assert.equal(f.ui.get().camera.preset, "overview");
  assert.equal(f.ui.get().end, null);
});

test("dragging empty canvas orbits without firing; pen drags still aim and fire", async (t) => {
  const f = controllerFixture(t);
  f.controller.start("pvp");
  await f.advance(100);
  f.pointer("pointerdown", { x: 5, y: 350 });
  assert.equal(f.captured.size, 1);
  f.pointer("pointermove", { x: 185, y: 400 });
  f.pointer("pointerup", { x: 185, y: 400 });
  assert.equal(f.captured.size, 0);
  assert.equal(f.ui.get().camera.preset, "custom");
  assert.equal(f.ui.get().power, null);
  await f.advance(100);
  assert.equal(f.shots.length, 0);
  const point = f.point(f.ui.get().turn.who);
  f.pointer("pointerdown", point);
  const angle = f.ui.get().camera;
  f.controller.setCameraPreset("side");
  assert.equal(
    f.ui.get().camera,
    angle,
    "camera controls cannot disrupt aiming",
  );
  const position = f.world.camera.position.clone();
  f.pointer("pointermove", { x: point.x + 130, y: point.y + 90 });
  await f.advance(5);
  assert.ok(position.distanceTo(f.world.camera.position) < 0.001);
  f.pointer("pointerup", { x: point.x + 130, y: point.y + 90 });
  await f.advance(40);
  assert.equal(f.shots.length, 1);
});

for (const interruption of [
  "pointercancel",
  "lostpointercapture",
  "pause",
  "menu",
  "blur",
  "hidden",
  "settings",
  "resize",
  "dispose",
])
  test(`${interruption} releases a camera drag without changing the next angle`, async (t) => {
    const f = controllerFixture(t);
    f.controller.start("pvp");
    await f.advance(100);
    f.pointer("pointerdown", { x: 5, y: 350 });
    if (interruption === "pause") f.controller.pause();
    else if (interruption === "menu") f.controller.openMenu();
    else if (interruption === "blur") f.window.dispatchEvent(new Event("blur"));
    else if (interruption === "hidden") {
      f.document.hidden = true;
      f.document.dispatchEvent(new Event("visibilitychange"));
    } else if (interruption === "settings") f.controller.settings();
    else if (interruption === "dispose") f.controller.dispose();
    else if (interruption === "resize") {
      f.canvas.clientWidth = 320;
      f.window.dispatchEvent(new Event("resize"));
    } else f.pointer(interruption, { x: 5, y: 350 });
    assert.equal(f.captured.size, 0);
    const angle = f.ui.get().camera;
    f.pointer("pointermove", { x: 200, y: 500 });
    assert.equal(f.ui.get().camera, angle);
    assert.equal(f.shots.length, 0);
  });
