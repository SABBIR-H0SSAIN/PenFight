/** Head geometry and expression animation share the same face rig. */
export function createHeadBuilder({ T, M, lathe, oval, contour }) {
  function makeCharacterHead(S) {
    const skin = S.mats.skin;
    const neck = lathe(
      [
        [4.3, 51],
        [4.05, 53.5],
        [3.8, 57],
        [3.8, 60],
      ],
      skin,
      1,
      0.9,
      32,
    );
    neck.position.z = -0.5;
    S.torso.add(neck);
    S.neck = neck;
    // Rotate at the top of the neck, with the skull overlapping the joint.
    const head = new T.Group();
    head.position.set(0, 58, -0.5);
    S.torso.add(head);
    S.head = head;
    const skull = new T.SphereGeometry(1, 48, 36),
      p = skull.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i),
        jaw = 1 - 0.2 * Math.max(0, -y);
      p.setXYZ(
        i,
        p.getX(i) * 9.3 * jaw,
        10 + y * 11.7,
        p.getZ(i) * 8.4 * (1 - 0.1 * Math.max(0, -y)),
      );
    }
    skull.computeVertexNormals();
    head.add(new T.Mesh(skull, skin));
    const warm = skin.clone();
    warm.color.multiplyScalar(0.86);
    [-1, 1].forEach((sign) => {
      oval(head, skin, [sign * 8.9, 9.1, 0], [1.35, 2.25, 1.3]);
      oval(head, warm, [sign * 9.65, 9.1, -0.5], [0.5, 1.25, 0.6]);
    });
    oval(head, skin, [0, 8.9, -8.05], [1, 1.3, 1.2]);
    const white = M(0xf2eadc, 0.72),
      iris = M(S.idx ? 0x624633 : 0x3d5367, 0.72),
      dark = M(0x211b19, 0.8);
    [white, iris, dark].forEach((m) => m.color.convertSRGBToLinear());
    S.eyes = [];
    S.brows = [];
    [-1, 1].forEach((sign) => {
      const eye = new T.Group();
      eye.position.set(sign * 3.45, 11.35, -7.65);
      eye.rotation.y = -sign * 0.18;
      head.add(eye);
      const eyeball = oval(eye, white, [0, 0, 0], [1.64, 0.94, 0.42]);
      const gaze = new T.Group();
      gaze.position.z = -0.39;
      eye.add(gaze);
      oval(gaze, iris, [0, 0, 0], [0.67, 0.73, 0.13]);
      oval(gaze, dark, [0, 0, -0.12], [0.32, 0.42, 0.045]);
      oval(gaze, white, [-0.18, 0.25, -0.16], [0.13, 0.13, 0.035]);
      const closed = contour(
        eye,
        [
          [-1.45, 0, 0],
          [-0.7, -0.15, -0.2],
          [0.65, -0.15, -0.2],
          [1.45, 0, 0],
        ],
        0.11,
        warm,
      );
      closed.visible = false;
      S.eyes.push({ eye, eyeball, gaze, closed });
      const brow = new T.Group();
      brow.position.set(sign * 3.45, 13.55, -7.38);
      head.add(brow);
      S.brows.push(brow);
      contour(
        brow,
        [
          [-1.5, -0.12, 0.12],
          [-0.5, 0.2, -0.1],
          [0.65, 0.22, -0.1],
          [1.45, 0, 0.14],
        ],
        0.21,
        S.mats.hair,
      );
    });
    S.mouth = new T.Group();
    S.mouth.position.set(0, 5.15, -7.5);
    head.add(S.mouth);
    S.lips = {};
    const lipMaterial = skin.clone();
    lipMaterial.color.multiplyScalar(0.48);
    S.lips.neutral = contour(
      S.mouth,
      [
        [-2.25, 0.12, 0.22],
        [-1.1, -0.2, -0.12],
        [0, -0.3, -0.22],
        [1.1, -0.2, -0.12],
        [2.25, 0.12, 0.22],
      ],
      0.105,
      lipMaterial,
    );
    S.lips.happy = contour(
      S.mouth,
      [
        [-2.5, 0.4, 0.25],
        [-1.2, -0.5, -0.12],
        [0, -0.75, -0.23],
        [1.2, -0.5, -0.12],
        [2.5, 0.4, 0.25],
      ],
      0.14,
      lipMaterial,
    );
    S.lips.frustrated = contour(
      S.mouth,
      [
        [-2, -0.2, 0.18],
        [-1, 0.15, -0.1],
        [0, 0.3, -0.2],
        [1, 0.15, -0.1],
        [2, -0.2, 0.18],
      ],
      0.12,
      lipMaterial,
    );
    S.lips.surprise = oval(
      S.mouth,
      lipMaterial,
      [0, 0, -0.05],
      [0.8, 1.05, 0.16],
    );
    const hp = [],
      hu = [],
      hi = [],
      rows = 28,
      cols = 64;
    const hairPoint = (u, v, lift = 0) => {
      const phi = u * Math.PI * 2,
        front = Math.max(0, -Math.cos(phi)),
        limit = 1.9 - front * 0.82 + 0.07 * Math.sin(phi * 3 + S.idx),
        theta = v * limit;
      return new T.Vector3(
        (9.65 + lift) * Math.sin(theta) * Math.sin(phi),
        10 + (12.1 + lift) * Math.cos(theta),
        (8.75 + lift) * Math.sin(theta) * Math.cos(phi),
      );
    };
    for (let j = 0; j <= rows; j++)
      for (let i = 0; i <= cols; i++) {
        const q = hairPoint(i / cols, j / rows);
        hp.push(q.x, q.y, q.z);
        hu.push(i / cols, j / rows);
        if (j < rows && i < cols) {
          const a = j * (cols + 1) + i;
          hi.push(a, a + cols + 1, a + 1, a + 1, a + cols + 1, a + cols + 2);
        }
      }
    const hg = new T.BufferGeometry();
    hg.setAttribute("position", new T.Float32BufferAttribute(hp, 3));
    hg.setAttribute("uv", new T.Float32BufferAttribute(hu, 2));
    hg.setIndex(hi);
    hg.computeVertexNormals();
    head.add(new T.Mesh(hg, S.mats.hair));
    const hairHighlight = S.mats.hair.clone();
    hairHighlight.color.multiplyScalar(1.45);
    for (let k = 0; k < 4; k++) {
      const pts = [];
      for (let j = 0; j < 8; j++) {
        const q = hairPoint(
          0.36 + k * 0.045 + j * 0.012,
          0.94 - j * 0.09,
          0.08,
        );
        pts.push(q.toArray());
      }
      contour(head, pts, 0.085, hairHighlight);
    }
    animateFace(S);
  }
  function animateFace(S) {
    S.eyes.forEach(({ eyeball, gaze, closed }) => {
      eyeball.visible = gaze.visible = !S.blink;
      closed.visible = S.blink;
      gaze.position.x = S.px * 0.25;
      gaze.position.y = -S.py * 0.15;
    });
    S.brows.forEach((b, i) => {
      b.rotation.z =
        (S.emo === "frustrated" ? 0.18 : S.emo === "think" ? 0.09 : 0) *
        (i ? 1 : -1);
      b.position.y = 13.55 + (S.emo === "surprise" ? 0.6 : 0);
    });
    const expression =
      S.emo === "happy" || S.emo === "smug"
        ? "happy"
        : S.emo === "frustrated"
          ? "frustrated"
          : S.emo === "surprise"
            ? "surprise"
            : "neutral";
    Object.entries(S.lips).forEach(
      ([name, mesh]) => (mesh.visible = name === expression),
    );
  }
  return { makeCharacterHead, animateFace };
}
