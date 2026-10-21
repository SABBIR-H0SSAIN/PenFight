import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Group } from "three";
import { MATADOR_MODEL_URL } from "../src/features/pen/models/assets.js";
import { sceneFixture } from "./helpers/scene.js";
import { createClassroomFeature } from "../src/features/classroom/scene/classroom-scene.js";
import { createTableFeature } from "../src/features/table/scene/table-scene.js";
import { createCharacterFeature } from "../src/features/character/scene/character-scene.js";
import { createOriginalBenchTexture } from "../src/features/table/scene/original-bench-texture.js";
import { disposeObjectTree } from "../src/game/scene/dispose.js";

test("immutable model URL changes whenever the model bytes change", async () => {
  const url = new URL(MATADOR_MODEL_URL, "http://localhost");
  const bytes = await readFile(
    new URL(`../public${url.pathname}`, import.meta.url),
  );
  assert.equal(
    url.searchParams.get("v"),
    createHash("sha256").update(bytes).digest("hex").slice(0, 12),
    "bump the model URL version when replacing the GLB",
  );
});

test("all font subsets are valid local WOFF2 files with matching immutable names", async () => {
  const css = await readFile(
    new URL("../src/app/fonts.css", import.meta.url),
    "utf8",
  );
  const paths = [...css.matchAll(/url\(["']?(\/fonts\/[^)'"\s]+)["']?\)/g)].map(
    (match) => match[1],
  );
  assert.ok(paths.length >= 4);
  assert.equal(new Set(paths).size, paths.length);
  assert.ok(
    !css.includes("https://"),
    "font rendering needs no third-party server",
  );
  for (const path of paths) {
    const bytes = await readFile(new URL(`../public${path}`, import.meta.url));
    assert.equal(bytes.toString("ascii", 0, 4), "wOF2");
    const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
    assert.ok(path.endsWith(`.${hash}.woff2`), path);
  }
});

test("startup paints matching wood once and retains independent GPU ownership", () => {
  const { deps, world } = sceneFixture();
  const cvs = deps.cvs;
  let painted = 0;
  deps.cvs = (w, h) => {
    if (w === 1024 && h === 1707) painted++;
    return cvs(w, h);
  };
  // Exercise each real scene owner with a saved finish rather than the default.
  deps.surface = "walnut";
  const room = new Group(),
    table = new Group();
  createClassroomFeature({ ...deps, sceneRoot: room }).props();
  createTableFeature({ ...deps, sceneRoot: table }).desk();
  const characters = [0, 1].map((slot) =>
    createCharacterFeature(deps).makeStudent(slot),
  );
  assert.equal(painted, 1, "the four owners reuse one painting");
  const maps = [
    table.getObjectByName("playable-desk-top").material[0].map,
    room.getObjectByName("desk-top").material[0].map,
    ...characters.map(
      (character) =>
        character.group.getObjectByName("chair-seat").material[0].map,
    ),
  ];
  assert.equal(
    new Set(maps).size,
    4,
    "GPU textures stay independently disposable",
  );
  assert.equal(new Set(maps.map((map) => map.image)).size, 1);
  let released = 0;
  maps[1].addEventListener("dispose", () => released++);
  disposeObjectTree(table);
  assert.equal(
    released,
    0,
    "disposing the playable desk cannot break the classroom",
  );
  disposeObjectTree(room);
  for (const character of characters) {
    disposeObjectTree(character.group);
    disposeObjectTree(character.arms);
  }
  const image = maps[0].image;
  world.dispose();
  assert.equal(deps.R.benchTextureCanvases.size, 0);
  assert.notEqual(createOriginalBenchTexture(deps, "walnut"), image);
  assert.equal(painted, 2, "a disposed world cannot reuse a stale image");
});

test("bench cache separates finishes, quality, aspect ratio and background markings", () => {
  const { deps } = sceneFixture();
  const oak = createOriginalBenchTexture(deps, "oak");
  assert.equal(createOriginalBenchTexture(deps, "oak"), oak);
  const images = [
    oak,
    createOriginalBenchTexture(deps, "maple"),
    createOriginalBenchTexture(deps, "walnut"),
    createOriginalBenchTexture(deps, "oak", { resolution: 512 }),
    createOriginalBenchTexture({ ...deps, W: 100, H: 60 }, "oak"),
    createOriginalBenchTexture(deps, "oak", { background: true, variation: 0 }),
    createOriginalBenchTexture(deps, "oak", { background: true, variation: 1 }),
  ];
  assert.equal(new Set(images).size, images.length);
  const other = sceneFixture();
  assert.notEqual(
    createOriginalBenchTexture(other.deps, "oak"),
    oak,
    "worlds do not retain each other's canvases",
  );
});
