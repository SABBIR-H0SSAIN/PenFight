/** The playable desk and its procedural wood surface. */
export function createTableFeature(deps) {
  const {
    THREE: T,
    R,
    W,
    H,
    rand,
    cvs,
    ctex,
    M,
    FONT,
    sceneRoot,
    surface = "oak",
  } = deps;
  function woodTexture(w, h, carve, surface = "oak") {
    const c = cvs(w, h),
      g = c.getContext("2d");
    const gr = g.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, "#b27839");
    gr.addColorStop(0.5, "#c58b48");
    gr.addColorStop(1, "#b57b3a");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < w / 2.2; i++) {
      // grain
      const x = rand() * w,
        a = 0.04 + rand() * 0.1;
      g.strokeStyle =
        rand() < 0.6
          ? "rgba(70,36,10," + a + ")"
          : "rgba(255,220,160," + a * 0.8 + ")";
      g.lineWidth = 0.6 + rand() * 1.6;
      g.beginPath();
      g.moveTo(x, 0);
      for (let y = 0; y <= h; y += 40)
        g.lineTo(x + Math.sin(y * 0.012 + i) * 3 + (rand() - 0.5) * 1.2, y);
      g.stroke();
    }
    g.strokeStyle = "rgba(40,20,5,.45)";
    g.lineWidth = 2;
    [w / 3, (2 * w) / 3].forEach((x) => {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, h);
      g.stroke();
    }); // plank seams
    for (let i = 0; i < 14; i++) {
      const x = rand() * w,
        y = rand() * h,
        r = 40 + rand() * 120,
        rg = g.createRadialGradient(x, y, 0, x, y, r);
      const d = rand() < 0.5;
      rg.addColorStop(0, d ? "rgba(80,40,10,.16)" : "rgba(255,230,180,.14)");
      rg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = rg;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < 260; i++) {
      // scratches
      const x = rand() * w,
        y = rand() * h,
        a = rand() < 0.75 ? Math.PI / 2 + (rand() - 0.5) * 0.7 : rand() * 6.28,
        l = 20 + rand() * 150;
      g.strokeStyle =
        rand() < 0.65
          ? "rgba(255,238,205," + (0.18 + rand() * 0.3) + ")"
          : "rgba(50,25,8," + (0.2 + rand() * 0.3) + ")";
      g.lineWidth = 0.7 + rand() * 1.1;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
    for (let i = 0; i < 9; i++) {
      // pen marks / doodles
      const x = 40 + rand() * (w - 80),
        y = 40 + rand() * (h - 80);
      g.strokeStyle =
        rand() < 0.5 ? "rgba(25,45,150,.55)" : "rgba(20,20,26,.5)";
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(x, y);
      for (let k = 0; k < 7; k++)
        g.lineTo(x + (rand() - 0.5) * 36, y + (rand() - 0.5) * 36);
      g.stroke();
    }
    g.fillStyle = "rgba(30,30,120,.5)";
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.arc(rand() * w, rand() * h, 1.5 + rand() * 2.5, 0, 6.28);
      g.fill();
    }
    g.strokeStyle = "rgba(70,35,12,.28)";
    g.lineWidth = 3;
    g.beginPath();
    g.arc(w * 0.62, h * 0.2, 26, 0, 6.28);
    g.stroke(); // cup ring
    for (const tx of carve || []) {
      // carved writing: dark groove + light lip
      g.save();
      g.translate(tx.x * w, tx.y * h);
      g.rotate(tx.r || 0);
      g.font = (tx.s || 34) + "px " + FONT;
      g.textAlign = "center";
      g.fillStyle = "rgba(255,230,190,.5)";
      g.fillText(tx.t, 1.2, 1.4);
      g.fillStyle = "rgba(48,24,6,.78)";
      g.fillText(tx.t, 0, 0);
      g.restore();
    }
    g.strokeStyle = "rgba(60,30,8,.6)";
    g.lineWidth = 2;
    g.beginPath(); // tally marks
    for (let i = 0; i < 4; i++) {
      g.moveTo(w * 0.14 + i * 8, h * 0.14);
      g.lineTo(w * 0.14 + i * 8, h * 0.14 + 28);
    }
    g.moveTo(w * 0.14 - 6, h * 0.14 + 22);
    g.lineTo(w * 0.14 + 32, h * 0.14 + 6);
    g.stroke();
    const eg = (x0, y0, x1, y1) => {
      const l = g.createLinearGradient(x0, y0, x1, y1);
      l.addColorStop(0, "rgba(60,30,8,.55)");
      l.addColorStop(1, "rgba(60,30,8,0)");
      g.fillStyle = l;
      return l;
    };
    g.fillStyle = eg(0, 0, 22, 0);
    g.fillRect(0, 0, 22, h);
    g.fillStyle = eg(w, 0, w - 22, 0);
    g.fillRect(w - 22, 0, 22, h);
    g.fillStyle = eg(0, 0, 0, 22);
    g.fillRect(0, 0, w, 22);
    g.fillStyle = eg(0, h, 0, h - 22);
    g.fillRect(0, h - 22, w, 22);
    for (let i = 0; i < 90; i++) {
      const side = Math.floor(rand() * 4),
        p = rand();
      const x = side < 2 ? p * w : side === 2 ? rand() * 12 : w - rand() * 12,
        y = side < 2 ? (side === 0 ? rand() * 12 : h - rand() * 12) : p * h;
      g.fillStyle = rand() < 0.5 ? "rgba(235,205,150,.7)" : "rgba(40,20,5,.65)";
      g.fillRect(x, y, 2 + rand() * 4, 2 + rand() * 3);
    } // edge damage
    if (surface !== "oak") {
      g.save();
      g.globalCompositeOperation = "color";
      g.fillStyle = surface === "maple" ? "#d9c89f" : "#60452f";
      g.fillRect(0, 0, w, h);
      g.restore();
    }
    return c;
  }
  function desk() {
    const sc = sceneRoot,
      w = R.quality === "low" ? 512 : 1024,
      h = Math.round((w * 100) / 60);
    const carve = [
      { t: "AJ", x: 0.8, y: 0.88, r: Math.PI, s: 54 },
      { t: "Raju", x: 0.18, y: 0.78, r: 0.1, s: 36 },
      { t: "LAST BENCH", x: 0.9, y: 0.4, r: Math.PI / 2, s: 40 },
      { t: "gdu", x: 0.17, y: 0.52, r: -Math.PI / 2, s: 28 },
      { t: "♥", x: 0.5, y: 0.12, r: 0.2, s: 44 },
      { t: "↑", x: 0.72, y: 0.58, r: 0.2, s: 36 },
      { t: "PF ’22", x: 0.3, y: 0.3, r: -0.15, s: 30 },
    ];
    const tc = woodTexture(w, h, carve, surface),
      map = ctex(tc),
      edgeColor = { oak: 0x8e5f2f, maple: 0xa38a5e, walnut: 0x513722 }[surface],
      side = M(edgeColor || 0x8e5f2f, 0.8);
    const topMat = new T.MeshStandardMaterial({
      map,
      bumpMap: map,
      bumpScale: 1.2,
      roughness: 0.62,
      metalness: 0,
      envMapIntensity: 0.55,
    });
    const top = new T.Mesh(new T.BoxGeometry(W, 4, H), [
      side,
      side,
      topMat,
      side,
      side,
      side,
    ]);
    top.position.y = -2;
    top.castShadow = true;
    top.receiveShadow = true;
    sc.add(top);
    R.deskMesh = top;
    const metal = M(0x2d3036, 0.35, 0.75);
    [
      [-27, -46],
      [27, -46],
      [-27, 46],
      [27, 46],
    ].forEach((p) => {
      const l = new T.Mesh(new T.CylinderGeometry(2.2, 2.2, 71, 12), metal);
      l.position.set(p[0], -4 - 35.5, p[1]);
      l.castShadow = true;
      sc.add(l);
    });
    const rail = (x) => {
      const b = new T.Mesh(new T.BoxGeometry(3, 3, 92), metal);
      b.position.set(x, -9, 0);
      sc.add(b);
    };
    rail(-27);
    rail(27);
    [-46, 46].forEach((z) => {
      const b = new T.Mesh(new T.BoxGeometry(54, 3, 3), metal);
      b.position.set(0, -9, z);
      sc.add(b);
    });
    R.deskWood = tc;
  }
  return { desk };
}
