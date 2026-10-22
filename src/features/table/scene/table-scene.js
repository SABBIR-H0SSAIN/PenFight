import { createFurnitureLibrary } from "../../furniture/scene/furniture.js";
import { createOriginalBenchTexture } from "./original-bench-texture.js";
import { configureBenchTexture } from "./bench-texture-filter.js";

/** The playable desk with the original light school-bench surface. */
export function createTableFeature(deps) {
  const { THREE: T, R, W, H, sceneRoot, surface = "oak" } = deps;
  const furniture = createFurnitureLibrary(deps);
  function desk() {
    const sc = sceneRoot;
    const canvas = createOriginalBenchTexture(deps, surface);
    const map = configureBenchTexture(deps.ctex(canvas), deps);
    map.name = "original-school-bench";
    const topMaterial = new T.MeshStandardMaterial({
      map,
      roughness: 1,
      metalness: 0,
      envMapIntensity: 0,
    });
    topMaterial.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <lights_physical_fragment>",
        "#include <lights_physical_fragment>\nmaterial.specularColor = vec3(0.0);",
      );
    };
    topMaterial.customProgramCacheKey = () => "original-bench-matte";
    // Canvas rows run down; from above, texture V must run toward -Z.
    // Matching PlaneGeometry orientation keeps the carved letters readable.
    const geometry = furniture.panel(W, H, 4, 1.8).clone();
    const positions = geometry.attributes.position,
      uv = geometry.attributes.uv;
    for (let i = 0; i < positions.count; i++)
      uv.setXY(i, positions.getX(i) / W + 0.5, 0.5 - positions.getZ(i) / H);
    const side = deps.M(
      { oak: 0x8e5f2f, maple: 0xa38a5e, walnut: 0x513722 }[surface] || 0x8e5f2f,
      1,
    );
    const top = new T.Mesh(geometry, [topMaterial, side]);
    top.name = "playable-desk-top";
    top.position.y = -2;
    top.castShadow = true;
    top.receiveShadow = true;
    sc.add(top);
    R.deskMesh = top;
    R.deskWood = canvas;
    const metal = furniture.steel();
    [
      [-27, -46],
      [27, -46],
      [-27, 46],
      [27, 46],
    ].forEach((p) => {
      const l = new T.Mesh(new T.CylinderGeometry(2.2, 2.2, 71, 12), metal);
      l.position.set(p[0], -4 - 35.5, p[1]);
      l.castShadow = true;
      sc.add(l);
      furniture.beam(
        sc,
        [p[0], -75, p[1]],
        [p[0], -72, p[1]],
        2.45,
        furniture.rubber(),
      );
    });
    const rail = (x) => {
      const b = new T.Mesh(new T.BoxGeometry(3, 3, 92), metal);
      b.position.set(x, -9, 0);
      sc.add(b);
    };
    rail(-27);
    rail(27);
    [-46, 46].forEach((z) => {
      const b = new T.Mesh(new T.BoxGeometry(54, 3, 3), metal);
      b.position.set(0, -9, z);
      sc.add(b);
    });
  }
  return { desk };
}
