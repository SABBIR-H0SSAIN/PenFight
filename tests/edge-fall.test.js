import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createGameEngine } from "../src/game/engine.js";
import { interpolateRecording } from "../src/game/controller/playback.js";
import { sceneFixture, meshesOf } from "./helpers/scene.js";
import { loadMatadorFixture } from "./helpers/matador.js";
import { createPenFeature } from "../src/features/pen/models/pen-models.js";
import { disposeObjectTree } from "../src/game/scene/dispose.js";

const noFlick = { ang: 0, pow: 0, off: 0 };
const edges = [
  [-6, 50, 0],
  [66, 50, 0],
  [30, -6, Math.PI / 2],
  [30, 106, Math.PI / 2],
  [-3, -3, Math.PI / 4],
  [63, -3, -Math.PI / 4],
  [-3, 103, -Math.PI / 4],
  [63, 103, Math.PI / 4],
];

for (const real of [false, true]) {
  for (const type of Object.keys(createGameEngine().PENS)) {
    test(`${type}: a small supported end cannot suspend an overbalanced pen, real=${real}`, () => {
      const engine = createGameEngine();
      engine.setRealism(real);
      for (const [x, y, a] of [
        ...edges,
        [-0.1, 50, Math.PI / 2],
        [60.1, 50, Math.PI / 2],
        [30, -0.1, 0],
        [30, 100.1, 0],
      ]) {
        const pen = engine.makePen(type, x, y, a);
        assert.equal(engine.overlapsTable(pen), true);
        assert.equal(engine.hasTableSupport(pen), false);
        const before = structuredClone(pen);
        const other = engine.makePen("ball", 30, 25, 0);
        const results = [0, 0.45].map((afterOut) =>
          engine.shoot([pen, other], 0, noFlick, {
            record: 1 / 60,
            afterOut,
            maxT: 4.8,
          }),
        );
        assert.deepEqual(pen, before, "simulation must not mutate the input");
        for (const result of results) {
          assert.equal(result.out, 0);
          assert.equal(
            result.pens[0].landed,
            true,
            `${type} at ${x},${y} must finish falling`,
          );
          assert.equal(result.pens[1].out, false);
          assert.ok(
            result.rec.some(
              (frame) => frame.p[0].tipAngle > 0 && frame.p[0].z < 0,
            ),
          );
          assert.equal(result.events.filter((e) => e.type === "out").length, 1);
          const landing = result.events.find((e) => e.type === "landing");
          assert.ok(landing.t > result.pens[0].outT);
          assert.ok(
            result.rec.find((frame) => frame.t === landing.t)?.p[0].landed,
          );
          assert.ok(
            result.rec.every((frame) =>
              frame.p.every((p) =>
                [p.x, p.y, p.z, p.tipAngle, p.tipNX, p.tipNY].every(
                  Number.isFinite,
                ),
              ),
            ),
          );
        }
        assert.equal(
          results[0].out,
          engine.shoot([pen, other], 0, noFlick).out,
          "AI and recorded gameplay must agree about the fall",
        );
      }
    });
  }
}

test("rendered pen geometry tips around every edge and corner without passing through the desk", async () => {
  const template = await loadMatadorFixture();
  const { deps, engine } = sceneFixture();
  const feature = createPenFeature(deps, template),
    pen = feature.makePen(0);
  const desk = new THREE.Box3(
    new THREE.Vector3(-29.98, -3.98, -49.98),
    new THREE.Vector3(29.98, -0.02, 49.98),
  );
  const triangle = new THREE.Triangle();
  const bounds = new THREE.Box3();
  for (const type of Object.keys(engine.PENS)) {
    feature.setPenType(pen, type);
    const meshes = meshesOf(pen.model);
    meshes.forEach((mesh) => mesh.geometry.computeBoundingBox());
    const movingEdges = [
      [1, 50, Math.PI, -40, 0, 8],
      [59, 50, 0, 40, 0, -8],
      [30, 1, -Math.PI / 2, 0, -40, 8],
      [30, 99, Math.PI / 2, 0, 40, -8],
      [1, 50, Math.PI / 2, -180, 0, 0],
      [59, 50, Math.PI / 4, 180, 0, 0],
      [30, 1, 0, 0, -180, 0],
      [30, 99, Math.PI / 4, 0, 180, 0],
    ];
    for (const [x, y, a, vx = 0, vy = 0, spin = 0] of [
      ...edges,
      ...movingEdges,
    ]) {
      const moving = engine.makePen(type, x, y, a);
      Object.assign(moving, { vx, vy, w: spin });
      const result = engine.shoot(
        [moving, engine.makePen("ball", 30, 25, 0)],
        0,
        noFlick,
        { record: 1 / 60, afterOut: 0.45 },
      );
      for (let time = 0; time <= result.t; time += 1 / 120) {
        feature.setPen(pen, interpolateRecording(result.rec, time).p[0], time);
        pen.group.updateMatrixWorld(true);
        for (const mesh of meshes) {
          bounds.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
          if (!desk.intersectsBox(bounds)) continue;
          const { position } = mesh.geometry.attributes,
            index = mesh.geometry.index;
          for (let i = 0; i < (index?.count ?? position.count); i += 3) {
            for (const [j, point] of [
              [0, triangle.a],
              [1, triangle.b],
              [2, triangle.c],
            ])
              point
                .fromBufferAttribute(
                  position,
                  index ? index.getX(i + j) : i + j,
                )
                .applyMatrix4(mesh.matrixWorld);
            assert.equal(
              desk.intersectsTriangle(triangle),
              false,
              `${type} at ${x},${y}, time=${time}: ${mesh.name || mesh.geometry.type} clips wood`,
            );
          }
        }
      }
      // The settled match view renders with time=0; it must retain the same
      // orientation as the final playback frame instead of appearing to float.
      feature.setPen(pen, result.pens[0], result.t);
      const finalRotation = pen.holder.quaternion.toArray();
      feature.setPen(pen, result.pens[0], 0);
      assert.deepEqual(pen.holder.quaternion.toArray(), finalRotation);
    }
  }
  disposeObjectTree(pen.group);
  feature.dispose();
});
