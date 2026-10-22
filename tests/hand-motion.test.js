import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCharacterFeature } from "../src/features/character/scene/character-scene.js";
import { disposeObjectTree } from "../src/game/scene/dispose.js";
import { deskCamera } from "../src/game/controller/camera.js";
import { gameConfig } from "../src/config/config.ts";
import { sceneFixture } from "./helpers/scene.js";
import { controllerFixture } from "./helpers/controller.js";

function character(t, slot) {
  const rig = createCharacterFeature(sceneFixture().deps).makeStudent(slot);
  t.after(() => {
    rig.reset();
    disposeObjectTree(rig.group);
    disposeObjectTree(rig.arms);
  });
  return rig;
}
function bones(rig) {
  for (const arm of rig.arm) {
    assert.ok(
      Math.abs(arm.shoulder.position.distanceTo(arm.elbow.position) - 29) <
        1e-6,
      "upper arm must not stretch",
    );
    assert.ok(
      Math.abs(arm.elbow.position.distanceTo(arm.wrist.position) - 26.5) < 1e-6,
      "forearm must not stretch",
    );
    assert.ok(arm.tip.toArray().every(Number.isFinite));
  }
}
function lowestDeskVertex(root) {
  let lowest = Infinity;
  const v = new THREE.Vector3();
  root.updateMatrixWorld(true);
  root.traverse((mesh) => {
    if (!mesh.isMesh) return;
    const points = mesh.geometry.attributes.position;
    for (let i = 0; i < points.count; i++) {
      v.fromBufferAttribute(points, i).applyMatrix4(mesh.matrixWorld);
      if (Math.abs(v.x) < 30 && Math.abs(v.z) < 50)
        lowest = Math.min(lowest, v.y);
    }
  });
  return lowest;
}

function assertDeskClear(root, label) {
  const desk = new THREE.Box3(
    new THREE.Vector3(-29.8, -3.8, -49.8),
    new THREE.Vector3(29.8, -0.15, 49.8),
  );
  const triangle = new THREE.Triangle();
  const bounds = new THREE.Box3();
  root.updateMatrixWorld(true);
  root.traverse((mesh) => {
    if (!mesh.isMesh || !mesh.visible) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    bounds.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
    if (!bounds.intersectsBox(desk)) return;
    const points = mesh.geometry.attributes.position,
      index = mesh.geometry.index;
    const count = index ? index.count : points.count;
    for (let i = 0; i < count; i += 3) {
      [triangle.a, triangle.b, triangle.c].forEach((v, j) => {
        v.fromBufferAttribute(
          points,
          index ? index.getX(i + j) : i + j,
        ).applyMatrix4(mesh.matrixWorld);
      });
      assert.equal(
        desk.intersectsTriangle(triangle),
        false,
        `${label}: ${mesh.name || mesh.geometry.type}, bounds=${bounds.min.toArray()}/${bounds.max.toArray()} intersects the desktop`,
      );
    }
  });
}

test("both players' actual torso meshes stay outside the desk during reach and reactions", (t) => {
  for (const slot of [0, 1])
    for (const fps of [20, 60, 120]) {
      const rig = character(t, slot);
      let time = 0;
      const advance = (seconds, label) => {
        for (let frame = 0; frame < seconds * fps; frame++) {
          time += 1 / fps;
          rig.update(1 / fps, time);
          bones(rig);
          if (frame % 4 === 0 || frame === seconds * fps - 1) {
            assertDeskClear(rig.group, `slot=${slot}, fps=${fps}, ${label}`);
          }
        }
      };
      advance(0.5, "idle");
      for (const [x, z] of [
        [-27, 3],
        [27, 3],
        [0, 16],
        [0, -47],
      ]) {
        rig.contactTarget = { x, y: 1.22, z: z * rig.side };
        Object.assign(rig.hand, {
          tx: x,
          ty: 1.22,
          tz: z * rig.side,
          ang: rig.fa,
          curl: 0.62,
        });
        advance(1.5, `reach=${x},${z}`);
        for (const kind of ["frustrated", "happy", "surprise", "victory"]) {
          rig.react = { kind, t: 0, dur: 0.5 };
          advance(0.75, kind);
        }
      }
      rig.reset();
      advance(1, "reset");
      assert.ok(Math.abs(rig.group.position.x) < 0.01);
    }
});

