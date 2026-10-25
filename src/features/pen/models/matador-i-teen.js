import { Box3, FrontSide, Vector3 } from "three";
import { clonePenTemplate } from "./clone-pen-template.js";
import { refineITeenGeometry } from "./i-teen-geometry.js";

// Proportions from Matador's own gel-pen photograph; see the reference notes.
const CAP_WIDTH = 0.87;
const CAP_LENGTH = 0.77;
const DISPLAY_WIDTH = 1.12;
const CLEAR_PARTS = {
  shell: [0.18, 0.12],
  rim: [0.26, 0.18],
  grip: [0.34, 0.3],
  grip_lip: [0.45, 0.24],
  dots: [0.4, 0.28],
  cap: [0.32, 0.1],
  cap_edge: [0.4, 0.12],
  clip: [0.42, 0.12],
};

function glassEdges(material) {
  // Clear moulded plastic reflects more strongly at grazing angles, keeping
  // the cap outline readable without bleaching the coloured core underneath.
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <normal_fragment_maps>",
      `#include <normal_fragment_maps>
      float edgeReflection = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 3.0);
      diffuseColor.a = mix(diffuseColor.a, 0.58, edgeReflection);`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "gl_FragColor = vec4( outgoingLight, diffuseColor.a );",
      `vec3 clearSurface = mix(outgoingLight, vec3(0.11, 0.14, 0.16), edgeReflection * 0.65);
      gl_FragColor = vec4(clearSurface, diffuseColor.a);`,
    );
  };
  material.customProgramCacheKey = () => "i-teen-clear-edge-v2";
}

function reshape(mesh, transform) {
  const vertices = mesh.geometry.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const [x, y, z] = transform(
      vertices.getX(i),
      vertices.getY(i),
      vertices.getZ(i),
    );
    vertices.setXYZ(i, x, y, z);
  }
  vertices.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
  mesh.geometry.computeBoundingBox();
  mesh.geometry.computeBoundingSphere();
}

function refineDetails(model) {
  model.traverse((mesh) => {
    if (!mesh.isMesh) return;
    if (
      /^(Translucent_grip_sleeve|Inside_of_grip_sleeve|Grip_(lower|upper)_collar)$/.test(
        mesh.name,
      )
    ) {
      reshape(mesh, (x, y, z) => [x * 0.94, y, z * 0.94]);
    } else if (mesh.name.startsWith("Grip_tactile_dot")) {
      // Moulded, shallow domes rather than large white beads around the sleeve.
      reshape(mesh, (x, y, z) => {
        const radius = Math.hypot(x, z);
        const fitted = 0.00392 + Math.max(0, radius - 0.00417) * 0.35;
        return [(x * fitted) / radius, y, (z * fitted) / radius];
      });
    } else if (mesh.name === "Pale_blue_barrel_end") {
      reshape(mesh, (x, y, z) => [x, 0.073 - (0.073 - y) * 0.85, z]);
    } else if (mesh.material.name === "branding") {
      // Compact the print near the rear, matching the product photo's spacing.
      reshape(mesh, (x, y, z) => [x, 0.0615 - (0.0615 - y) * 0.64, z]);
    }
    // Inner walls need just a faint edge, not a second milky outer coating.
    if (
      /^(Inner_surface_of_acrylic_barrel|Inside_of_grip_sleeve|Clear_cap_inner_wall)$/.test(
        mesh.name,
      )
    ) {
      mesh.material = mesh.material.clone();
      mesh.material.opacity = mesh.name === "Clear_cap_inner_wall" ? 0.1 : 0.06;
    }
  });
}

/** Posted i-teen gel GLB; body colour stops where the clear grip begins. */
export function buildMatadorITeen({ g, L, r, chosen, template }) {
  if (!template) throw new Error("The Matador i-teen model has not loaded.");
  const model = clonePenTemplate(template, (material, source) => {
    const clear = CLEAR_PARTS[source.name];
    if (clear) {
      material.color.setHex(0xc6d0d8).convertSRGBToLinear();
      [material.opacity, material.roughness] = clear;
      material.metalness = 0;
      material.side = FrontSide;
      material.envMapIntensity = 0.25;
      if (["shell", "cap", "cap_edge", "clip"].includes(source.name))
        glassEdges(material);
    }
    if (!["red", "red_shade", "ink"].includes(source.name)) return;
    // The broad barrel is coloured plastic. The slim refill inside the clear
    // grip/nose and the writing ball must not inherit that plastic colour.
    const colour =
      source.name === "red"
        ? chosen
        : source.name === "ink"
          ? 0x171b20
          : 0x555c64;
    material.color.setHex(colour).convertSRGBToLinear();
    material.metalness = 0;
    material.roughness = 0.48;
    material.envMapIntensity = 0.25;
  });
  model.updateMatrixWorld(true);
  const cap = model.getObjectByName("CAP_-_posted_on_barrel_tail");
  const crown = new Box3().setFromObject(cap).max.y;
  // Source -Y writing tip becomes +X, and +Z printing faces tabletop-up +Y.
  model.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
  model.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(model);
  const center = bounds.getCenter(new Vector3());
  const axialScale = L / (bounds.max.x - bounds.min.x);
  // A modest fuller silhouette at game distance; keep the axial length and
  // cap/grip/nib proportions intact instead of enlarging the whole pen.
  const radialScale =
    (r * DISPLAY_WIDTH) / Math.max(-bounds.min.y, bounds.max.y);
  // Resize the whole cap/clip assembly while keeping its crown at the rear.
  // Keep the original overall fit so correcting the cap cannot widen the barrel.
  refineDetails(model);
  refineITeenGeometry(model);
  cap.scale.set(CAP_WIDTH, CAP_LENGTH, CAP_WIDTH);
  cap.position.y = crown - (crown - cap.position.y) * CAP_LENGTH;
  // Post the clip to the side, rather than trapping it beneath the barrel.
  cap.rotateY(-Math.PI / 2);
  model.scale.set(radialScale, axialScale, radialScale);
  model.position.x = -center.x * axialScale;
  model.name = "matador-i-teen-glb";
  g.add(model);
}
