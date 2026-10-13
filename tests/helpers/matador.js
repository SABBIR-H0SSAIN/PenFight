import { readFile } from "node:fs/promises";
import { Texture } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export async function loadMatadorFixture() {
  const data = await readFile(
    new URL("../../public/models/pens/matador-hi-school.glb", import.meta.url),
  );
  const loader = new GLTFLoader();
  // Node has no image decoder. Load actual GLB meshes/materials; browser smoke
  // checks cover its two embedded PNG decals.
  loader.register(() => ({
    name: "HeadlessTextureAdapter",
    loadTexture: () => Promise.resolve(new Texture()),
  }));
  const gltf = await new Promise((resolve, reject) =>
    loader.parse(
      data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
      "",
      resolve,
      reject,
    ),
  );
  return gltf.scene;
}
