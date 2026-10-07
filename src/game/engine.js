import { createPhysics } from "./physics/engine.js";
import { installAlgorithms } from "./ai/algorithms.js";

export function createGameEngine() {
  return installAlgorithms(createPhysics());
}
