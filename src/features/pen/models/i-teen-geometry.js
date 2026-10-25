import {
  ExtrudeGeometry,
  LatheGeometry,
  Shape,
  SphereGeometry,
  Vector2,
} from "three";
import { release } from "../../../game/scene/dispose.js";

const lathe = (points, segments = 32) =>
  new LatheGeometry(
    points.map(([radius, y]) => new Vector2(radius, y)),
    segments,
  );

function replace(model, name, geometry) {
  const mesh = model.getObjectByName(name);
  release(mesh.geometry);
  mesh.geometry = geometry;
}

/** Detail silhouettes in source metres, retaining the supplied assembly/pivot. */
export function refineITeenGeometry(model) {
  // Coloured barrel ends at the top of the clear grip. The supplied core
  // continued at full diameter through the grip, making it look solid-coloured.
  replace(
    model,
    "Red_ink_barrel",
    lathe([
      [0, -0.032],
      [0.00298, -0.032],
      [0.00298, 0.0634],
      [0, 0.0634],
    ]),
  );
  // A narrow neutral refill runs through the grip into the steel point,
  // leaving clear space around it inside the transparent nose cone.
  replace(
    model,
    "Red_point_feeder",
    lathe([
      [0, -0.0685],
      [0.00048, -0.0685],
      [0.00065, -0.0668],
      [0.00085, -0.059],
      [0.00085, -0.0318],
      [0, -0.0318],
    ]),
  );
  // Closed bevelled crown, long moulded flats and a narrow mouth bevel.
  replace(
    model,
    "Clear_cap_main_shell",
    lathe(
      [
        [0, -0.0275],
        [0.0024, -0.02745],
        [0.00335, -0.0269],
        [0.0041, -0.0258],
        [0.00448, -0.0246],
        [0.00463, -0.0228],
        [0.00463, 0.0208],
        [0.00456, 0.0228],
        [0.00448, 0.0238],
      ],
      12,
    ),
  );

  // A continuous rounded spring clip with an arched attachment and hooked tip.
  const clip = new Shape();
  clip.moveTo(-0.0244, 0.00425);
  clip.bezierCurveTo(-0.025, 0.0051, -0.022, 0.0057, -0.018, 0.00575);
  clip.bezierCurveTo(-0.006, 0.00565, 0.013, 0.00565, 0.026, 0.0053);
  clip.quadraticCurveTo(0.0295, 0.00525, 0.03, 0.00465);
  clip.lineTo(0.0287, 0.00445);
  clip.quadraticCurveTo(0.0277, 0.00495, 0.0255, 0.00499);
  clip.bezierCurveTo(0.013, 0.00527, -0.005, 0.00528, -0.0175, 0.0053);
  clip.quadraticCurveTo(-0.021, 0.0053, -0.022, 0.00435);
  clip.closePath();
  const clipGeometry = new ExtrudeGeometry(clip, {
    depth: 0.0014,
    steps: 1,
    curveSegments: 16,
    bevelEnabled: true,
    bevelThickness: 0.0001,
    bevelSize: 0.0001,
    bevelSegments: 3,
  });
  const vertices = clipGeometry.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const y = vertices.getX(i),
      z = vertices.getY(i);
    const along = Math.max(0, Math.min(1, (y + 0.0244) / 0.0544));
    vertices.setXYZ(i, (vertices.getZ(i) - 0.0007) * (1 - along * 0.24), y, z);
  }
  clipGeometry.computeVertexNormals();
  replace(model, "Clear_cap_pocket_clip", clipGeometry);
  const clipTip = new SphereGeometry(0.0004, 12, 8);
  clipTip.scale(0.9, 1, 0.7);
  clipTip.translate(0, 0.0292, 0.0048);
  replace(model, "Rounded_transparent_clip_tip", clipTip);

  // Smooth plastic taper meeting a small stepped stainless writing point.
  replace(
    model,
    "Clear_conical_nose",
    lathe([
      [0.00115, -0.0687],
      [0.00122, -0.0684],
      [0.00127, -0.0679],
      [0.00134, -0.0668],
      [0.00152, -0.0655],
      [0.00185, -0.0639],
      [0.0023, -0.062],
      [0.00274, -0.0606],
      [0.00315, -0.0594],
      [0.00342, -0.0586],
      [0.00358, -0.0582],
      [0.00358, -0.0579],
    ]),
  );
  replace(
    model,
    "Stainless_steel_writing_point",
    lathe([
      [0, -0.0742],
      [0.00022, -0.0742],
      [0.00028, -0.0739],
      [0.0003, -0.0734],
      [0.00038, -0.0728],
      [0.00044, -0.072],
      [0.00044, -0.0713],
      [0.00052, -0.0711],
      [0.0006, -0.0708],
      [0.00062, -0.0694],
      [0.00078, -0.0691],
      [0.00086, -0.0687],
      [0.00091, -0.0674],
      [0, -0.0674],
    ]),
  );
}