test("real hand meshes reach 1,620 seated contact poses without finger/thumb desk penetration", (t) => {
  const cameras = [];
  for (let azimuth = -180; azimuth < 180; azimuth += 15)
    for (const elevation of [45, 55, 65, 78, 89])
      for (const aspect of [0.45, 1.8])
        for (const zoom of [0.5, 1, 2]) {
          const camera = new THREE.PerspectiveCamera(45, aspect, 1, 1500),
            target = new THREE.Vector3();
          camera.fov = deskCamera(
            { azimuth, elevation },
            aspect,
            camera.position,
            target,
          );
          camera.zoom = zoom;
          camera.lookAt(target);
          camera.updateProjectionMatrix();
          camera.updateMatrixWorld(true);
          cameras.push(camera);
        }
  let count = 0,
    worstError = 0,
    lowest = Infinity;
  const projected = new THREE.Vector3();
  for (const slot of [0, 1]) {
    const rig = character(t, slot);
    for (const x of [-27, 0, 27])
      for (const z of [3, 16, 40])
        for (const yaw of [-1.15, -0.575, 0, 0.575, 1.15])
          for (const curl of [0.25, 0.38, 0.55, 0.62, 0.94, 1])
            for (const height of [1.22, 2.02, 2.92]) {
              rig.reset();
              for (let frame = 0; frame < 30; frame++)
                rig.update(1 / 60, frame / 60);
              const target = new THREE.Vector3(x, height, z * rig.side);
              rig.contactTarget = { x: target.x, y: target.y, z: target.z };
              Object.assign(rig.hand, {
                tx: target.x,
                ty: target.y,
                tz: target.z,
                ang: rig.fa + yaw,
                curl,
              });
              for (let frame = 0; frame < 100; frame++) {
                rig.update(1 / 60, (frame + 30) / 60);
                bones(rig);
              }
              const error = rig.arm[0].tip.distanceTo(target),
                clearance = lowestDeskVertex(rig.arm[0].hand.group);
              worstError = Math.max(worstError, error);
              lowest = Math.min(lowest, clearance);
              assert.ok(
                error < 0.5,
                `slot ${slot}, target ${target.toArray()}, yaw ${yaw}, curl ${curl}: missed by ${error} cm`,
              );
              assert.ok(
                clearance >= -0.1,
                `hand penetrates desk by ${-clearance} cm`,
              );
              for (const camera of cameras) {
                projected.copy(rig.arm[0].tip).project(camera);
                assert.ok(
                  projected.toArray().every(Number.isFinite),
                  "camera projection must remain finite",
                );
                if (camera.zoom === 1)
                  assert.ok(
                    Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1,
                    "contact stays framed at normal zoom",
                  );
              }
              count++;
            }
  }
  assert.equal(count, 1620);
  t.diagnostic(
    `${count} contact poses; ${cameras.length} camera projections per pose; worst pad error ${worstError.toFixed(3)} cm; lowest vertex ${lowest.toFixed(3)} cm`,
  );
});

test("superseding one real hand motion cancels its old tween without disturbing the other hand", async (t) => {
  const rig = character(t, 0);
  let time = 0;
  const advance = async (frames) => {
    for (let i = 0; i < frames; i++) {
      time += 1 / 60;
      rig.update(1 / 60, time);
      for (let j = 0; j < 4; j++) await Promise.resolve();
    }
  };
  await advance(30);
  const old = rig.run(
    "r",
    [
      [{ tx: 25, ty: 8, tz: 15 }, 1],
      [{ tx: -25 }, 0.3],
    ],
    rig.begin("r"),
  );
  const left = rig.run("l", [[{ ty: -15 }, 0.5]], rig.begin("l"));
  await advance(12);
  const next = rig.run("r", rig.dropStages("r"), rig.begin("r"));
  await advance(90);
  assert.equal(await old, false);
  assert.equal(await next, true);
  assert.equal(await left, true);
  assert.deepEqual(rig.hand, rig.lapPose(1));
  assert.equal(rig.lhand.ty, -15);
  assert.equal(rig.tweens.length, 0);
});

