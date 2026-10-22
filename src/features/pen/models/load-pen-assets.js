import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MATADOR_MODEL_URL } from "./assets.js";

export { MATADOR_MODEL_URL } from "./assets.js";
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
