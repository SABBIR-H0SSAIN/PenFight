/** Builds the MatadorSmoothy mesh into the supplied group. */
export function buildMatadorSmoothy({
  T,
  M,
  L,
  r,
  g,
  chosen,
  addBand,
  tint,
  addLabel,
}) {
  const softM = new T.MeshStandardMaterial({
    color: chosen,
    roughness: 0.82,
    metalness: 0.01,
    envMapIntensity: 0.42,
  });
  const body = new T.Mesh(
    new T.CylinderGeometry(r * 0.95, r * 0.95, L * 0.67, 28),
    softM,
  );
  body.rotation.z = Math.PI / 2;
  body.position.x = L * 0.085;
  g.add(body);
  // Reference-correct Smoothy nib: the pastel plastic barrel narrows into a
  // single smooth injection-moulded taper, then a SHORT metal refill point.
  // In this axial lathe, increasing Y becomes increasing world +X.
  // The first profile radius exactly matches the barrel to avoid a seam
  // or the previous oversized metal cone poking through the coloured nose.
  const noseProfile = [
    [0.0, 0.95],
    [0.012, 0.95],
    [0.021, 0.915],
    [0.035, 0.8],
    [0.048, 0.64],
    [0.06, 0.465],
    [0.07, 0.305],
    [0.077, 0.22],
    [0.079, 0.215],
  ];
  const noseGeo = new T.LatheGeometry(
    noseProfile.map((v) => new T.Vector2(r * v[1], L * v[0])),
    32,
  );
  const plasticNose = new T.Mesh(noseGeo, softM);
  plasticNose.rotation.z = -Math.PI / 2;
  plasticNose.position.x = L * 0.407;
  g.add(plasticNose);
  // Metal writing socket is only ~0.55 cm and starts inside the taper.
  // It is a small steel point, not a full-sized chrome cone.
  const nibProfile = [
    [0.0, 0.178],
    [0.006, 0.174],
    [0.014, 0.148],
    [0.022, 0.112],
    [0.029, 0.083],
  ];
  const nibGeo = new T.LatheGeometry(
    nibProfile.map((v) => new T.Vector2(r * v[1], L * v[0])),
    20,
  );
  const nib = new T.Mesh(nibGeo, M(0x42474b, 0.25, 0.86));
  nib.rotation.z = -Math.PI / 2;
  nib.position.x = L * 0.481;
  g.add(nib);
  const nibRim = new T.Mesh(
    new T.TorusGeometry(r * 0.176, r * 0.022, 7, 16),
    M(0xc3c9cd, 0.24, 0.86),
  );
  nibRim.rotation.y = Math.PI / 2;
  nibRim.position.x = L * 0.482;
  g.add(nibRim);
  const ball = new T.Mesh(
    new T.SphereGeometry(r * 0.09, 12, 10),
    M(0xc5cbce, 0.21, 0.91),
  );
  ball.position.x = L * 0.51;
  g.add(ball);
  const cap = new T.Mesh(
    new T.CylinderGeometry(r * 1.02, r * 1.02, L * 0.255, 24),
    softM,
  );
  cap.rotation.z = Math.PI / 2;
  cap.position.x = -L * 0.305;
  g.add(cap);
  const capEnd = new T.Mesh(new T.SphereGeometry(r * 1.02, 18, 14), softM);
  capEnd.scale.set(0.84, 1, 1);
  capEnd.position.x = -L * 0.432;
  g.add(capEnd);
  const capPlug = new T.Mesh(
    new T.SphereGeometry(r * 0.34, 16, 12),
    M(0xf3f3f1, 0.22, 0.0),
  );
  capPlug.scale.set(0.7, 0.82, 0.82);
  capPlug.position.x = -L * 0.458;
  g.add(capPlug);
  const seam = new T.Mesh(
    new T.CylinderGeometry(r * 0.98, r * 0.98, L * 0.012, 16),
    M(0xd1c5c8, 0.84, 0.0),
  );
  seam.rotation.z = Math.PI / 2;
  seam.position.x = -L * 0.178;
  g.add(seam);
  const clipStem = new T.Mesh(
    new T.BoxGeometry(L * 0.115, r * 0.11, r * 0.5),
    softM,
  );
  clipStem.position.set(-L * 0.32, r * 0.94, 0);
  clipStem.rotation.z = -0.02;
  g.add(clipStem);
  const clipArm = new T.Mesh(
    new T.BoxGeometry(L * 0.17, r * 0.12, r * 0.42),
    softM,
  );
  clipArm.position.set(-L * 0.38, r * 1.17, 0);
  clipArm.rotation.z = -0.08;
  g.add(clipArm);
  const clipLip = new T.Mesh(
    new T.BoxGeometry(L * 0.055, r * 0.1, r * 0.32),
    softM,
  );
  clipLip.position.set(-L * 0.462, r * 1.03, 0);
  clipLip.rotation.z = 0.22;
  g.add(clipLip);
  addLabel(
    g,
    "MATADOR smoothy",
    L * 0.02,
    r * 0.98,
    0,
    L * 0.32,
    r * 1.72,
    chosen === 0x151515 ? "#f2f2f2" : "#161616",
  );
  if (addBand) {
    const band = new T.Mesh(
      new T.CylinderGeometry(r * 1.03, r * 1.03, 1.0, 16),
      M(tint, 0.5),
    );
    band.rotation.z = Math.PI / 2;
    band.position.x = L * 0.21;
    g.add(band);
  }
}
