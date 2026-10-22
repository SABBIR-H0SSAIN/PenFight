import { gameConfig } from "../../../config/config.ts";
import { createFurnitureLibrary } from "../../furniture/scene/furniture.js";

/** Classroom architecture, background furniture, and lighting textures. */
export function createClassroomFeature(deps) {
  const {
    THREE: T,
    R,
    FLOOR,
    CEIL,
    rand,
    cvs,
    ctex,
    M,
    FONT,
    sceneRoot,
  } = deps;
  let furniture;
  const furnitureLibrary = () => (furniture ||= createFurnitureLibrary(deps));
  function tileTexture() {
    const c = cvs(512, 512),
      g = c.getContext("2d");
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        const dark = (i + j) % 2;
        g.fillStyle = dark ? "#a09b8e" : "#d6cdb7";
        g.fillRect(i * 128, j * 128, 128, 128);
        for (let k = 0; k < 160; k++) {
          g.fillStyle =
            "rgba(" +
            (dark ? "40,40,40" : "120,100,70") +
            "," +
            rand() * 0.12 +
            ")";
          g.fillRect(i * 128 + rand() * 128, j * 128 + rand() * 128, 2, 2);
        }
      }
    g.strokeStyle = "rgba(60,55,45,.8)";
    g.lineWidth = 3;
    for (let i = 0; i <= 4; i++) {
      g.beginPath();
      g.moveTo(i * 128, 0);
      g.lineTo(i * 128, 512);
      g.moveTo(0, i * 128);
      g.lineTo(512, i * 128);
      g.stroke();
    }
    return c;
  }
  function wallTexture() {
    const c = cvs(128, 512),
      g = c.getContext("2d");
    g.fillStyle = "#ece6d4";
    g.fillRect(0, 0, 128, 512);
    const gr = g.createLinearGradient(0, 300, 0, 512);
    gr.addColorStop(0, "#7f9578");
    gr.addColorStop(1, "#6d8467");
    g.fillStyle = gr;
    g.fillRect(0, 300, 128, 212);
    g.fillStyle = "#4e6049";
    g.fillRect(0, 296, 128, 6);
    for (let i = 0; i < 700; i++) {
      g.fillStyle = "rgba(0,0,0," + rand() * 0.05 + ")";
      g.fillRect(rand() * 128, rand() * 512, 2, 2);
    }
    return c;
  }
  function spriteTex() {
    const c = cvs(64, 64),
      g = c.getContext("2d"),
      r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, "rgba(255,255,255,1)");
    r.addColorStop(0.4, "rgba(255,255,255,.35)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
    return new T.CanvasTexture(c);
  }
  function envTexture() {
    const c = cvs(256, 128),
      g = c.getContext("2d"),
      gr = g.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, "#e8eef5");
    gr.addColorStop(0.45, "#cdbfa6");
    gr.addColorStop(0.5, "#9a8f7e");
    gr.addColorStop(1, "#6c6559");
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 128);
    g.fillStyle = "#fff6e0";
    for (let i = 0; i < 4; i++) g.fillRect(20 + i * 30, 30, 18, 38);
    g.fillStyle = "#ffffff";
    g.fillRect(150, 6, 70, 8);
    g.fillRect(150, 22, 70, 6);
    const t = new T.CanvasTexture(c);
    t.mapping = T.EquirectangularReflectionMapping;
    t.encoding = T.sRGBEncoding;
    return t;
  }
  function room() {
    const sc = sceneRoot,
      wallMat = M(0xffffff, 0.95, 0, { map: ctex(wallTexture(), [3, 1]) });
    const floorTex = ctex(tileTexture(), [7, 6]);
    floorTex.anisotropy = Math.min(
      gameConfig.graphics.maxAnisotropy,
      Math.max(1, R.renderer?.capabilities?.getMaxAnisotropy?.() || 1),
    );
    const floorMaterial = M(0xffffff, 1, 0, {
      map: floorTex,
      envMapIntensity: 0,
    });
    floorMaterial.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <lights_physical_fragment>",
        "#include <lights_physical_fragment>\nmaterial.specularColor = vec3(0.0);",
      );
    };
    floorMaterial.customProgramCacheKey = () => "classroom-matte-floor";
    const floor = new T.Mesh(new T.PlaneGeometry(600, 440), floorMaterial);
    floor.name = "classroom-floor";
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = FLOOR;
    floor.position.z = 40;
    floor.receiveShadow = true;
    sc.add(floor);
    const ceil = new T.Mesh(new T.PlaneGeometry(600, 440), M(0xeeeae0, 1));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = CEIL;
    ceil.position.z = 40;
    sc.add(ceil);
    const hh = CEIL - FLOOR,
      cy = (CEIL + FLOOR) / 2;
    const wall = (w, x, z, ry, rep) => {
      const m = wallMat.clone();
      m.map = wallMat.map.clone();
      m.map.needsUpdate = true;
      m.map.repeat.set(rep, 1);
      const p = new T.Mesh(new T.PlaneGeometry(w, hh), m);
      p.position.set(x, cy, z);
      p.rotation.y = ry;
      p.receiveShadow = true;
      sc.add(p);
      return p;
    };
    wall(600, 0, -180, 0, 3);
    wall(600, 0, 260, Math.PI, 3);
    wall(440, -300, 40, Math.PI / 2, 2.2);
    wall(440, 300, 40, -Math.PI / 2, 2.2);
    // skirting
    [
      [0, -179, 600, 0],
      [0, 259, 600, 0],
    ].forEach((a) => {
      const b = new T.Mesh(new T.BoxGeometry(a[2], 8, 2), M(0x4e6049, 0.8));
      b.position.set(a[0], FLOOR + 4, a[1]);
      sc.add(b);
    });
    // Windows remain visible without projected light patterns or reflective overlays.
    const glass = new T.MeshBasicMaterial({ color: 0xdff0ff }),
      frameM = M(0xf0efe8, 0.6);
    R.sunPatches = [];
    for (let i = 0; i < 3; i++) {
      const z = -150 + i * 150,
        grp = new T.Group();
      grp.name = "classroom-window";
      grp.position.set(-299, 70, z);
      const gl = new T.Mesh(new T.PlaneGeometry(100, 120), glass);
      gl.rotation.y = Math.PI / 2;
      grp.add(gl);
      const fr = (w, h, y, zz) => {
        const b = new T.Mesh(new T.BoxGeometry(2.5, h, w), frameM);
        b.position.set(1, y, zz);
        b.castShadow = false;
        grp.add(b);
      };
      fr(104, 4, 60, 0);
      fr(104, 4, -60, 0);
      fr(4, 124, 0, 50);
      fr(4, 124, 0, -50);
      fr(4, 120, 0, 0);
      fr(100, 3, 0, 0);
      const cur = curtain();
      cur.position.set(2, 8, -62);
      grp.add(cur);
      const cur2 = curtain();
      cur2.position.set(2, 8, 62);
      cur2.scale.z = -1;
      grp.add(cur2);
      sc.add(grp);
    }
    R.shafts = [];
    // ceiling: tube lights, fans
    for (let i = 0; i < 6; i++) {
      const x = i % 2 ? 120 : -120,
        z = -150 + Math.floor(i / 2) * 150;
      const tb = new T.Mesh(
        new T.BoxGeometry(120, 3, 8),
        new T.MeshBasicMaterial({ color: 0xffffff }),
      );
      tb.position.set(x, CEIL - 3, z);
      const hs = new T.Mesh(new T.BoxGeometry(124, 2, 12), M(0xcfcfc8, 0.6));
      hs.position.set(x, CEIL - 1.2, z);
      sc.add(tb, hs);
    }
    R.fans = [
      [-60, -40],
      [60, -40],
      [0, 120],
    ].map((p) => {
      const f = new T.Group();
      f.position.set(p[0] * 1.6, CEIL - 22, p[1]);
      const rod = new T.Mesh(
        new T.CylinderGeometry(0.8, 0.8, 22, 8),
        M(0x555555, 0.5, 0.6),
      );
      rod.position.y = 11;
      f.add(rod);
      const hub = new T.Mesh(
        new T.CylinderGeometry(6, 6, 5, 16),
        M(0x9a9a9a, 0.4, 0.6),
      );
      f.add(hub);
      const bl = new T.Group();
      for (let k = 0; k < 3; k++) {
        const b = new T.Mesh(new T.BoxGeometry(60, 0.8, 9), M(0xdcd5c4, 0.7));
        b.position.x = 34;
        b.castShadow = false;
        const h = new T.Group();
        h.rotation.y = (k * Math.PI * 2) / 3;
        h.add(b);
        bl.add(h);
      }
      f.add(bl);
      f.userData.bl = bl;
      sc.add(f);
      return f;
    });
    // Front wall scorekeeper, chalkboard, posters and clock.
    const bg = new T.Group();
    bg.name = "wall-scoreboard";
    bg.position.set(0, 52, -178);
    const frame = new T.Mesh(new T.BoxGeometry(228, 118, 3), M(0x7a5230, 0.7));
    bg.add(frame);
    R.boardCanvas = cvs(1024, 512);
    R.boardTex = ctex(R.boardCanvas);
    const bd = new T.Mesh(
      new T.PlaneGeometry(220, 110),
      new T.MeshStandardMaterial({
        map: R.boardTex,
        roughness: 0.95,
        emissive: 0x0b1410,
        emissiveMap: R.boardTex,
        emissiveIntensity: 0.35,
      }),
    );
    bd.position.z = 1.8;
    bg.add(bd);
    const tray = new T.Mesh(new T.BoxGeometry(228, 3, 7), M(0x7a5230, 0.7));
    tray.position.set(0, -60, 3);
    bg.add(tray);
    for (let i = 0; i < 3; i++) {
      const ch = new T.Mesh(
        new T.CylinderGeometry(0.8, 0.8, 5, 8),
        M(0xf3f3f0, 0.9),
      );
      ch.rotation.z = Math.PI / 2;
      ch.position.set(-30 + i * 14, -57, 4);
      bg.add(ch);
    }
    sc.add(bg);
    poster(-135, 50, -178.5, 0, [
      "A*",
      "f(n) = g(n) + h(n)",
      "cost so far",
      "+ estimate to go",
    ]);
    poster(150, 62, -178.5, 0, ["Minimax", "MAX  ▲", "MIN  ▼", "MAX  ▲"]);
    poster(-299.2, 40, 150, Math.PI / 2, [
      "MCTS",
      "Select",
      "Expand",
      "Simulate",
      "Backpropagate",
    ]);
    R.clock = (function () {
      const c = cvs(256, 256),
        t = ctex(c);
      const m = new T.Mesh(
        new T.CircleGeometry(16, 40),
        new T.MeshBasicMaterial({ map: t }),
      );
      m.position.set(105, 130, -178.2);
      sc.add(m);
      return { c, t };
    })();
    notice(299.2, 55, -120);
    door(299, 90);
  }
  function curtain() {
    const geo = new T.PlaneGeometry(26, 135, 14, 1),
      p = geo.attributes.position;
    for (let i = 0; i < p.count; i++)
      p.setZ(i, Math.sin(p.getX(i) * 0.9) * 2.4);
    geo.computeVertexNormals();
    const m = new T.Mesh(geo, M(0x9a3b3b, 0.95, 0, { side: T.DoubleSide }));
    m.rotation.y = Math.PI / 2;
    m.castShadow = false;
    return m;
  }
  function poster(x, y, z, ry, lines) {
    const c = cvs(256, 320),
      g = c.getContext("2d");
    g.fillStyle = "#f6f1e2";
    g.fillRect(0, 0, 256, 320);
    g.fillStyle = "#233a66";
    g.fillRect(0, 0, 256, 70);
    g.fillStyle = "#fff";
    g.font = "bold 44px " + FONT;
    g.textAlign = "center";
    g.fillText(lines[0], 128, 52);
    g.fillStyle = "#222";
    g.font = "26px " + FONT;
    lines.slice(1).forEach((l, i) => {
      g.fillText(l, 128, 120 + i * 48);
      g.strokeStyle = "#233a66";
      g.lineWidth = 2;
      g.strokeRect(24, 94 + i * 48, 208, 38);
    });
    const m = new T.Mesh(
      new T.PlaneGeometry(40, 50),
      M(0xffffff, 0.9, 0, { map: ctex(c) }),
    );
    m.position.set(x, y, z);
    m.rotation.y = ry;
    sceneRoot.add(m);
  }
  function notice(x, y, z) {
    const g = new T.Group();
    g.position.set(x, y, z);
    g.rotation.y = -Math.PI / 2;
    const fr = new T.Mesh(new T.BoxGeometry(90, 60, 2), M(0x6b4a2b, 0.7));
    g.add(fr);
    const c = cvs(256, 160),
      x2 = c.getContext("2d");
    x2.fillStyle = "#c69a62";
    x2.fillRect(0, 0, 256, 160);
    for (let i = 0; i < 900; i++) {
      x2.fillStyle = "rgba(90,60,30," + rand() * 0.25 + ")";
      x2.fillRect(rand() * 256, rand() * 160, 2, 2);
    }
    [
      ["#fff7a8", 14, 14],
      ["#bfe4ff", 100, 22],
      ["#ffd1dc", 168, 12],
      ["#d9ffd0", 40, 84],
      ["#fff", 130, 88],
    ].forEach((n) => {
      x2.fillStyle = n[0];
      x2.fillRect(n[1], n[2], 62, 52);
      x2.fillStyle = "#c33";
      x2.beginPath();
      x2.arc(n[1] + 31, n[2] + 5, 4, 0, 6.28);
      x2.fill();
      x2.fillStyle = "#334";
      x2.font = "14px " + FONT;
      x2.fillText("Exam", n[1] + 8, n[2] + 24);
      x2.fillText("Fri 10:00", n[1] + 8, n[2] + 42);
    });
    const bd = new T.Mesh(
      new T.PlaneGeometry(84, 54),
      M(0xffffff, 1, 0, { map: ctex(c) }),
    );
    bd.position.z = 1.2;
    g.add(bd);
    sceneRoot.add(g);
  }
  function door(x, z) {
    const g = new T.Group();
    g.position.set(x - 1, FLOOR + 90, z);
    const fr = new T.Mesh(new T.BoxGeometry(3, 184, 100), M(0x4b3220, 0.7));
    g.add(fr);
    const dr = new T.Mesh(new T.BoxGeometry(3.2, 176, 90), M(0x8a5f38, 0.65));
    dr.position.x = -0.6;
    g.add(dr);
    const gl = new T.Mesh(
      new T.BoxGeometry(3.4, 40, 30),
      new T.MeshBasicMaterial({ color: 0xb9d4e2 }),
    );
    gl.position.set(-0.8, 50, 0);
    g.add(gl);
    const kn = new T.Mesh(
      new T.SphereGeometry(3, 12, 8),
      M(0xc8b46a, 0.3, 0.9),
    );
    kn.position.set(-4, -5, 34);
    g.add(kn);
    sceneRoot.add(g);
  }
  function deskLOD(x, z, ry) {
    const furniture = furnitureLibrary();
    const lod = new T.LOD(),
      hi = new T.Group(),
      lo = new T.Group();
    lod.name = "classroom-desk-set";
    // Small differences in finish and placement keep the rows from looking cloned.
    const variation = ((x > 0 ? 3 : 0) + Math.round((z + 110) / 85)) % 6;
    const tints = [0xffffff, 0xf7f1e8, 0xeee9df, 0xf3eadb, 0xe9e2d7, 0xf8f4ed];
    const tint = tints[variation];
    const chairX = (rand() - 0.5) * 3,
      chairAngle = (rand() - 0.5) * 0.07;
    for (const [group, detail] of [
      [hi, true],
      [lo, false],
    ]) {
      group.add(furniture.desk(detail, tint, variation));
      const chair = furniture.chair(
        detail,
        tints[(variation + 2) % 6],
        variation + 3,
      );
      chair.position.set(chairX, 0, 40);
      chair.rotation.y = chairAngle;
      group.add(chair);
    }
    const book = new T.Group();
    const cover = M(
      [0x485d67, 0x794b43, 0x586348][Math.floor(rand() * 3)],
      0.9,
    );
    const pages = new T.Mesh(
      new T.BoxGeometry(13.5, 1.3, 18.5),
      M(0xc4baa5, 1),
    );
    pages.position.y = 0.9;
    book.add(pages);
    const coverGeometry = new T.BoxGeometry(14, 0.25, 19);
    for (const y of [0.15, 1.7]) {
      const m = new T.Mesh(coverGeometry, cover);
      m.position.y = y;
      book.add(m);
    }
    book.position.set(-12 + rand() * 14, 0.05, -5 + rand() * 8);
    book.rotation.y = rand() - 0.5;
    hi.add(book);
    lod.addLevel(hi, 0);
    lod.addLevel(lo, 330);
    lod.position.set(x, 0, z);
    lod.rotation.y = ry;
    return lod;
  }
  function bag(x, z, col) {
    const g = new T.Group();
    const b = new T.Mesh(new T.BoxGeometry(30, 36, 14), M(col, 0.85));
    b.position.y = 18;
    g.add(b);
    const pk = new T.Mesh(new T.BoxGeometry(24, 14, 4), M(col, 0.9));
    pk.position.set(0, 12, 8.5);
    g.add(pk);
    const st = new T.Mesh(new T.BoxGeometry(3, 26, 1), M(0x222222, 0.9));
    st.position.set(8, 22, -7.5);
    g.add(st);
    g.position.set(x, FLOOR, z);
    g.rotation.y = rand() * 3;
    g.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
    sceneRoot.add(g);
  }
  function plant(x, z) {
    const g = new T.Group();
    const pot = new T.Mesh(
      new T.CylinderGeometry(12, 9, 20, 16),
      M(0xb25b3a, 0.8),
    );
    pot.position.y = 10;
    g.add(pot);
    const soil = new T.Mesh(
      new T.CylinderGeometry(11, 11, 2, 16),
      M(0x3a2a1c, 1),
    );
    soil.position.y = 20;
    g.add(soil);
    for (let i = 0; i < 9; i++) {
      const l = new T.Mesh(
        new T.SphereGeometry(7, 10, 8),
        M(0x2f7a3a + Math.floor(rand() * 0x101010), 0.7),
      );
      l.scale.set(0.45, 1.8, 0.2);
      const a = (i / 9) * 6.28;
      l.position.set(Math.cos(a) * 7, 36 + rand() * 12, Math.sin(a) * 7);
      l.rotation.set(Math.sin(a) * 0.5, a, -Math.cos(a) * 0.5);
      g.add(l);
    }
    g.position.set(x, FLOOR, z);
    g.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
    sceneRoot.add(g);
  }
  function props() {
    const sc = sceneRoot;
    for (let col = 0; col < 2; col++)
      for (let row = 0; row < 5; row++) {
        const side = col ? 1 : -1;
        sc.add(
          deskLOD(
            side * 200,
            -110 + row * 85 + (side > 0 ? 20 : 0),
            side > 0 ? Math.PI : 0,
          ),
        );
      }
    sc.add(deskLOD(-120, 200, 0));
    sc.add(deskLOD(120, 200, 0));
    bag(-250, -120, 0x2f5d8a);
    bag(-165, -30, 0x8a2f3a);
    bag(250, -170, 0x3b7a4a);
    bag(168, 70, 0xc29b2f);
    bag(-270, 180, 0x5a3b8a);
    plant(-270, -160);
    plant(270, -160);
    plant(-270, 40);
    // teacher table, books, globe
    const tt = new T.Group();
    tt.position.set(-150, FLOOR, -145);
    const furniture = furnitureLibrary();
    const tp = new T.Mesh(furniture.panel(110, 50, 4, 1.6, false, 0, "bench"), [
      furniture.benchWood(110, 50),
      furniture.edge(),
    ]);
    tp.position.y = 72;
    tt.add(tp);
    const side = (x) => {
      const s = new T.Mesh(
        new T.BoxGeometry(4, 70, 48),
        furniture.wood(0xcfc0aa),
      );
      s.position.set(x, 35, 0);
      tt.add(s);
    };
    side(-50);
    side(50);
    const bk = new T.Mesh(
      new T.BoxGeometry(60, 66, 3),
      furniture.wood(0xb7a38a),
    );
    bk.position.set(0, 35, -22);
    tt.add(bk);
    for (let i = 0; i < 5; i++) {
      const b = new T.Mesh(
        new T.BoxGeometry(24 - i, 3, 17),
        M([0x9a3b3b, 0x2f6f9a, 0xc29b2f, 0x4a8a4a, 0x6a4a9a][i], 0.8),
      );
      b.position.set(-30, 76 + i * 3, 4);
      b.rotation.y = rand() * 0.3;
      tt.add(b);
    }
    const gl = globe();
    gl.position.set(25, 78, 0);
    tt.add(gl);
    R.globe = gl.userData.ball;
    tt.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    sc.add(tt);
  }
  function globe() {
    const g = new T.Group(),
      c = cvs(256, 128),
      x = c.getContext("2d");
    x.fillStyle = "#3d7bb3";
    x.fillRect(0, 0, 256, 128);
    x.fillStyle = "#7aa357";
    for (let i = 0; i < 14; i++) {
      x.beginPath();
      x.ellipse(
        rand() * 256,
        20 + rand() * 90,
        12 + rand() * 24,
        8 + rand() * 14,
        rand() * 3,
        0,
        6.28,
      );
      x.fill();
    }
    x.strokeStyle = "rgba(255,255,255,.35)";
    for (let i = 0; i < 8; i++) {
      x.beginPath();
      x.moveTo(i * 32, 0);
      x.lineTo(i * 32, 128);
      x.stroke();
    }
    const ball = new T.Mesh(
      new T.SphereGeometry(10, 24, 16),
      M(0xffffff, 0.45, 0.05, { map: ctex(c) }),
    );
    ball.rotation.z = 0.4;
    ball.position.y = 10;
    g.add(ball);
    const base = new T.Mesh(
      new T.CylinderGeometry(6, 7, 2, 16),
      M(0x3a2a1c, 0.6),
    );
    g.add(base);
    g.userData.ball = ball;
    return g;
  }
  return { room, props, envTexture, spriteTex };
}
