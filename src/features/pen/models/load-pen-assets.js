import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  MATADOR_MODEL_URL,
  SMOOTHY_MODEL_URL,
  ALL_TIME_MODEL_URL,
  I_TEEN_MODEL_URL,
} from "./assets.js";

export {
  MATADOR_MODEL_URL,
  SMOOTHY_MODEL_URL,
  ALL_TIME_MODEL_URL,
  I_TEEN_MODEL_URL,
} from "./assets.js";
/** Immutable CPU-side templates; mounted pens own cloned GPU resources. */
function cachedModel(url) {
  /** @type {Promise<import("three").Object3D> | undefined} */
  let pending;
  return () => {
    if (!pending) {
      pending = new GLTFLoader()
        .loadAsync(url)
        .then(({ scene }) => scene)
        .catch((error) => {
          pending = undefined;
          throw error;
        });
    }
    return pending;
  };
}
export const loadMatadorHighSchool = cachedModel(MATADOR_MODEL_URL);
export const loadMatadorSmoothy = cachedModel(SMOOTHY_MODEL_URL);
export const loadMatadorAllTime = cachedModel(ALL_TIME_MODEL_URL);
export const loadMatadorITeen = cachedModel(I_TEEN_MODEL_URL);
