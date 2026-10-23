import {
  ACESFilmicToneMapping,
  AmbientLight,
  Box3,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
  Scene,
  Vector3,
  WebGLRenderer,
  sRGBEncoding,
} from "three";
import { loadMatadorHighSchool } from "@/features/pen/models/load-pen-assets";

export async function renderMenuPen(): Promise<string> {
  const template = await loadMatadorHighSchool();
  const renderer = new WebGLRenderer({
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  });

  try {
    renderer.setSize(680, 320);
    renderer.outputEncoding = sRGBEncoding;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.setClearColor(0xffffff, 0);

    const scene = new Scene();
    scene.add(new AmbientLight(0xffffff, 0.7));
    const light = new DirectionalLight(0xffffff, 1.1);
    light.position.set(-4, 7, 12);
    scene.add(light);

    const pen = template.clone(true);
    pen.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const tintBarrel = (material: MeshStandardMaterial) => {
        if (!/emerald/i.test(material.name)) return material;
        const tinted = material.clone();
        tinted.color.setHex(0x147a4b).convertSRGBToLinear();
        return tinted;
      };
      object.material = Array.isArray(object.material)
        ? object.material.map(tintBarrel)
        : tintBarrel(object.material);
    });
    const center = new Box3().setFromObject(pen).getCenter(new Vector3());
    pen.position.sub(center);
    pen.scale.set(1, 2, 2);
    const tiltedPen = new Group();
    tiltedPen.rotation.z = Math.PI / 9;
    tiltedPen.add(pen);
    scene.add(tiltedPen);

    const camera = new OrthographicCamera(-8.5, 8.5, 4, -4, 0.1, 100);
    camera.position.set(0, 4, 26);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    return renderer.domElement.toDataURL("image/png");
  } finally {
    renderer.dispose();
    renderer.forceContextLoss();
  }
}
