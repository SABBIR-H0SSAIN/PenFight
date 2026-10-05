import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export const MATADOR_MODEL_URL = "/models/pens/matador-hi-school.glb";
/** @type {Promise<import("three").Object3D> | undefined} */
let pending;
/** One immutable CPU-side template; mounted pens own cloned GPU resources. */
/** @returns {Promise<import("three").Object3D>} */
export function loadMatadorHighSchool() {
  if (!pending) {
    pending = new GLTFLoader()
      .loadAsync(MATADOR_MODEL_URL)
      .then(({ scene }) => scene)
      .catch((error) => {
        pending = undefined;
        throw error;
      });
  }
  return pending;
}
