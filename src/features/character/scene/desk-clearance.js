/** Cache a conservative body envelope; only its intersection with desk height
 * limits how far the seated character can move forward. */
export function createDeskClearance(T, torso) {
  torso.updateMatrixWorld(true);
  const inverse = new T.Matrix4().copy(torso.matrixWorld).invert();
  const vertex = new T.Vector3();
  const sections = new Map();
  torso.traverse((mesh) => {
    if (!mesh.isMesh) return;
    const points = mesh.geometry.attributes.position;
    const matrix = new T.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld);
    for (let i = 0; i < points.count; i++) {
      vertex.fromBufferAttribute(points, i).applyMatrix4(matrix);
      const row = Math.floor(vertex.y * 2) / 2;
      const section = sections.get(row) || { y: row, x: 0, z: 0 };
      section.x = Math.max(section.x, Math.abs(vertex.x));
      section.z = Math.max(section.z, Math.abs(vertex.z));
      sections.set(row, section);
    }
  });
  // Adjacent rows share the larger outline, covering faces between vertices.
  const rows = [...sections.values()].sort((a, b) => a.y - b.y);
  const boxes = rows.map((row, i) => {
    const next = rows[i + 1] || row;
    const x = Math.max(row.x, next.x),
      z = Math.max(row.z, next.z);
    return [-x, x].flatMap((px) =>
      [row.y, next.y + 0.5].flatMap((py) =>
        [-z, z].map((pz) => new T.Vector3(px, py, pz)),
      ),
    );
  });
  const transformed = Array.from({ length: 8 }, () => new T.Vector3());
  const edges = [
    [0, 1],
    [2, 3],
    [4, 5],
    [6, 7],
    [0, 2],
    [1, 3],
    [4, 6],
    [5, 7],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ];
  const matrix = new T.Matrix4();
  return (rotation, height) => {
    matrix.makeRotationFromEuler(rotation);
    matrix.setPosition(0, height, 0);
    let front = Infinity;
    // Include a small margin for the desk's impact shake and mesh rounding.
    const bottom = -4.4,
      top = 0.4;
    for (const box of boxes) {
      let minY = Infinity,
        maxY = -Infinity;
      for (let i = 0; i < 8; i++) {
        const p = transformed[i].copy(box[i]).applyMatrix4(matrix);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      }
      if (maxY < bottom || minY > top) continue;
      for (const p of transformed)
        if (p.y >= bottom && p.y <= top) front = Math.min(front, p.z);
      for (const [i, j] of edges) {
        const a = transformed[i],
          b = transformed[j];
        for (const y of [bottom, top]) {
          if ((a.y < y && b.y > y) || (b.y < y && a.y > y)) {
            const t = (y - a.y) / (b.y - a.y);
            front = Math.min(front, a.z + (b.z - a.z) * t);
          }
        }
      }
    }
    return front;
  };
}
