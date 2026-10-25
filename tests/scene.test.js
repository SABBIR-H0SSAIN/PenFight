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
import {
  createFurnitureLibrary,
  updateFurnitureSurface,
} from "../src/features/furniture/scene/furniture.js";
import { woodUv } from "../src/features/furniture/scene/wood-uv.js";

test("bench lettering keeps the same handedness as a face-up canvas plane", () => {
  const { deps, sceneRoot } = sceneFixture();
  createTableFeature(deps).desk();
  const furniture = createFurnitureLibrary(deps);
  const desk = furniture.desk();
  const chair = furniture.chair();
  for (const mesh of [
    deps.R.deskMesh,
    desk.getObjectByName("desk-top"),
    chair.getObjectByName("chair-seat"),
    chair.getObjectByName("chair-back"),
  ]) {
    const { position, normal, uv } = mesh.geometry.attributes;
    let faces = 0;
    for (let i = 0; i < position.count; i += 3) {
      if (normal.getY(i) < 0.99) continue;
      const dx1 = position.getX(i + 1) - position.getX(i);
      const dz1 = position.getZ(i + 1) - position.getZ(i);
      const dx2 = position.getX(i + 2) - position.getX(i);
      const dz2 = position.getZ(i + 2) - position.getZ(i);
      const du1 = uv.getX(i + 1) - uv.getX(i);
      const dv1 = uv.getY(i + 1) - uv.getY(i);
      const du2 = uv.getX(i + 2) - uv.getX(i);
      const dv2 = uv.getY(i + 2) - uv.getY(i);
      const area = dx1 * dz2 - dz1 * dx2;
      if (Math.abs(area) < 1e-8) continue;
      assert.ok((du1 * dv2 - dv1 * du2) / area < 0, mesh.name);
      faces++;
    }
    assert.ok(faces > 0, "checked visible panel faces");
  }
  // Cropped/rotated grain variants must never reflect writing either.
  for (const [width, depth] of [
    [60, 100],
    [100, 60],
  ]) {
    for (let variation = 0; variation < 6; variation++) {
      const origin = woodUv(0, 0, width, depth, variation);
      const x = woodUv(1, 0, width, depth, variation);
      const z = woodUv(0, 1, width, depth, variation);
      assert.ok(
        (x[0] - origin[0]) * (z[1] - origin[1]) -
          (x[1] - origin[1]) * (z[0] - origin[0]) <
          0,
      );
    }
  }
  disposeObjectTree(sceneRoot);
  disposeObjectTree(desk);
  disposeObjectTree(chair);
});

test("changing furniture finish preserves the character rig and releases the previous wood material", () => {
  const { deps } = sceneFixture();
  const character = createCharacterFeature(deps).makeStudent(0);
  const seat = character.group.getObjectByName("chair-seat");
  const geometry = seat.geometry,
    original = seat.material[0];
  let releases = 0;
  original.map.addEventListener("dispose", () => releases++);
  updateFurnitureSurface(character.group, deps, "maple");
  assert.equal(seat.geometry, geometry);
  assert.equal(seat.material[0].map.name, "original-school-bench-maple");
  assert.equal(
    character.group.getObjectByName("chair-back").material[0],
    seat.material[0],
  );
  assert.equal(releases, 1);
  const material = seat.material[0];
  updateFurnitureSurface(character.group, deps, "maple");
  assert.equal(
    seat.material[0],
    material,
    "unchanged finish does not allocate another material",
  );
  character.update(1 / 60, 1);
  assert.ok(character.head.position.toArray().every(Number.isFinite));
  disposeObjectTree(character.group);
  disposeObjectTree(character.arms);
});

