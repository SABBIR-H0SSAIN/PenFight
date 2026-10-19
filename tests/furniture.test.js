import test from "node:test";
import assert from "node:assert/strict";
import { woodUv } from "../src/features/furniture/scene/wood-uv.js";
import * as THREE from "three";
import { sceneFixture } from "./helpers/scene.js";
import { configureBenchTexture } from "../src/features/table/scene/bench-texture-filter.js";
import { createOriginalBenchTexture } from "../src/features/table/scene/original-bench-texture.js";

test("bench textures retain power-of-two mipmap detail on WebGL 1", () => {
  const { deps } = sceneFixture();
  for (const quality of ["low", "medium", "high"]) {
    const canvas = createOriginalBenchTexture({ ...deps, R: { quality } });
    assert.equal(canvas.width & (canvas.width - 1), 0);
    assert.equal(canvas.height & (canvas.height - 1), 0);
    assert.equal(
      canvas.height,
      canvas.width * 2,
      "longitudinal detail is retained rather than reduced to a square",
    );
  }
});

test("wood filtering uses available anisotropy and keeps smooth distance filtering", () => {
  for (const supported of [1, 4, 8, 16, 32]) {
    const texture = configureBenchTexture(new THREE.Texture(), {
      THREE,
      R: { renderer: { capabilities: { getMaxAnisotropy: () => supported } } },
    });
    assert.equal(texture.anisotropy, Math.min(16, supported));
    assert.equal(texture.generateMipmaps, true);
    assert.equal(texture.minFilter, THREE.LinearMipmapLinearFilter);
    assert.equal(texture.magFilter, THREE.LinearFilter);
    texture.dispose();
  }
});

test("wood grain keeps photograph proportions on tables, seats and chair backs", () => {
  for (const [width, depth] of [
    [60, 100],
    [60, 45],
    [40, 38],
    [40, 26],
    [110, 50],
  ]) {
    for (let variant = 0; variant < 6; variant++) {
      const origin = woodUv(0, 0, width, depth, variant);
      const x = woodUv(1, 0, width, depth, variant);
      const z = woodUv(0, 1, width, depth, variant);
      const pixels = (point) =>
        Math.hypot((point[0] - origin[0]) * 1536, (point[1] - origin[1]) * 860);
      assert.ok(
        Math.abs(pixels(x) - pixels(z)) < 0.00001,
        "one world unit samples the same pixel distance in both directions",
      );
      for (const px of [-width / 2, width / 2]) {
        for (const pz of [-depth / 2, depth / 2]) {
          assert.ok(
            woodUv(px, pz, width, depth, variant).every((n) => n > 0 && n < 1),
            "non-seamless photo never wraps at the panel edge",
          );
        }
      }
      if (depth > width)
        assert.equal(x[0], origin[0], "grain follows the long tabletop axis");
    }
  }
});