test("reach, retract, thinking and all reactions animate both actual rigs at 30/60/120 fps", async (t) => {
  for (const slot of [0, 1])
    for (const fps of [30, 60, 120]) {
      const rig = character(t, slot);
      let time = 0,
        travel = 0,
        maxStep = 0;
      const previous = new THREE.Vector3();
      let ready = false;
      const step = async (frames) => {
        for (let i = 0; i < frames; i++) {
          const wasReady = rig.arm[0].ready;
          time += 1 / fps;
          rig.update(1 / fps, time);
          bones(rig);
          if (ready && wasReady) {
            const delta = rig.arm[0].tip.distanceTo(previous);
            travel += delta;
            maxStep = Math.max(maxStep, delta);
          }
          previous.copy(rig.arm[0].tip);
          ready = true;
          for (let j = 0; j < 4; j++) await Promise.resolve();
        }
      };
      await step(fps);
      rig.contactTarget = { x: 0, y: 2.22, z: 16 * rig.side };
      const reach = rig.run(
        "r",
        [
          ...rig.liftStages("r"),
          [
            { tx: 0, ty: 9, tz: 16 * rig.side, curl: 0.38, ang: rig.fa },
            0.25,
            "reach",
          ],
          [{ ty: 2.22, curl: 0.62 }, 0.14, "contact"],
        ],
        rig.begin("r"),
      );
      await step(fps * 2);
      assert.equal(await reach, true);
      assert.ok(
        rig.arm[0].tip.distanceTo(new THREE.Vector3(0, 2.22, 16 * rig.side)) <
          0.5,
      );
      rig.contactTarget = null;
      const retract = rig.run("r", rig.dropStages("r"), rig.begin("r"));
      await step(fps * 2);
      assert.equal(await retract, true);
      assert.deepEqual(rig.hand, rig.lapPose(1));
      rig.thinking = true;
      const leftBefore = rig.arm[1].tip.clone();
      await step(fps);
      assert.ok(rig.arm[1].tip.distanceTo(leftBefore) > 0.01);
      rig.thinking = false;
      for (const kind of ["happy", "surprise", "frustrated", "victory"]) {
        rig.react = { kind, t: 0, dur: 0.8 };
        await step(fps);
        assert.equal(rig.react, null);
      }
      assert.ok(
        travel > 80,
        "real fingertip must travel, not just resolve stub promises",
      );
      assert.ok(
        maxStep < 700 / fps,
        `sudden fingertip jump at ${fps} fps: ${maxStep}`,
      );
      for (const root of [rig.group, rig.arms]) {
        root.updateMatrixWorld(true);
        root.traverse((o) =>
          assert.ok(o.matrixWorld.elements.every(Number.isFinite)),
        );
      }
    }
});