test("furniture keeps playable bounds and distant desk/chair silhouettes", () => {
  const { deps, sceneRoot, engine } = sceneFixture();
  createTableFeature(deps).desk();
  assert.equal(deps.R.deskMesh.material[0].map.name, "original-school-bench");
  assert.ok(
    !sceneRoot.getObjectByName("school-bench-writing"),
    "original carved writing is not covered by a duplicate overlay",
  );
  const bounds = new THREE.Box3().setFromObject(
    sceneRoot.getObjectByName("playable-desk-top"),
  );
  assert.ok(
    Math.abs(bounds.max.y) < 0.001,
    "surface stays on the physics plane",
  );
  assert.ok(Math.abs(bounds.max.x - bounds.min.x - engine.TABLE.w) < 0.001);
  assert.ok(Math.abs(bounds.max.z - bounds.min.z - engine.TABLE.h) < 0.001);
  const classroomRoot = new THREE.Group();
  createClassroomFeature({ ...deps, sceneRoot: classroomRoot }).props();
  const desks = classroomRoot.children.filter((o) => o.isLOD);
  assert.equal(desks.length, 12);
  for (const lod of desks) {
    const [near, far] = lod.levels.map((level) => level.object);
    assert.ok(far.getObjectByName("chair-back"));
    assert.ok(far.getObjectByName("desk-top"));
    assert.deepEqual(
      near.getObjectByName("school-chair").position.toArray(),
      far.getObjectByName("school-chair").position.toArray(),
    );
    assert.equal(
      near.getObjectByName("desk-top").geometry,
      far.getObjectByName("desk-top").geometry,
      "grain stays unchanged when switching distance levels",
    );
    assert.ok(meshesOf(far).length < meshesOf(near).length);
  }
  const grainPatterns = new Set(
    desks.map(
      (lod) => lod.levels[0].object.getObjectByName("desk-top").material[0].map,
    ),
  );
  assert.equal(
    grainPatterns.size,
    1,
    "surrounding desks share the same original bench finish",
  );
  disposeObjectTree(sceneRoot);
  disposeObjectTree(classroomRoot);
});

test("all furniture shares the original bench material locally and disposes it independently between scene owners", () => {
  const { deps } = sceneFixture();
  const first = createFurnitureLibrary(deps),
    second = createFurnitureLibrary(deps);
  const a = first.chair(),
    b = first.desk(),
    other = second.desk();
  const matA = a.getObjectByName("chair-seat").material[0];
  const matB = b.getObjectByName("desk-top").material[0];
  const matOther = other.getObjectByName("desk-top").material[0];
  assert.equal(matA.map, b.getObjectByName("desk-top").material[1].map);
  assert.equal(matB.map.name, "original-school-bench-oak");
  assert.equal(matB.bumpMap, null);
  assert.notEqual(matB.map, matOther.map);
  assert.equal(matA.map.encoding, THREE.sRGBEncoding);
  assert.equal(
    matA.bumpMap,
    null,
    "the matching original bench finish has no added relief",
  );
  assert.equal(
    matA.normalMap,
    null,
    "unrelated normal maps do not distort the supplied wood",
  );
  assert.equal(matA.envMapIntensity, 0, "wood has no environment reflections");
  const alternate = first.desk(true, 0xffffff, 3);
  const alternateTop = alternate.getObjectByName("desk-top");
  assert.equal(
    matB.map,
    alternateTop.material[0].map,
    "all surrounding desks use the identical finish",
  );
  const repeated = first.desk(false);
  assert.equal(
    repeated.getObjectByName("desk-top").material[0].map,
    matB.map,
    "repeated variation reuses its generated texture",
  );
  let disposed = 0,
    otherDisposed = 0;
  matA.map.addEventListener("dispose", () => disposed++);
  matOther.map.addEventListener("dispose", () => otherDisposed++);
  const group = new THREE.Group();
  group.add(a, b, alternate, repeated);
  disposeObjectTree(group);
  assert.equal(disposed, 1);
  assert.equal(otherDisposed, 0);
  disposeObjectTree(other);
  const low = createFurnitureLibrary({ ...deps, R: { quality: "low" } }).desk();
  assert.equal(low.getObjectByName("desk-top").material[0].normalMap, null);
  assert.equal(low.getObjectByName("desk-top").material[0].bumpMap, null);
  disposeObjectTree(low);
});

test("classroom keeps its wall scoreboard without a freestanding board behind a player", () => {
  const { deps, sceneRoot } = sceneFixture();
  createClassroomFeature(deps).room();
  assert.ok(sceneRoot.getObjectByName("wall-scoreboard"));
  assert.ok(
    !sceneRoot.children.some(
      (object) => object.position.x === 78 && object.position.z === -76,
    ),
  );
  disposeObjectTree(sceneRoot);
});

