/* Three.js scene coordinator. Feature geometry and character behavior live in src/features. */
import * as THREE from "three";
import { disposeObjectTree } from "./dispose.js";

export function createWorld(PF) {
  const T = THREE,
    W = PF.TABLE.w,
    H = PF.TABLE.h,
    FLOOR = -75,
    CEIL = 225;
  const R = {};
  let rand = (function () {
    let s = 7;
    return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  })();
  const UP = new T.Vector3(0, 1, 0);
  const cvs = (w, h) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  };
  function ctex(c, rep, srgb) {
    const t = new T.CanvasTexture(c);
    if (srgb !== false) t.encoding = T.sRGBEncoding;
    t.anisotropy = 8;
    if (rep) {
      t.wrapS = t.wrapT = T.RepeatWrapping;
      t.repeat.set(rep[0], rep[1]);
    }
    return t;
  }
  const M = (c, r, m, extra) =>
    new T.MeshStandardMaterial(
      Object.assign(
        { color: c, roughness: r == null ? 0.8 : r, metalness: m || 0 },
        extra || {},
      ),
    );
  const FONT =
    "'Patrick Hand','Comic Sans MS','Segoe Print','Trebuchet MS',sans-serif";

  /* ------------------------------------------------------------ helpers */
  function place(mesh, a, b) {
    const d = b.clone().sub(a),
      len = d.length();
    mesh.position.copy(a).addScaledVector(d, 0.5);
    if (len > 1e-5)
      mesh.quaternion.setFromUnitVectors(UP, d.multiplyScalar(1 / len));
    mesh.scale.set(1, len, 1);
  }
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  R.deps = {
    THREE: T,
    PF,
    R,
    W,
    H,
    FLOOR,
    CEIL,
    rand,
    UP,
    cvs,
    ctex,
    M,
    FONT,
    place,
    ease,
  };
  /* -------------------------------------------------------------- init */
  R.init = function (canvas, q) {
    R.pens = [];
    R.students = [];
    R.quality = q || "high";
    const r = new T.WebGLRenderer({
      canvas,
      antialias: R.quality !== "low",
      powerPreference: "high-performance",
    });
    r.outputEncoding = T.sRGBEncoding;
    r.toneMapping = T.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true;
    r.shadowMap.type = T.PCFSoftShadowMap;
    R.renderer = r;
    const sc = new T.Scene();
    sc.background = new T.Color(0x20231f);
    sc.fog = new T.Fog(0x2a2c27, 520, 1100);
    R.scene = sc;
    R.camera = new T.PerspectiveCamera(42, 1, 1, 1500);
    lights();
    R.initialized = true;
    return R;
  };
  R.complete = function () {
    particles();
    aimArrow();
    trails();
    drawBoard();
    R.setQuality(R.quality);
    return R;
  };
  R.setQuality = function (q) {
    R.quality = q;
    const r = R.renderer,
      ms = q === "low" ? 512 : q === "medium" ? 1024 : 2048;
    r.setPixelRatio(
      Math.min(
        window.devicePixelRatio || 1,
        q === "low" ? 1 : q === "medium" ? 1.5 : 2,
      ),
    );
    if (R.sun) {
      R.sun.castShadow = q !== "low";
      R.sun.shadow.mapSize.set(ms, ms);
      if (R.sun.shadow.map) {
        R.sun.shadow.map.dispose();
        R.sun.shadow.map = null;
      }
    }
    if (R.dust) R.dust.visible = q !== "low";
    r.shadowMap.needsUpdate = true;
  };

  function lights() {
    const sc = R.scene,
      hemi = new T.HemisphereLight(0xdfeaff, 0x776b5e, 0.48);
    sc.add(hemi);
    const sun = new T.DirectionalLight(0xfff3e1, 1.3);
    sun.position.set(-260, 170, 40);
    sun.target.position.set(0, -20, 0);
    sun.shadow.camera.left = -150;
    sun.shadow.camera.right = 150;
    sun.shadow.camera.top = 150;
    sun.shadow.camera.bottom = -150;
    sun.shadow.camera.near = 60;
    sun.shadow.camera.far = 650;
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.bias = -0.00015;
    sun.shadow.normalBias = 0.12;
    sun.shadow.radius = 2;
    sc.add(sun, sun.target);
    R.sun = sun;
    const fill = new T.DirectionalLight(0xdde9ff, 0.32);
    fill.position.set(140, 100, -100);
    sc.add(fill);
    const spot = new T.SpotLight(0xfff6e6, 0.45, 500, 0.9, 0.7, 1);
    spot.position.set(0, 190, 10);
    spot.target.position.set(0, 0, 0);
    sc.add(spot, spot.target);
    [
      [-110, 215, -60],
      [110, 215, -60],
      [0, 215, 120],
    ].forEach((p) => {
      const l = new T.PointLight(0xf2f6ff, 0.22, 380, 2);
      l.position.set(...p);
      sc.add(l);
    });
  }

  /* ---------------------------------------------------- particles & misc */
  function particles() {
    const sc = R.scene,
      st = R.spriteTexture;
    const n = 140,
      pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = -250 + rand() * 330;
      pos[i * 3 + 1] = -60 + rand() * 230;
      pos[i * 3 + 2] = -220 + rand() * 360;
    }
    const dg = new T.BufferGeometry();
    dg.setAttribute("position", new T.BufferAttribute(pos, 3));
    R.dust = new T.Points(
      dg,
      new T.PointsMaterial({
        size: 0.65,
        map: st,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        blending: T.AdditiveBlending,
        color: 0xfff1d0,
      }),
    );
    sc.add(R.dust);
    const m = 60,
      sp = new Float32Array(m * 3);
    R.sparkVel = new Float32Array(m * 3);
    R.sparkLife = new Float32Array(m);
    const sg = new T.BufferGeometry();
    sg.setAttribute("position", new T.BufferAttribute(sp, 3));
    R.sparks = new T.Points(
      sg,
      new T.PointsMaterial({
        size: 3.2,
        map: st,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: T.AdditiveBlending,
        color: 0xffd98a,
      }),
    );
    R.sparks.frustumCulled = false;
    sc.add(R.sparks);
    R.sparkIdx = 0;
  }
  R.burst = function () {};
  R.burstOld = function (x, y, k) {
    const a = R.sparks.geometry.attributes.position,
      n = 18 + Math.floor(k * 14);
    for (let i = 0; i < n; i++) {
      const j = R.sparkIdx++ % 60,
        ang = rand() * 6.28,
        sp = 20 + rand() * 80 * (0.4 + k);
      a.setXYZ(j, x - W / 2, 1.2, y - H / 2);
      R.sparkVel[j * 3] = Math.cos(ang) * sp;
      R.sparkVel[j * 3 + 1] = 20 + rand() * 50;
      R.sparkVel[j * 3 + 2] = Math.sin(ang) * sp;
      R.sparkLife[j] = 0.5 + rand() * 0.4;
    }
    a.needsUpdate = true;
  };
  function trails() {
    R.trail = [0, 1].map((i) => {
      const n = 28,
        g = new T.BufferGeometry();
      g.setAttribute(
        "position",
        new T.BufferAttribute(new Float32Array(n * 3), 3),
      );
      const l = new T.Line(
        g,
        new T.LineBasicMaterial({
          color: i ? 0xd33a3a : 0x1f9a4a,
          transparent: true,
          opacity: 0.55,
        }),
      );
      l.frustumCulled = false;
      l.visible = false;
      R.scene.add(l);
      return { l, n, pts: [] };
    });
  }
  R.pushTrail = function (i, x, y, speed) {
    const t = R.trail[i];
    t.pts.push([x - W / 2, 0.4, y - H / 2]);
    if (t.pts.length > t.n) t.pts.shift();
    const a = t.l.geometry.attributes.position;
    for (let k = 0; k < t.n; k++) {
      const p = t.pts[Math.min(k, t.pts.length - 1)];
      a.setXYZ(k, p[0], p[1], p[2]);
    }
    a.needsUpdate = true;
    t.l.visible = speed > 25 && t.pts.length > 2;
  };
  R.clearTrails = function () {
    R.trail.forEach((t) => {
      t.pts = [];
      t.l.visible = false;
    });
  };
  function aimArrow() {
    const g = new T.Group(),
      mat = new T.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      });
    const shaft = new T.Mesh(new T.PlaneGeometry(1, 1), mat);
    shaft.rotation.x = -Math.PI / 2;
    shaft.position.y = 0.45;
    g.add(shaft);
    const head = new T.Mesh(new T.ConeGeometry(2.2, 4.5, 3), mat);
    head.rotation.z = -Math.PI / 2;
    head.position.y = 0.45;
    head.rotation.x = Math.PI / 2;
    g.add(head);
    const dots = new T.Group();
    for (let i = 0; i < 10; i++) {
      const d = new T.Mesh(new T.CircleGeometry(0.55, 10), mat);
      d.rotation.x = -Math.PI / 2;
      d.position.y = 0.4;
      dots.add(d);
    }
    g.add(dots);
    g.visible = false;
    R.scene.add(g);
    R.aim = { g, shaft, head, dots, mat };
    R.hints = [];
    for (let i = 0; i < 8; i++) {
      const m = new T.Mesh(
        new T.PlaneGeometry(1, 1.1),
        new T.MeshBasicMaterial({
          color: 0x4aa3ff,
          transparent: true,
          opacity: 0.5,
          depthWrite: false,
        }),
      );
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      m.position.y = 0.35;
      R.scene.add(m);
      R.hints.push(m);
    }
  }
  /* Show the aim arrow from table point (cx,cy), angle, power 0..1 */
  R.showAim = function (cx, cy, ang, pow, show) {
    const A = R.aim;
    A.g.visible = !!show;
    if (!show) return;
    const len = 6 + pow * 46;
    A.g.position.set(cx - W / 2, 0, cy - H / 2);
    A.g.rotation.y = -ang;
    const col = new T.Color().setHSL(0.36 - 0.36 * pow, 0.85, 0.55);
    A.mat.color.copy(col);
    A.shaft.scale.set(len, 0.9, 1);
    A.shaft.position.x = len / 2;
    A.head.position.x = len + 2.2;
    A.dots.children.forEach((d, i) => {
      d.position.x = len + 4 + i * 4.4;
      d.material = A.mat;
      d.visible = true;
      d.scale.setScalar(Math.max(0.2, 1 - i * 0.09));
    });
  };
  /* hint arrows for the Training lab: [{x,y,ang,pow,score,selected}] */
  R.showHints = function (list) {
    R.hints.forEach((m, i) => {
      const h = list && list[i];
      m.visible = !!h;
      if (!h) return;
      const len = 8 + h.pow * 42;
      m.scale.set(len, h.selected ? 1.8 : 0.9, 1);
      m.position.set(
        h.x - W / 2 + (Math.cos(h.ang) * len) / 2,
        0.35,
        h.y - H / 2 + (Math.sin(h.ang) * len) / 2,
      );
      m.rotation.z = -h.ang;
      m.rotation.x = -Math.PI / 2;
      m.rotation.order = "YXZ";
      m.rotation.set(-Math.PI / 2, 0, 0);
      m.rotation.y = 0;
      m.quaternion.setFromEuler(new T.Euler(-Math.PI / 2, 0, 0));
      m.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(UP, -h.ang));
      m.material.color.setHSL(h.selected ? 0.38 : 0.6, 0.8, 0.55);
      m.material.opacity = h.selected ? 0.9 : 0.25 + 0.4 * (h.score / 100);
    });
  };

  /* ------------------------------------------------------- blackboard etc */
  R.board = {
    names: ["You", "AI"],
    scores: [0, 0],
    goal: 3,
    round: 1,
    stage: "Classroom",
    turn: "",
    note: "Search before you flick.",
    hw: ["Ch.3  DFS and DLS", "A* worksheet", "Fuzzy rules  Q1-5"],
  };
  function drawBoard() {
    const b = R.board,
      c = R.boardCanvas,
      g = c.getContext("2d"),
      w = c.width,
      h = c.height;
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, "#16261d");
    gr.addColorStop(1, "#0f1c15");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = "rgba(255,255,255," + Math.random() * 0.05 + ")";
      g.fillRect(
        Math.random() * w,
        Math.random() * h,
        40 + Math.random() * 80,
        2,
      );
    }
    g.fillStyle = "rgba(230,236,226,.92)";
    g.textAlign = "left";
    g.font = "34px " + FONT;
    g.fillText("Std. 9 - A      Sub : AI Lab", 36, 54);
    g.font = "30px " + FONT;
    g.fillStyle = "rgba(230,236,226,.7)";
    g.fillText("Thought for the day:", 36, 118);
    g.fillText("“" + b.note + "”", 36, 156);
    g.fillStyle = "rgba(245,247,240,.96)";
    g.font = "66px " + FONT;
    g.fillText("PEN FIGHT", 36, 262);
    g.fillStyle = "rgba(245,200,120,.9)";
    g.font = "30px " + FONT;
    g.fillText(b.stage + " · first to " + b.goal, 40, 300);
    g.strokeStyle = "rgba(245,247,240,.8)";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(36, 312);
    g.lineTo(470, 312);
    g.stroke();
    [0, 1].forEach((i) => {
      g.fillStyle = i === 0 ? "#9fe0b0" : "#f0a0a0";
      g.font = "50px " + FONT;
      g.fillText(b.names[i], 40, 374 + i * 64);
      g.fillStyle = "#fff";
      g.font = "60px " + FONT;
      g.fillText(String(b.scores[i]), 330, 378 + i * 64);
      for (let k = 0; k < b.goal; k++) {
        g.strokeStyle = "rgba(240,240,230,.8)";
        g.lineWidth = 3;
        g.strokeRect(400 + k * 42, 342 + i * 64, 32, 32);
        if (k < b.scores[i]) {
          g.fillStyle = i === 0 ? "#9fe0b0" : "#f0a0a0";
          g.fillRect(405 + k * 42, 347 + i * 64, 22, 22);
        }
      }
    });
    g.fillStyle = "rgba(230,236,226,.75)";
    g.font = "28px " + FONT;
    g.fillText(
      "Round " + b.round + (b.turn ? "   ·   " + b.turn : ""),
      40,
      482,
    );
    g.strokeStyle = "rgba(230,236,226,.5)";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(640, 20);
    g.lineTo(640, h - 20);
    g.stroke();
    g.fillStyle = "rgba(230,236,226,.9)";
    g.font = "44px " + FONT;
    g.fillText("H.W.", 700, 74);
    g.font = "36px " + FONT;
    b.hw.forEach((t, i) => {
      g.fillStyle = "rgba(230,236,226,.85)";
      g.fillText(t, 700, 140 + i * 58);
    });
    g.strokeStyle = "rgba(230,236,226,.55)";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(700, 140 + 2 * 58 + 12);
    g.lineTo(980, 140 + 2 * 58 + 12);
    g.stroke();
    g.beginPath();
    g.moveTo(760, 440);
    g.lineTo(850, 330);
    g.lineTo(940, 440);
    g.closePath();
    g.stroke();
    g.font = "24px " + FONT;
    g.fillText("Monitor : Rinku", 730, 492);
    R.boardTex.needsUpdate = true;
  }
  R.drawBoard = drawBoard;
  function drawClock() {
    const c = R.clock.c,
      g = c.getContext("2d"),
      d = new Date();
    g.fillStyle = "#f7f4ea";
    g.beginPath();
    g.arc(128, 128, 124, 0, 6.28);
    g.fill();
    g.lineWidth = 10;
    g.strokeStyle = "#2b2b2b";
    g.stroke();
    g.fillStyle = "#222";
    g.font = "bold 26px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    for (let i = 1; i <= 12; i++) {
      const a = (i / 12) * 6.283 - 1.5708;
      g.fillText(i, 128 + Math.cos(a) * 94, 128 + Math.sin(a) * 94);
    }
    const hand = (a, l, w, col) => {
      g.strokeStyle = col;
      g.lineWidth = w;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(128, 128);
      g.lineTo(128 + Math.cos(a - 1.5708) * l, 128 + Math.sin(a - 1.5708) * l);
      g.stroke();
    };
    hand(
      (((d.getHours() % 12) + d.getMinutes() / 60) / 12) * 6.283,
      56,
      9,
      "#222",
    );
    hand(((d.getMinutes() + d.getSeconds() / 60) / 60) * 6.283, 84, 6, "#222");
    hand((d.getSeconds() / 60) * 6.283, 92, 3, "#c0392b");
    R.clock.t.needsUpdate = true;
  }

  /* ---------------------------------------------------------- per-frame */
  let clockT = 0;
  R.ambient = function (dt, time) {
    R.fans.forEach((f, i) => {
      f.userData.bl.rotation.y += dt * (4 + i * 0.4);
    });
    if (R.globe) R.globe.rotation.y += dt * 0.2;
    if (R.dust && R.dust.visible) {
      const a = R.dust.geometry.attributes.position;
      for (let i = 0; i < a.count; i++) {
        a.setY(i, a.getY(i) + Math.sin(time * 0.3 + i) * dt * 2.2 - dt * 0.8);
        a.setX(i, a.getX(i) + Math.cos(time * 0.2 + i * 1.3) * dt * 1.5);
        if (a.getY(i) < -70) a.setY(i, 170);
      }
      a.needsUpdate = true;
    }
    if (R.sparks) {
      const a = R.sparks.geometry.attributes.position;
      for (let j = 0; j < 60; j++) {
        if (R.sparkLife[j] > 0) {
          R.sparkLife[j] -= dt;
          R.sparkVel[j * 3 + 1] -= 400 * dt;
          a.setXYZ(
            j,
            a.getX(j) + R.sparkVel[j * 3] * dt,
            Math.max(0.3, a.getY(j) + R.sparkVel[j * 3 + 1] * dt),
            a.getZ(j) + R.sparkVel[j * 3 + 2] * dt,
          );
        } else a.setY(j, -999);
      }
      a.needsUpdate = true;
    }
    clockT -= dt;
    if (clockT < 0) {
      clockT = 1;
      drawClock();
    }
    R.shafts.forEach((s, i) => {
      s.material.opacity = 0.08 + 0.025 * Math.sin(time * 0.5 + i);
    });
  };
  R.tableShake = 0;
  R.resize = function (w, h) {
    R.renderer.setSize(w, h, false);
    R.camera.aspect = w / h;
    R.camera.updateProjectionMatrix();
    R.aspect = w / h;
  };
  R.render = function () {
    R.renderer.render(R.scene, R.camera);
  };
  R.setPenType = (i, type, color) => R.pens[i].setType(type, color);
  R.setPen = (i, state, time, scale) => R.pens[i].setState(state, time, scale);
  R.dispose = function () {
    R.initialized = false;
    if (R.scene) {
      disposeObjectTree(R.scene);
      R.scene.clear();
    }
    if (R.renderer) {
      R.renderer.renderLists.dispose();
      R.renderer.dispose();
    }
    R.pens = [];
    R.students = [];
  };
  R.registerPen = (slot, pen) => {
    R.pens[slot] = pen;
  };
  R.registerCharacter = (slot, character) => {
    R.students[slot] = character;
  };
  R.setEnvironment = (texture, spriteTexture) => {
    R.scene.environment = texture;
    if (spriteTexture) R.spriteTexture = spriteTexture;
  };
  R.W = W;
  R.H = H;
  return R;
}