test("144 real-controller human flicks touch the pen across models, players, views and barrel offsets", async (t) => {
  let index = 0,
    worstError = 0,
    lowestMovingVertex = Infinity;
  for (const pen of Object.keys(gameConfig.pens))
    for (const who of [0, 1])
      await t.test(`${pen}, player ${who + 1}`, async (t) => {
        const f = controllerFixture(t, {
            realCharacters: true,
            stepMs: 1000 / 60,
            seed: 42,
          }),
          newState = f.engine.newState;
        const rig = f.world.students[who],
          update = rig.update;
        let sampledFrame = 0;
        rig.update = (dt, time) => {
          update(dt, time);
          if (!rig.contactTarget || rig.hand.ty < 0 || ++sampledFrame % 5)
            return;
          const clearance = lowestDeskVertex(rig.arm[0].hand.group);
          lowestMovingVertex = Math.min(lowestMovingVertex, clearance);
          assert.ok(
            clearance >= -0.1,
            "moving fingers/thumb must stay above the desktop",
          );
        };
        let position = 0;
        f.engine.newState = (types, rng) => {
          const state = newState(types, rng, who),
            p = state.pens[who];
          p.x =
            position === 0
              ? 30
              : position === 1
                ? who
                  ? 57
                  : 3
                : who
                  ? 3
                  : 57;
          p.y = who
            ? position === 0
              ? 33
              : position === 1
                ? 47
                : 10
            : position === 0
              ? 67
              : position === 1
                ? 53
                : 90;
          p.a = who ? -Math.PI / 2 : Math.PI / 2;
          return state;
        };
        const prefs = f.ui.get().preferences;
        f.ui.set({
          preferences: {
            ...prefs,
            pvp: {
              ...prefs.pvp,
              pen1: { pen, colors: {} },
              pen2: { pen, colors: {} },
            },
          },
        });
        for (const view of ["overview", "top", "side", "player"])
          for (const offset of [-0.7, 0, 0.7]) {
            position = index++ % 3;
            f.controller.start("pvp");
            await f.advance(150);
            f.controller.setCameraPreset(view);
            await f.advance(50);
            if (index % 2 === 0) f.controller.setCameraPinned(true);
            const angle = ((index % 12) * Math.PI) / 6,
              off = (offset * gameConfig.pens[pen].len) / 2,
              p = f.pens[who],
              start = f.point(who, off);
            f.pointer("pointerdown", start);
            await f.advance(30);
            const end3 = new THREE.Vector3(
              p.x - 30 + Math.cos(p.a) * off - Math.cos(angle) * 10,
              0,
              p.y - 50 + Math.sin(p.a) * off - Math.sin(angle) * 10,
            ).project(f.world.camera);
            const end = {
              x: ((end3.x + 1) * f.canvas.clientWidth) / 2,
              y: ((1 - end3.y) * f.canvas.clientHeight) / 2,
            };
            f.pointer("pointermove", end);
            await f.advance(12);
            const before = f.shots.length;
            f.pointer("pointerup", end);
            for (let i = 0; i < 240 && f.shots.length === before; i++)
              await f.advance();
            assert.equal(
              f.shots.length,
              before + 1,
              `${pen}/${who}/${view}/${offset} must finish a real animated shot`,
            );
            const contact = f.shotContacts[before];
            assert.ok(contact.target);
            const error = contact.tip.distanceTo(
              new THREE.Vector3(
                contact.target.x,
                contact.target.y,
                contact.target.z,
              ),
            );
            worstError = Math.max(worstError, error);
            assert.ok(
              error < 0.3,
              `${pen}/${who}/${view}/${offset}: impulse began ${error} cm from contact`,
            );
            bones(f.world.students[who]);
            await f.advance(100);
            assert.equal(
              rig.contactTarget,
              null,
              "follow-through must release the pen target",
            );
            assert.ok(rig.hand.ty < -5, "the playing hand returns to the lap");
            assert.ok(
              rig.arm[0].tip.distanceTo(contact.tip) > 15,
              "the actual rendered hand retracts instead of freezing over the pen",
            );
          }
      });
  assert.equal(index, 144);
  t.diagnostic(
    `144 real human shots; worst impulse-time pad error ${worstError.toFixed(3)} cm; lowest moving-hand vertex ${lowestMovingVertex.toFixed(3)} cm`,
  );
});

test("24 AI-driven real hand flicks touch before impulse across both players and release directions", async (t) => {
  let worstError = 0;
  for (const who of [0, 1])
    await t.test(`AI player ${who + 1}`, async (t) => {
      const f = controllerFixture(t, {
        realCharacters: true,
        stepMs: 1000 / 60,
        seed: 42,
      });
      const newState = f.engine.newState;
      f.engine.newState = (types, rng) => newState(types, rng, who);
      f.engine.LEVELS = structuredClone(f.engine.LEVELS);
      Object.assign(f.engine.LEVELS.advanced, {
        think: 0,
        noise: { a: 0, p: 0 },
        mistake: 0,
      });
      const pens = Object.keys(gameConfig.pens);
      for (let direction = 0; direction < 12; direction++) {
        const pen = pens[direction % pens.length],
          preferences = f.ui.get().preferences;
        f.ui.set({
          preferences: {
            ...preferences,
            ai: {
              ...preferences.ai,
              speed: 1,
              penA: { pen, colors: {} },
              penB: { pen, colors: {} },
            },
          },
        });
        f.engine.decide = function* () {
          return {
            action: {
              ang: (direction * Math.PI) / 6,
              pow: 0.5,
              off: [-0.7, 0, 0.7][direction % 3],
            },
            info: { moves: [], nodes: [], stats: {} },
          };
        };
        const before = f.shots.length;
        f.controller.start("aivai");
        f.controller.setCameraAngle(
          direction * 30 - 180,
          [45, 65, 89][direction % 3],
        );
        for (let i = 0; i < 600 && f.shots.length === before; i++)
          await f.advance();
        assert.equal(f.shots.length, before + 1);
        const contact = f.shotContacts[before];
        assert.equal(contact.who, who);
        const error = contact.tip.distanceTo(
          new THREE.Vector3(
            contact.target.x,
            contact.target.y,
            contact.target.z,
          ),
        );
        worstError = Math.max(worstError, error);
        assert.ok(
          error < 0.3,
          `AI ${who}, direction ${direction}: ${error} cm`,
        );
      }
    });
  t.diagnostic(
    `24 real AI shots; worst impulse-time pad error ${worstError.toFixed(3)} cm`,
  );
});