test("classroom floor is matte and windows create no light overlays or projected patterns", () => {
  const { deps, sceneRoot, world } = sceneFixture();
  createClassroomFeature(deps).room();
  const floor = sceneRoot.getObjectByName("classroom-floor");
  assert.equal(floor.material.roughness, 1);
  assert.equal(floor.material.metalness, 0);
  assert.equal(floor.material.envMapIntensity, 0);
  assert.equal(
    floor.receiveShadow,
    true,
    "normal furniture contact shadows remain",
  );
  assert.equal(world.sunPatches.length, 0);
  assert.equal(world.shafts.length, 0);
  const windows = sceneRoot.children.filter(
    (object) => object.name === "classroom-window",
  );
  assert.equal(windows.length, 3);
  for (const window of windows)
    assert.ok(meshesOf(window).every((mesh) => !mesh.castShadow));
  assert.ok(
    meshesOf(sceneRoot).every((mesh) => {
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      return materials.every(
        (material) => material.blending !== THREE.AdditiveBlending,
      );
    }),
    "no transparent light beam overlays remain",
  );
  disposeObjectTree(sceneRoot);
});

test("every pen builds real geometry, updates position, and releases replaced models", async () => {
  const template = await loadMatadorFixture();
  const { deps, engine } = sceneFixture(),
    feature = createPenFeature(
      deps,
      template,
      await loadMatadorFixture("matador-smoothy"),
      await loadMatadorFixture("matador-all-time"),
      await loadMatadorFixture("matador-i-teen"),
    ),
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
  for (const fan of world.fans) {
    assert.ok(
      meshesOf(fan).every((mesh) => !mesh.castShadow),
      "spinning fans cast no moving shadows",
    );
  }
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

test("GLB pen fits playable dimensions and preserves decals with independent player colours/resources", async () => {
  const template = await loadMatadorFixture(),
    { deps, engine } = sceneFixture();
  const feature = createPenFeature(
      deps,
      template,
      await loadMatadorFixture("matador-smoothy"),
      await loadMatadorFixture("matador-all-time"),
      await loadMatadorFixture("matador-i-teen"),
    ),
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
    Math.abs(bounds.max.y - bounds.min.y - engine.PENS.matador_hs.r * 2) <
      0.001,
    "visible cross-section matches its collision diameter",
  );
  assert.ok(
    bounds.max.y - bounds.min.y >= engine.PENS.ball.r * 1.8,
    "school pen remains readable alongside standard pens",
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

test("Smoothy uses the supplied GLB with printing, tip alignment and independent player resources", async () => {
  const template = await loadMatadorFixture("matador-smoothy");
  const { deps, engine } = sceneFixture();
  const feature = createPenFeature(deps, undefined, template);
  const a = feature.makePen(0),
    b = feature.makePen(1);
  feature.setPenType(a, "matador_smoothy", "#efc8cf");
  feature.setPenType(b, "matador_smoothy", "#151515");
  const model = a.model.getObjectByName("matador-smoothy-glb");
  assert.ok(model);
  assert.equal(meshesOf(model).length, 17);
  const barrelA = model.getObjectByName("Printed_mint_barrel");
  const barrelB = b.model.getObjectByName("Printed_mint_barrel");
  const original = template.getObjectByName("Printed_mint_barrel");
  assert.ok(
    barrelA.material.map,
    "embedded MATADOR/smoothy printing is retained",
  );
  assert.equal(
    barrelA.material.color.clone().convertLinearToSRGB().getHex(),
    0xefc8cf,
  );
  assert.equal(
    barrelB.material.color.clone().convertLinearToSRGB().getHex(),
    0x151515,
  );
  assert.notEqual(barrelA.material.map, barrelB.material.map);
  assert.notEqual(barrelA.material.map, original.material.map);
  assert.notEqual(barrelA.geometry, barrelB.geometry);
  assert.notEqual(barrelA.material, barrelB.material);
  const bounds = new THREE.Box3().setFromObject(a.model);
  assert.ok(
    Math.abs(bounds.max.x - bounds.min.x - engine.PENS.matador_smoothy.len) <
      0.001,
  );
  const tip = new THREE.Box3().setFromObject(
    model.getObjectByName("Black_rollerball"),
  );
  const cap = new THREE.Box3().setFromObject(
    model.getObjectByName("Hollow_mint_cap_shell"),
  );
  assert.ok(
    tip.min.x > cap.max.x,
    "writing tip points along the game's +X axis",
  );
  const metal = model.getObjectByName("Stainless_tip_socket").material;
  assert.equal(metal.metalness, 0.9);
  const state = engine.newState(["matador_smoothy", "matador_smoothy"]).pens[0];
  for (const roll of [0, Math.PI / 3, Math.PI, -Math.PI / 2]) {
    feature.setPen(a, { ...state, roll }, 0);
    a.group.updateMatrixWorld(true);
    let minimum = Infinity;
    const vertex = new THREE.Vector3();
    for (const mesh of meshesOf(a.model)) {
      const vertices = mesh.geometry.attributes.position;
      for (let i = 0; i < vertices.count; i++) {
        vertex.fromBufferAttribute(vertices, i).applyMatrix4(mesh.matrixWorld);
        minimum = Math.min(minimum, vertex.y);
      }
    }
    assert.ok(
      minimum >= -0.001 && minimum < 0.001,
      "rolled model stays on the desk",
    );
  }
  let otherDisposals = 0;
  barrelB.material.map.addEventListener("dispose", () => otherDisposals++);
  original.material.map.addEventListener("dispose", () => otherDisposals++);
  let ownDisposals = 0;
  barrelA.material.map.addEventListener("dispose", () => ownDisposals++);
  feature.setPenType(a, "ball");
  assert.equal(ownDisposals, 1);
  assert.equal(
    otherDisposals,
    0,
    "switching pens preserves the other player and cached template",
  );
  disposeObjectTree(a.group);
  disposeObjectTree(b.group);
  feature.dispose();
  disposeObjectTree(template);
});

test("All Time keeps a transparent barrel and dark refill while colouring only the end parts", async () => {
  const template = await loadMatadorFixture("matador-all-time");
  const { deps, engine } = sceneFixture();
  const feature = createPenFeature(deps, undefined, undefined, template);
  const a = feature.makePen(0),
    b = feature.makePen(1);
  feature.setPenType(a, "matador_all_time", "#235bd1");
  feature.setPenType(b, "matador_all_time", "#148267");
  const model = a.model.getObjectByName("matador-all-time-glb");
  assert.ok(model);
  assert.equal(meshesOf(model).length, 35);
  const capA = model.getObjectByName("Cap_oxblood_upper_sleeve");
  const capB = b.model.getObjectByName("Cap_oxblood_upper_sleeve");
  assert.equal(
    capA.material.color.clone().convertLinearToSRGB().getHex(),
    0x235bd1,
  );
  assert.equal(
    capB.material.color.clone().convertLinearToSRGB().getHex(),
    0x148267,
  );
  assert.notEqual(capA.geometry, capB.geometry);
  assert.notEqual(capA.material, capB.material);
  for (const name of [
    "Silver_long_barrel",
    "Transparent_grip_core",
    "Thirty-four_tactile_grip_ribs",
    "Barrel_longitudinal_dark_channels",
    "Barrel_longitudinal_mirror_highlights",
    "Barrel_longitudinal_dark_reflections",
    "Lower_barrel_chrome_join",
    "Rear_chrome_joint",
  ]) {
    const material = model.getObjectByName(name).material;
    const other = b.model.getObjectByName(name).material;
    assert.equal(material.transparent, true, `${name} is clear plastic`);
    assert.ok(material.opacity <= 0.5, `${name} still reveals the refill`);
    assert.equal(material.metalness, 0, name);
    assert.equal(material.depthWrite, false, name);
    assert.equal(
      material.color.getHex(),
      other.color.getHex(),
      `${name} ignores the chosen end colour`,
    );
  }
  assert.ok(
    model.getObjectByName("Silver_long_barrel").material.opacity >= 0.35,
    "outer barrel remains visible instead of looking almost absent",
  );
  for (const name of [
    "Cap_amber_lower_sleeve",
    "Rear_amber_plug",
    "Amber_translucent_tip",
  ]) {
    const material = model.getObjectByName(name).material;
    const other = b.model.getObjectByName(name).material;
    assert.equal(
      material.color.clone().convertLinearToSRGB().getHex(),
      0x235bd1,
      `${name} matches the blue cap`,
    );
    assert.equal(
      other.color.clone().convertLinearToSRGB().getHex(),
      0x148267,
      `${name} matches the green cap`,
    );
    assert.equal(material.metalness, 0);
  }
  for (const name of ["Steel_writing_ball", "Polished_nib"]) {
    const material = model.getObjectByName(name).material;
    const original = template.getObjectByName(name).material;
    assert.equal(material.color.getHex(), original.color.getHex(), name);
    assert.equal(
      material.metalness,
      original.metalness,
      "actual nib stays metallic",
    );
  }
  const refill = model.getObjectByName("Dark_internal_refill").material;
  assert.equal(
    refill.color.getHex(),
    b.model.getObjectByName("Dark_internal_refill").material.color.getHex(),
  );
  assert.equal(
    refill.transparent,
    false,
    "dark refill stays visible inside the clear barrel",
  );
  assert.equal(refill.metalness, 0);
  const inkBounds = new THREE.Box3().setFromObject(
    model.getObjectByName("Dark_internal_refill"),
  );
  const nibBounds = new THREE.Box3().setFromObject(
    model.getObjectByName("Polished_nib"),
  );
  const gripBounds = new THREE.Box3().setFromObject(
    model.getObjectByName("Transparent_grip_core"),
  );
  assert.ok(
    inkBounds.min.x < gripBounds.min.x && inkBounds.max.x > gripBounds.max.x,
    "black refill continues through the whole clear grip",
  );
  assert.ok(
    inkBounds.max.x > nibBounds.min.x,
    "black refill overlaps the steel nib without a visible gap",
  );
  const feeder = model.getObjectByName("Tip_inner_copper_core").material;
  assert.equal(
    feeder.color.getHex(),
    refill.color.getHex(),
    "nose feeder continues the black ink colour",
  );
  const originalBody = template.getObjectByName("Silver_long_barrel").material;
  assert.equal(originalBody.transparent, false, "cached GLB is not modified");
  const logoA = model.getObjectByName("MATADOR_All-time_printed_logo");
  const logoB = b.model.getObjectByName("MATADOR_All-time_printed_logo");
  assert.ok(logoA.material.map, "embedded branding retained");
  assert.notEqual(logoA.material.map, logoB.material.map);
  const bounds = new THREE.Box3().setFromObject(a.model);
  assert.ok(
    Math.abs(bounds.max.x - bounds.min.x - engine.PENS.matador_all_time.len) <
      0.001,
  );
  const tip = new THREE.Box3().setFromObject(
    model.getObjectByName("Steel_writing_ball"),
  );
  const cap = new THREE.Box3().setFromObject(capA);
  assert.ok(tip.min.x > cap.max.x, "tip points toward +X with cap on the back");
  let otherDisposals = 0;
  logoB.material.map.addEventListener("dispose", () => otherDisposals++);
  template
    .getObjectByName("MATADOR_All-time_printed_logo")
    .material.map.addEventListener("dispose", () => otherDisposals++);
  let ownDisposals = 0;
  logoA.material.map.addEventListener("dispose", () => ownDisposals++);
  feature.setPenType(a, "ball");
  assert.equal(ownDisposals, 1);
  assert.equal(otherDisposals, 0);
  disposeObjectTree(a.group);
  disposeObjectTree(b.group);
  feature.dispose();
  disposeObjectTree(template);
});

test("i-teen matches photo proportions with clear plastic, shallow grip dots and independent barrel colours", async () => {
  const template = await loadMatadorFixture("matador-i-teen");
  const { deps, engine } = sceneFixture();
  const feature = createPenFeature(
    deps,
    undefined,
    undefined,
    undefined,
    template,
  );
  const a = feature.makePen(0),
    b = feature.makePen(1);
  feature.setPenType(a, "matador_i_teen", "#f3445f");
  feature.setPenType(b, "matador_i_teen", "#235bd1");
  const model = a.model.getObjectByName("matador-i-teen-glb");
  assert.ok(model);
  const meshesA = meshesOf(model),
    meshesB = meshesOf(b.model),
    originals = meshesOf(template);
  assert.equal(meshesA.length, 112);
  const materialMesh = (meshes, name) =>
    meshes.find((mesh) => mesh.material.name === name);
  const barrelA = materialMesh(meshesA, "red"),
    barrelB = materialMesh(meshesB, "red");
  assert.equal(
    barrelA.material.color.clone().convertLinearToSRGB().getHex(),
    0xf3445f,
  );
  assert.equal(
    barrelB.material.color.clone().convertLinearToSRGB().getHex(),
    0x235bd1,
  );
  assert.notEqual(barrelA.material, barrelB.material);
  assert.notEqual(barrelA.geometry, barrelB.geometry);
  for (const name of ["shell", "grip", "dots", "cap", "metal", "branding"]) {
    const material = materialMesh(meshesA, name).material;
    const original = materialMesh(originals, name).material;
    if (original.transparent && name !== "branding") {
      assert.ok(
        material.opacity >= (name === "shell" ? 0.15 : 0.25) &&
          material.opacity <= 0.5,
        `${name} has a visible plastic surface while revealing the core`,
      );
      assert.equal(material.metalness, 0, "clear parts are plastic");
      assert.equal(material.transparent, true);
      assert.equal(material.depthWrite, false);
    } else {
      assert.equal(material.color.getHex(), original.color.getHex(), name);
      assert.equal(material.opacity, original.opacity, name);
    }
  }
  const logoA = materialMesh(meshesA, "branding"),
    logoB = materialMesh(meshesB, "branding");
  assert.ok(logoA.material.map);
  assert.notEqual(logoA.material.map, logoB.material.map);
  const bounds = new THREE.Box3().setFromObject(a.model);
  assert.ok(
    Math.abs(bounds.max.x - bounds.min.x - engine.PENS.matador_i_teen.len) <
      0.001,
  );
  const tip = new THREE.Box3().setFromObject(materialMesh(meshesA, "metal"));
  const cap = new THREE.Box3().setFromObject(materialMesh(meshesA, "cap"));
  assert.ok(tip.min.x > cap.max.x, "cap stays behind the +X writing tip");
  const barrel = new THREE.Box3().setFromObject(
    model.getObjectByName("Transparent_outer_barrel"),
  );
  const capSize = cap.getSize(new THREE.Vector3());
  const barrelSize = barrel.getSize(new THREE.Vector3());
  assert.ok(
    barrelSize.z / engine.PENS.matador_i_teen.len > 0.057 &&
      barrelSize.z / engine.PENS.matador_i_teen.len < 0.063,
    "slightly fuller barrel remains slender relative to its playable length",
  );
  assert.ok(
    capSize.z / barrelSize.z > 1.1 && capSize.z / barrelSize.z < 1.14,
    "photo cap shell is only slightly wider than the barrel",
  );
  assert.ok(
    capSize.x / engine.PENS.matador_i_teen.len > 0.25 &&
      capSize.x / engine.PENS.matador_i_teen.len < 0.28,
    "photo cap shell occupies about a quarter of the complete length",
  );
  const capMesh = model.getObjectByName("Clear_cap_main_shell");
  const capVertices = capMesh.geometry.attributes.position;
  let crownY = Infinity,
    closedCrown = false;
  for (let i = 0; i < capVertices.count; i++)
    crownY = Math.min(crownY, capVertices.getY(i));
  for (let i = 0; i < capVertices.count; i++) {
    if (
      Math.abs(capVertices.getY(i) - crownY) < 0.000001 &&
      Math.hypot(capVertices.getX(i), capVertices.getZ(i)) < 0.000001
    )
      closedCrown = true;
  }
  assert.ok(
    closedCrown,
    "transparent cap has a closed crown rather than an open tube",
  );
  const clipBounds = new THREE.Box3().setFromObject(
    model.getObjectByName("Clear_cap_pocket_clip"),
  );
  assert.ok(
    clipBounds.max.z > cap.max.z,
    "curved clip sits outside the cap to its side",
  );
  assert.ok(
    clipBounds.min.y > cap.min.y,
    "posted clip does not prop the barrel up from underneath",
  );
  const printSize = new THREE.Box3()
    .setFromObject(logoA)
    .getSize(new THREE.Vector3());
  assert.ok(
    printSize.x / bounds.getSize(new THREE.Vector3()).x > 0.38 &&
      printSize.x / bounds.getSize(new THREE.Vector3()).x < 0.42,
    "print matches the compact placement near the tail in the product photo",
  );
  const radiusOf = (mesh) => {
    const vertices = mesh.geometry.attributes.position;
    let radius = 0;
    for (let i = 0; i < vertices.count; i++)
      radius = Math.max(radius, Math.hypot(vertices.getX(i), vertices.getZ(i)));
    return radius;
  };
  const grip = model.getObjectByName("Translucent_grip_sleeve");
  barrelA.geometry.computeBoundingBox();
  assert.ok(
    barrelA.geometry.boundingBox.min.y >= -0.032001,
    "broad coloured barrel stops at the clear grip instead of filling it",
  );
  const feeder = model.getObjectByName("Red_point_feeder");
  feeder.geometry.computeBoundingBox();
  assert.ok(
    radiusOf(feeder) < radiusOf(grip) * 0.25,
    "only a narrow refill sits inside the clear grip and nose",
  );
  assert.ok(
    feeder.geometry.boundingBox.max.y >= barrelA.geometry.boundingBox.min.y &&
      feeder.geometry.boundingBox.min.y <= -0.0684,
    "refill connects the coloured barrel to the steel writing point",
  );
  for (const name of [
    "Translucent_grip_sleeve",
    "Clear_cap_main_shell",
    "Clear_conical_nose",
    "Red_point_feeder",
    "Nose_retaining_ring",
    "Stainless_steel_writing_point",
    "Visible_ruby_red_writing_ink",
  ]) {
    const partA = model.getObjectByName(name);
    const partB = b.model.getObjectByName(name);
    assert.equal(
      partA.material.color.getHex(),
      partB.material.color.getHex(),
      `${name} remains neutral when the barrel colour changes`,
    );
  }
  const steel = model.getObjectByName("Stainless_steel_writing_point").material;
  assert.ok(steel.metalness > 0.8, "exposed writing point is stainless steel");
  assert.equal(steel.opacity, 1);
  const dots = meshesA.filter((mesh) =>
    mesh.name.startsWith("Grip_tactile_dot"),
  );
  assert.equal(dots.length, 80);
  assert.ok(
    dots.every((dot) => radiusOf(dot) - radiusOf(grip) < 0.0002),
    "grip dots are shallow moulded details rather than large beads",
  );
  const sourceCap = template.getObjectByName("CAP_-_posted_on_barrel_tail");
  assert.deepEqual(
    sourceCap.scale.toArray(),
    [1, 1, 1],
    "cached source model stays unchanged",
  );
  const sourceBarrel = new THREE.Box3().setFromObject(
    template.getObjectByName("Transparent_outer_barrel"),
  );
  assert.ok(
    Math.abs(
      barrelSize.z -
        sourceBarrel.getSize(new THREE.Vector3()).x * model.scale.x,
    ) < 0.001,
    "barrel follows the same radial fit as its cap and grip",
  );
  let otherDisposals = 0,
    ownDisposals = 0;
  logoB.material.map.addEventListener("dispose", () => otherDisposals++);
  materialMesh(originals, "branding").material.map.addEventListener(
    "dispose",
    () => otherDisposals++,
  );
  logoA.material.map.addEventListener("dispose", () => ownDisposals++);
  feature.setPenType(a, "ball");
  assert.equal(ownDisposals, 1);
  assert.equal(otherDisposals, 0);
  disposeObjectTree(a.group);
  disposeObjectTree(b.group);
  feature.dispose();
  disposeObjectTree(template);
});
