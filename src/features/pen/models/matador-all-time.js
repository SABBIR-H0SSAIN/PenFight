import { Box3, FrontSide, LatheGeometry, Vector2, Vector3 } from "three";
import { clonePenTemplate } from "./clone-pen-template.js";
import { release } from "../../../game/scene/dispose.js";

const CLEAR_PLASTIC = {
  barrel: 0.4,
  barrel_line: 0.22,
  barrel_highlight: 0.44,
  barrel_shadow: 0.18,
  grip_clear: 0.32,
  grip_rib: 0.42,
  grip_rib_shadow: 0.2,
};

function clearPlastic(material, opacity) {
  material.color.setHex(0xf4fafc).convertSRGBToLinear();
  material.metalness = 0;
  material.roughness = 0.16;
  material.transparent = true;
  material.opacity = opacity;
  material.side = FrontSide;
  material.depthWrite = false;
}

/** Clear barrel and grip, dark refill, matching coloured cap/plug/tip housing. */
export function buildMatadorAllTime({ g, L, r, chosen, template }) {
  if (!template) throw new Error("The Matador All Time model has not loaded.");
  const model = clonePenTemplate(template, (material, source) => {
    const opacity = CLEAR_PLASTIC[source.name];
    if (opacity !== undefined) {
      clearPlastic(material, opacity);
      return;
    }
    if (source.name === "barrel_inner") {
      // This named material belongs to the ink refill, not the outer shell.
      material.color.setHex(0x20252a).convertSRGBToLinear();
      material.metalness = 0;
      material.roughness = 0.35;
      return;
    }
    if (
      !/^(burgundy|amber)(_|$)|^tip_(gold(_high)?|inner)$|^cap_inner$/.test(
        source.name,
      )
    )
      return;
    material.color.setHex(chosen).convertSRGBToLinear();
    material.metalness = 0;
    material.roughness = 0.22;
    if (/_light$|_high$/.test(source.name)) material.color.multiplyScalar(1.15);
    if (/_dark$|^tip_inner$|^cap_inner$/.test(source.name))
      material.color.multiplyScalar(0.55);
  });
  model.traverse((mesh) => {
    if (
      !/^(Chrome_separation_rings|Lower_barrel_chrome_join|Lower_barrel_polished_edge|Rear_chrome_joint|Rear_chrome_joint_dark_seam)$/.test(
        mesh.name,
      )
    )
      return;
    // The source's metallic collar accents are moulded clear plastic on the pen.
    // Clone here so the actual steel nib keeps its original shared material.
    mesh.material = mesh.material.clone();
    clearPlastic(mesh.material, 0.3);
  });
  const refill = model.getObjectByName("Dark_internal_refill");
  release(refill.geometry);
  // Continue through the clear grip and taper inside the coloured nose, with
  // a small overlap into the steel nib so there is no visible break in the ink.
  refill.geometry = new LatheGeometry(
    [
      [0, -0.0708],
      [0.0004, -0.0708],
      [0.0005, -0.0693],
      [0.00108, -0.0548],
      [0.00108, 0.0628],
      [0, 0.0628],
    ].map(([radius, y]) => new Vector2(radius, y)),
    24,
  );
  const feeder = model.getObjectByName("Tip_inner_copper_core");
  feeder.material = refill.material;
  feeder.scale.set(0.38, 1, 0.38);
  // Source -Y tip becomes game +X; the +Z printed logo faces tabletop-up +Y.
  model.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
  model.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(model);
  const center = bounds.getCenter(new Vector3());
  const axialScale = L / (bounds.max.x - bounds.min.x);
  const radialScale = r / Math.max(-bounds.min.y, bounds.max.y);
  model.scale.set(radialScale, axialScale, radialScale);
  model.position.x = -center.x * axialScale;
  model.name = "matador-all-time-glb";
  g.add(model);
}