test("pausing or cancelling a real aimed hand freezes safely and resumes/retracts without a phantom shot", async (t) => {
  const f = controllerFixture(t, {
    realCharacters: true,
    stepMs: 1000 / 60,
    seed: 42,
  });
  f.controller.start("pvp");
  await f.advance(180);
  const rig = f.world.students[0],
    point = f.point(0);
  f.pointer("pointerdown", point);
  await f.advance(12);
  f.pointer("pointermove", { x: point.x + 60, y: point.y + 30 });
  await f.advance(8);
  const tip = rig.arm[0].tip.clone();
  f.controller.pause();
  await f.advance(120);
  assert.deepEqual(rig.arm[0].tip.toArray(), tip.toArray());
  assert.equal(f.shots.length, 0);
  f.controller.resume();
  await f.advance(180);
  assert.deepEqual(rig.hand, rig.lapPose(1));
  assert.equal(rig.contactTarget, null);
  assert.equal(rig.tweens.length, 0);
  f.pointer("pointerup", point);
  assert.equal(f.shots.length, 0);
  f.pointer("pointerdown", f.point(0));
  await f.advance(12);
  f.controller.openMenu();
  await f.advance(120);
  assert.equal(rig.contactTarget, null);
  assert.equal(rig.tweens.length, 0);
  assert.equal(f.shots.length, 0);
});

test("far-side reach diagnostic preserves anatomical limits and reports the remaining contact gap", (t) => {
  for (const slot of [0, 1]) {
    const rig = character(t, slot),
      target = new THREE.Vector3(0, 2.22, -47 * rig.side);
    rig.contactTarget = { x: target.x, y: target.y, z: target.z };
    Object.assign(rig.hand, {
      tx: target.x,
      ty: target.y,
      tz: target.z,
      curl: 0.62,
      ang: rig.fa,
    });
    for (let frame = 0; frame < 200; frame++) {
      rig.update(1 / 60, frame / 60);
      bones(rig);
    }
    const gap = rig.arm[0].tip.distanceTo(target);
    assert.ok(Number.isFinite(gap));
    // This is a diagnostic, not a claim that a seated avatar can reach the
    // opposite edge. Keep the residual visible instead of stretching bones.
    t.diagnostic(
      `player ${slot + 1}, opposite-edge contact residual: ${gap.toFixed(2)} cm (contact not verified)`,
    );
  }
});

test("actual AI contact remains synchronized at 1x/2x/4x and 20/30/60/120 fps", async (t) => {
  for (const speed of [1, 2, 4])
    for (const fps of [20, 30, 60, 120])
      for (const who of [0, 1]) {
        await t.test(`${speed}x, ${fps} fps, player ${who + 1}`, async (t) => {
          const f = controllerFixture(t, {
              realCharacters: true,
              stepMs: 1000 / fps,
              seed: 42,
            }),
            newState = f.engine.newState;
          f.engine.newState = (types, rng) => newState(types, rng, who);
          f.engine.LEVELS = structuredClone(f.engine.LEVELS);
          Object.assign(f.engine.LEVELS.advanced, {
            think: 0,
            noise: { a: 0, p: 0 },
            mistake: 0,
          });
          const prefs = f.ui.get().preferences;
          f.ui.set({ preferences: { ...prefs, ai: { ...prefs.ai, speed } } });
          f.engine.decide = function* () {
            return {
              action: {
                ang: who ? Math.PI / 2 : -Math.PI / 2,
                pow: 0.7,
                off: 0.7,
              },
              info: { moves: [], nodes: [], stats: {} },
            };
          };
          f.controller.start("aivai");
          for (let i = 0; i < 600 && !f.shots.length; i++) await f.advance();
          assert.equal(f.shots.length, 1);
          const contact = f.shotContacts[0],
            gap = contact.tip.distanceTo(
              new THREE.Vector3(
                contact.target.x,
                contact.target.y,
                contact.target.z,
              ),
            );
          assert.ok(
            gap < 0.3,
            `${speed}x/${fps}fps player ${who}: ${gap} cm contact gap`,
          );
          bones(f.world.students[who]);
        });
      }
});
