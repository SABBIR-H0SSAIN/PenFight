import { Box3, Vector3 } from "three";
import { clonePenTemplate } from "./clone-pen-template.js";

/** Use the supplied full Smoothy GLB with its cap on the back. */
export function buildMatadorSmoothy({ g, L, r, chosen, template }) {
  if (!template) throw new Error("The Matador Smoothy model has not loaded.");
  const model = clonePenTemplate(template, (material, source) => {
    if (!/mint/i.test(source.name)) return;
    material.color.setHex(chosen).convertSRGBToLinear();
    if (!material.map) return;
    // The embedded printing has a mint background. Use its green channel as
    // an ink mask so custom colours retain the black MATADOR/smoothy lettering.
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `#include <map_fragment>
#ifdef USE_MAP
        diffuseColor.rgb = diffuse * (texelColor.g / 0.745404);
#endif`,
      );
    };
    material.customProgramCacheKey = () => "smoothy-printed-colour-v1";
  });
  // Source tip is -Y, printing faces +Z: map them to +X and tabletop-up +Y.
  model.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
  model.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(model);
  const center = bounds.getCenter(new Vector3());
  const axialScale = L / (bounds.max.x - bounds.min.x);
  const radialScale = r / Math.max(-bounds.min.y, bounds.max.y);
  model.scale.set(radialScale, axialScale, radialScale);
  model.position.x = -center.x * axialScale;
  model.name = "matador-smoothy-glb";
  g.add(model);
}
