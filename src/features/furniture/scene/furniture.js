import { gameConfig } from "../../../config/config.ts";
import { woodUv } from "./wood-uv.js";
import { createOriginalBenchTexture } from "../../table/scene/original-bench-texture.js";
import { release } from "../../../game/scene/dispose.js";
import { configureBenchTexture } from "../../table/scene/bench-texture-filter.js";

/** Replace only wood materials, preserving geometry, lighting and animation rigs. */
export function updateFurnitureSurface(root, deps, surface) {
  const old = new Set();
  let finish;
  const replace = (material) => {
    const name = material?.map?.name || "";
    if (
      !name.startsWith("original-school-bench-") ||
      name === `original-school-bench-${surface}`
    )
      return material;
    finish ||= createFurnitureLibrary({ ...deps, surface }).benchWood();
    old.add(material);
    return finish;
  };
  root.traverse((object) => {
    if (!object.isMesh) return;
    object.material = Array.isArray(object.material)
      ? object.material.map(replace)
      : replace(object.material);
  });
  old.forEach((material) => {
    release(material.map);
    release(material);
  });
}

/** Shared construction within one scene owner; materials are disposed with its meshes. */
export function createFurnitureLibrary(deps) {
  const { THREE: T, R = {} } = deps;
  const geometries = new Map(),
    materials = new Map();
  function wood() {
    return benchWood();
  }
  function material(name, color, roughness, metalness = 0) {
    if (!materials.has(name))
      materials.set(
        name,
        new T.MeshStandardMaterial({
          color,
          roughness,
          metalness,
          envMapIntensity: 0.4,
        }),
      );
    return materials.get(name);
  }
  function benchWood() {
    const surface = deps.surface || "oak",
      key = `matching-bench:${surface}`;
    if (!materials.has(key)) {
      const canvas = createOriginalBenchTexture(
        { ...deps, W: 60, H: 100 },
        surface,
        {
          resolution:
            gameConfig.graphics.quality[R.quality || "high"].woodTextureSize,
        },
      );
      const map = configureBenchTexture(deps.ctex(canvas), deps);
      map.name = `original-school-bench-${surface}`;
      const finish = new T.MeshStandardMaterial({
        map,
        roughness: 1,
        metalness: 0,
        envMapIntensity: 0,
      });
      finish.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <lights_physical_fragment>",
          "#include <lights_physical_fragment>\nmaterial.specularColor = vec3(0.0);",
        );
      };
      finish.customProgramCacheKey = () => "matching-original-bench-matte";
      materials.set(key, finish);
    }
    return materials.get(key);
  }
  const steel = () => material("painted-steel", 0x353b3b, 0.64, 0.45);
  const rubber = () => material("rubber-feet", 0x242523, 0.96);
  const edge = () => benchWood();
  const screw = () => material("steel-fasteners", 0x878780, 0.48, 0.8);
  function geometry(key, build) {
    if (!geometries.has(key)) geometries.set(key, build());
    return geometries.get(key);
  }
  function panel(
    width,
    depth,
    thickness,
    radius = 1.6,
    dish = false,
    variation = 0,
    layout = "bench",
  ) {
    const variant = ((variation % 6) + 6) % 6;
    return geometry(
      `panel:${width}:${depth}:${thickness}:${radius}:${dish}:${variant}:${layout}`,
      () => {
        const x = width / 2 - 0.25,
          z = depth / 2 - 0.25,
          r = radius;
        const shape = new T.Shape();
        shape.moveTo(-x + r, -z);
        shape.lineTo(x - r, -z);
        shape.quadraticCurveTo(x, -z, x, -z + r);
        shape.lineTo(x, z - r);
        shape.quadraticCurveTo(x, z, x - r, z);
        shape.lineTo(-x + r, z);
        shape.quadraticCurveTo(-x, z, -x, z - r);
        shape.lineTo(-x, -z + r);
        shape.quadraticCurveTo(-x, -z, -x + r, -z);
        const g = new T.ExtrudeGeometry(shape, {
          depth: thickness - 0.5,
          steps: 1,
          curveSegments: 3,
          bevelEnabled: true,
          bevelSegments: 2,
          bevelSize: 0.25,
          bevelThickness: 0.25,
        });
        g.rotateX(-Math.PI / 2);
        g.center();
        const p = g.attributes.position,
          uv = g.attributes.uv;
        for (let i = 0; i < p.count; i++) {
          const px = p.getX(i),
            pz = p.getZ(i);
          const [u, v] =
            layout === "bench"
              ? [px / width + 0.5, 0.5 - pz / depth]
              : woodUv(px, pz, width, depth, variant);
          uv.setXY(i, u, v);
          if (dish)
            p.setY(
              i,
              p.getY(i) -
                0.55 *
                  Math.max(0, 1 - (px / x) ** 2) *
                  Math.max(0, 1 - (pz / z) ** 2),
            );
        }
        g.computeVertexNormals();
        return g;
      },
    );
  }
  function mesh(parent, geo, mat, position, name) {
    const m = new T.Mesh(geo, mat);
    m.position.set(...position);
    m.name = name || "";
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function beam(parent, a, b, radius = 1, mat = steel()) {
    const m = mesh(
      parent,
      geometry("steel-tube", () => new T.CylinderGeometry(1, 1, 1, 8)),
      mat,
      [0, 0, 0],
    );
    const start = new T.Vector3(...a),
      end = new T.Vector3(...b),
      d = end.sub(start);
    m.position.copy(start).addScaledVector(d, 0.5);
    m.scale.set(radius, d.length(), radius);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
    return m;
  }
  function chair(detail = true, tint = 0xf0e9dd, variation = 0) {
    const g = new T.Group();
    g.name = "school-chair";
    mesh(
      g,
      panel(40, 38, 2.6, 2.4, true, variation),
      [wood(tint), edge()],
      [0, -30, 4],
      "chair-seat",
    );
    const back = mesh(
      g,
      panel(40, 26, 2.4, 2.8, false, variation + 1),
      [wood(tint), edge()],
      [0, -12, 23],
      "chair-back",
    );
    back.rotation.x = Math.PI / 2 - 0.1;
    for (const x of [-17, 17]) {
      beam(g, [x * 1.08, -74, -12], [x, -31, -10]);
      beam(g, [x * 1.08, -74, 21], [x, -31, 18]);
      beam(g, [x, -32, 18], [x, 0, 24], 0.95);
      if (detail) {
        beam(g, [x, -32, -12], [x, -32, 18], 1.1);
        beam(g, [x, -54, -11], [x, -54, 20], 0.65);
        for (const z of [-12, 21])
          beam(g, [x * 1.08, -75, z], [x * 1.08, -72.5, z], 1.35, rubber());
      }
    }
    if (detail) {
      beam(g, [-17, -33, -10], [17, -33, -10], 0.85);
      const fastener = geometry(
        "screw-head",
        () => new T.CylinderGeometry(0.5, 0.5, 0.16, 8),
      );
      for (const x of [-15, 15]) {
        for (const z of [-10, 17]) mesh(g, fastener, screw(), [x, -28.65, z]);
        const bolt = mesh(g, fastener, screw(), [x, -12, 21.7]);
        bolt.rotation.x = Math.PI / 2;
      }
    }
    return g;
  }
  function desk(detail = true, tint = 0xffffff, variation = 0) {
    const g = new T.Group();
    g.name = "school-desk";
    mesh(
      g,
      panel(60, 45, 3, 1.8, false, variation, "bench"),
      [benchWood(60, 45, variation, tint), edge()],
      [0, -1.5, 0],
      "desk-top",
    );
    for (const x of [-26, 26]) {
      for (const z of [-18, 18]) {
        beam(g, [x, -74, z], [x, -3, z], 1.15);
        if (detail) beam(g, [x, -75, z], [x, -72, z], 1.5, rubber());
      }
      if (detail) beam(g, [x, -8, -18], [x, -8, 18], 1.1);
    }
    if (detail) {
      beam(g, [-26, -8, -18], [26, -8, -18], 1.1);
      mesh(
        g,
        geometry("book-shelf", () => new T.BoxGeometry(48, 1.2, 30)),
        steel(),
        [0, -14, -1],
      );
    }
    return g;
  }
  return {
    wood,
    benchWood,
    steel,
    rubber,
    edge,
    screw,
    panel,
    mesh,
    beam,
    chair,
    desk,
  };
}
