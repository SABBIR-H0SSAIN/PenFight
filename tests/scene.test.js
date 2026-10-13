import { loadMatadorFixture } from "./helpers/matador.js";
import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { sceneFixture, meshesOf } from "./helpers/scene.js";
import { createPenFeature } from "../src/features/pen/models/pen-models.js";
import { createCharacterFeature } from "../src/features/character/scene/character-scene.js";
import { createTableFeature } from "../src/features/table/scene/table-scene.js";
import { createClassroomFeature } from "../src/features/classroom/scene/classroom-scene.js";
import { disposeObjectTree } from "../src/game/scene/dispose.js";

test("every pen builds real geometry, updates position, and releases replaced models", async () => {
  const template = await loadMatadorFixture();
  const { deps, engine } = sceneFixture(),
    feature = createPenFeature(deps, template),
    pen = feature.makePen(0);
  let previous;
  for (const type of Object.keys(engine.PENS)) {
    let disposals = 0;
    if (previous)
      meshesOf(previous).forEach((m) =>
        m.geometry.addEventListener("dispose", () => disposals++),
      );
    feature.setPenType(pen, type, "#d8fbf2");
    if (previous)
      assert.ok(
        disposals > 0,
        "old geometry is disposed when the selection changes",
      );
    assert.ok(meshesOf(pen.model).length >= 5, type);
    const bounds = new THREE.Box3().setFromObject(pen.model);
    const length = bounds.max.x - bounds.min.x;
    assert.ok(
      length > engine.PENS[type].len * 0.9 &&
        length < engine.PENS[type].len * 1.2,
      `${type} length matches physics`,
    );
    const state = engine.newState([type, type], engine.rng(22), 0).pens[0];
    feature.setPen(pen, state, 0);
    assert.ok(pen.group.position.toArray().every(Number.isFinite));
    previous = pen.model;
    feature.setPenType(pen, type, "#d8fbf2");
    assert.equal(pen.model, previous, "unchanged selections reuse geometry");
  }
  disposeObjectTree(pen.group);
  feature.dispose();
});
test("both characters include an attached head and articulated hands with finite poses", () => {
  const { deps } = sceneFixture();
  for (const slot of [0, 1]) {
    const rig = createCharacterFeature(deps).makeStudent(slot);
    assert.ok(rig.head.parent);
    assert.ok(meshesOf(rig.group).length > 20);
    assert.ok(meshesOf(rig.arms).length > 20);
    for (let i = 0; i < 90; i++) rig.update(1 / 60, i / 60);
    for (const root of [rig.group, rig.arms]) {
      root.updateMatrixWorld(true);
      root.traverse((object) =>
        assert.ok(
          object.matrixWorld.elements.every(Number.isFinite),
          object.name,
        ),
      );
    }
    rig.reset();
    disposeObjectTree(rig.group);
    disposeObjectTree(rig.arms);
  }
});
test("both shooting hands reach the pen without stretching either arm bone", () => {
  const { deps } = sceneFixture();
  for (const slot of [0, 1]) {
    const rig = createCharacterFeature(deps).makeStudent(slot);
    for (let frame = 0; frame < 30; frame++) rig.update(1 / 60, frame / 60);
    const target = new THREE.Vector3(0, 1.24, slot === 0 ? 16 : -16);
    rig.contactTarget = { x: target.x, y: target.y, z: target.z };
    Object.assign(rig.hand, {
      tx: target.x,
      ty: target.y,
      tz: target.z,
      ang: rig.fa,
      curl: 0.62,
    });
    for (let frame = 0; frame < 90; frame++) {
      rig.update(1 / 60, (frame + 30) / 60);
      for (const arm of rig.arm) {
        assert.ok(
          Math.abs(arm.shoulder.position.distanceTo(arm.elbow.position) - 29) <
            0.001,
          "upper arm stays its original length",
        );
        assert.ok(
          Math.abs(arm.elbow.position.distanceTo(arm.wrist.position) - 26.5) <
            0.001,
          "forearm stays its original length",
        );
      }
    }
    assert.ok(
      rig.arm[0].tip.distanceTo(target) < 0.1,
      "rendered finger pad reaches pen contact",
    );
    rig.reset();
    disposeObjectTree(rig.group);
    disposeObjectTree(rig.arms);
  }
});
test("table and classroom build independent scene groups", () => {
  const { deps, world, sceneRoot } = sceneFixture();
  createTableFeature(deps).desk();
  assert.ok(world.deskMesh);
  assert.ok(meshesOf(sceneRoot).length >= 8);
  const classroomRoot = new THREE.Group();
  const classroom = createClassroomFeature({
    ...deps,
    sceneRoot: classroomRoot,
  });
  classroom.room();
  classroom.props();
  assert.ok(meshesOf(classroomRoot).length > 30);
  assert.equal(world.deskMesh.parent, sceneRoot);
  assert.ok(world.clock && world.fans && world.shafts);
  disposeObjectTree(sceneRoot);
  disposeObjectTree(classroomRoot);
});
test("shared scene resources are released once across component and renderer cleanup", () => {
  const geometry = new THREE.BoxGeometry(),
    material = new THREE.MeshBasicMaterial();
  const root = new THREE.Group();
  root.add(
    new THREE.Mesh(geometry, material),
    new THREE.Mesh(geometry, material),
  );
  let geometries = 0,
    materials = 0;
  geometry.addEventListener("dispose", () => geometries++);
  material.addEventListener("dispose", () => materials++);
  disposeObjectTree(root);
  disposeObjectTree(root);
  assert.equal(geometries, 1);
  assert.equal(materials, 1);
});

test("GLB pen preserves proportions and decals with independent player colours/resources", async () => {
  const template = await loadMatadorFixture(),
    { deps, engine } = sceneFixture();
  const feature = createPenFeature(deps, template),
    a = feature.makePen(0),
    b = feature.makePen(1);
  feature.setPenType(a, "matador_hs", "#ff0000");
  feature.setPenType(b, "matador_hs", "#0000ff");
  const meshesA = meshesOf(a.model),
    meshesB = meshesOf(b.model);
  assert.equal(meshesA.length, 16);
  assert.ok(
    meshesA.some((m) => m.material.map),
    "photographed printing retained",
  );
  const barrelA = meshesA.find((m) => /satin plastic/i.test(m.material.name));
  const barrelB = meshesB.find((m) => /satin plastic/i.test(m.material.name));
  assert.equal(barrelA.material.color.getHex(), 0xff0000);
  assert.equal(barrelB.material.color.getHex(), 0x0000ff);
  assert.notEqual(barrelA.geometry, barrelB.geometry);
  assert.notEqual(barrelA.material, barrelB.material);
  const bounds = new THREE.Box3().setFromObject(a.model);
  assert.ok(
    Math.abs(bounds.max.x - bounds.min.x - engine.PENS.matador_hs.len) < 0.001,
  );
  assert.ok(
    bounds.min.y >= -0.01 && bounds.min.y < 0.02,
    "cap sits on table instead of hovering",
  );
  let otherDisposals = 0;
  barrelB.geometry.addEventListener("dispose", () => otherDisposals++);
  disposeObjectTree(a.group);
  assert.equal(otherDisposals, 0);
  disposeObjectTree(b.group);
  feature.dispose();
  disposeObjectTree(template);
});
