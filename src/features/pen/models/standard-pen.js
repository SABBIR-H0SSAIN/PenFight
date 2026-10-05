/** Builds the StandardPen mesh into the supplied group. */
export function buildStandardPen({
  T,
  M,
  S,
  L,
  r,
  g,
  addBand,
  tint,
  type,
  bodyM,
}) {
  const body = new T.Mesh(new T.CylinderGeometry(r, r, L * 0.62, 20), bodyM);
  body.rotation.z = Math.PI / 2;
  body.position.x = -L * 0.02;
  g.add(body);
  const cap = new T.Mesh(
    new T.CylinderGeometry(r * 1.06, r * 1.06, L * 0.3, 20),
    M(S.cap, 0.4, type === "premium" ? 0.9 : 0.1),
  );
  cap.rotation.z = Math.PI / 2;
  cap.position.x = -L * 0.34;
  g.add(cap);
  const grip = new T.Mesh(
    new T.CylinderGeometry(r * 1.02, r * 0.8, L * 0.16, 20),
    M(S.grip, 0.55, type === "heavy" || type === "premium" ? 0.9 : 0.0),
  );
  grip.rotation.z = -Math.PI / 2;
  grip.position.x = L * 0.34;
  g.add(grip);
  const tip = new T.Mesh(
    new T.ConeGeometry(r * 0.78, L * 0.12, 20),
    M(0xcfd2d6, 0.25, 0.9),
  );
  tip.rotation.z = -Math.PI / 2;
  tip.position.x = L * 0.48;
  g.add(tip);
  const clip = new T.Mesh(
    new T.BoxGeometry(L * 0.2, r * 0.22, r * 0.5),
    M(0xd6d8dc, 0.25, 0.95),
  );
  clip.position.set(-L * 0.36, r * 1.05, 0);
  g.add(clip);
  if (type === "heavy" || type === "premium") {
    const ring = new T.Mesh(
      new T.CylinderGeometry(r * 1.1, r * 1.1, 0.5, 20),
      M(0xd9b24c, 0.25, 1),
    );
    ring.rotation.z = Math.PI / 2;
    ring.position.x = -L * 0.19;
    g.add(ring);
  }
  if (addBand) {
    const band = new T.Mesh(
      new T.CylinderGeometry(r * 1.08, r * 1.08, 1.2, 20),
      M(tint, 0.5),
    );
    band.rotation.z = Math.PI / 2;
    band.position.x = L * 0.2;
    g.add(band);
  }
}
