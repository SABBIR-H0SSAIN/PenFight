import { reachProgress } from "../motion.js";
import { createHeadBuilder } from "./head.js";
import { createHandBuilder } from "./hand.js";
/* Character feature: stylized students, facial expression, hands, and arm IK. */
export function createCharacterFeature(deps) {
  const { THREE: T, rand, M, place } = deps;
  const { makeCharacterHead, animateFace } = createHeadBuilder({
    T,
    M,
    lathe,
    oval,
    contour,
  });
  const SK = { up: 29, fore: 26.5 }; // Anatomically fixed arm lengths: never scale bones to reach a pen
  const SEAT = 66,
    HIP = { y: -26, z: 4 },
    SH = { x: 17.4, y: 46.5 },
    PALM = 9.6,
    LAP = { y: -18.2, z: 54 };
  const SLOUCH = 0.075,
    LEAN_STEPS = [0.075, 0.11, 0.15, 0.19, 0.23, 0.27, 0.3],
    SCOOT_MAX = 13,
    REACH_OK = (SK.up + SK.fore) * 0.94;
  const FING = {
      idx: [4.4, 2.7, 2.2],
      mid: [4.9, 3.0, 2.3],
      ring: [4.5, 2.8, 2.2],
      pink: [3.6, 2.2, 2.0],
    },
    FJ = [0.62, 0.8, 0.55];
  const { makeHand, poseHand, fingerTip } = createHandBuilder({
    T,
    PALM,
    FING,
    FJ,
  });
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  const angDiff = (a, b) => {
    let d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  };
  const angNear = (cur, to) => cur + angDiff(cur, to);

  function characterMaterials(idx) {
    const materials = {
      skin: M(idx ? 0xc78f69 : 0xe1b18a, 0.83, 0, { envMapIntensity: 0.18 }),
      shirt: M(idx ? 0xe1e8e5 : 0xe4e9f0, 0.95, 0, { envMapIntensity: 0.15 }),
      pants: M(0x344354, 0.92),
      tie: M(idx ? 0x95514d : 0x405e8c, 0.85),
      shoe: M(0x29313d, 0.65),
      hair: M(idx ? 0x3e2d27 : 0x242b34, 0.9),
    };
    Object.values(materials).forEach((m) => m.color.convertSRGBToLinear());
    return materials;
  }
  function oval(parent, material, position, scale, segments) {
    const mesh = new T.Mesh(
      new T.SphereGeometry(1, segments || 28, 20),
      material,
    );
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    parent.add(mesh);
    return mesh;
  }
  function contour(parent, points, radius, material) {
    const curve = new T.CatmullRomCurve3(
      points.map((p) => new T.Vector3(...p)),
    );
    const mesh = new T.Mesh(
      new T.TubeGeometry(curve, 24, radius, 6, false),
      material,
    );
    parent.add(mesh);
    return mesh;
  }

  /* ------------------------------------------------------------ student body */
  function lathe(prof, mat, sx, sz, seg) {
    const m = new T.Mesh(
      new T.LatheGeometry(
        prof.map((p) => new T.Vector2(p[0], p[1])),
        seg || 28,
      ),
      mat,
    );
    m.scale.set(sx, 1, sz);
    return m;
  }
  function limbGeo(prof) {
    return new T.LatheGeometry(
      prof.map((p) => new T.Vector2(p[0], p[1])),
      28,
    );
  }
  /** @returns {import("../types").CharacterRig} */
  function makeStudent(idx) {
    const side = idx === 0 ? 1 : -1,
      g = new T.Group(),
      arms = new T.Group();
    const S = {
      idx,
      side,
      group: g,
      arms,
      emo: "neutral",
      emoT: 0,
      t: rand() * 10,
      blinkT: 1.2 + idx * 1.5,
      look: new T.Vector3(),
      tweens: [],
      react: null,
      thinking: false,
      goal: null,
      grabP: null,
      grabDone: false,
      lean: SLOUCH,
      scoot: 0,
      contactTarget: null,
      leftState: "lap",
      blink: false,
      px: 0,
      py: 0,
      m: 0,
      mL: 0,
      emoDrawn: "",
      invT: new T.Matrix4(),
    };
    S.fwd = new T.Vector3(0, 0, -side);
    S.right = new T.Vector3(side, 0, 0);
    S.fa = Math.atan2(S.fwd.z, S.fwd.x);
    S.mats = characterMaterials(idx);
    g.position.set(0, 0, side * SEAT);
    g.rotation.y = idx === 0 ? 0 : Math.PI;
    // chair
    const chM = M(0x5a4636, 0.65),
      seat = new T.Mesh(new T.BoxGeometry(40, 4, 38), chM);
    seat.position.set(0, -30, 4);
    g.add(seat);
    const back = new T.Mesh(new T.BoxGeometry(40, 28, 3), chM);
    back.position.set(0, -12, 22);
    g.add(back);
    [
      [-17, -10],
      [17, -10],
      [-17, 17],
      [17, 17],
    ].forEach((p) => {
      const l = new T.Mesh(
        new T.CylinderGeometry(1.2, 1.2, 45, 8),
        M(0x2e3036, 0.4, 0.7),
      );
      l.position.set(p[0], -52, p[1]);
      g.add(l);
    });
    // Seated thighs and calves have tapered cloth silhouettes, shaped knees and leather shoes.
    [-9, 9].forEach((x) => {
      const th = lathe(
        [
          [0.01, -22],
          [5.3, -21],
          [6.4, -15],
          [6.8, -5],
          [6.5, 6],
          [5.9, 17],
          [5, 22],
        ],
        S.mats.pants,
        1,
        0.88,
        32,
      );
      th.rotation.x = Math.PI / 2;
      th.position.set(x, -23, -15);
      g.add(th);
      oval(g, S.mats.pants, [x, -27, -36], [5.9, 6.4, 6.2]);
      const sh = lathe(
        [
          [4.2, -22],
          [4.5, -19],
          [4.35, -12],
          [4.8, -3],
          [5.4, 8],
          [5.2, 17],
          [4.8, 22],
        ],
        S.mats.pants,
        1,
        1.02,
        32,
      );
      sh.position.set(x, -49, -36);
      g.add(sh);
      oval(g, S.mats.shoe, [x, -70.8, -42], [5.1, 4, 10.3]);
      oval(g, M(0x141416, 0.85), [x, -73.5, -42], [5.2, 1.05, 10.4]);
      for (let i = 0; i < 4; i++)
        contour(
          g,
          [
            [x - 2.2, -67.1, -40 - i * 1.15],
            [x, -66.8, -40.5 - i * 1.15],
            [x + 2.2, -67.1, -40 - i * 1.15],
          ],
          0.13,
          M(0x414145, 0.85),
        );
    });
    // torso pivots at the hips
    const torso = new T.Group();
    torso.position.set(0, HIP.y, HIP.z);
    g.add(torso);
    S.torso = torso;
    torso.add(
      lathe(
        [
          [0.01, 0],
          [15.6, 0.2],
          [16.6, 6],
          [15.8, 11.5],
          [15.4, 12.2],
        ],
        S.mats.pants,
        1.0,
        0.62,
      ),
    );
    const shirt = lathe(
      [
        [0.01, 9],
        [15.4, 9.5],
        [15.9, 11],
        [15.1, 13],
        [15.5, 15],
        [15.1, 17],
        [15.6, 25],
        [17.4, 35],
        [18.3, 43],
        [16.8, 48.5],
        [10.5, 51.8],
        [6.4, 53.4],
        [5.2, 54.2],
      ],
      S.mats.shirt,
      1,
      0.6,
      48,
    );
    const shirtCurve = new T.SplineCurve(
      [
        [15.4, 9.5],
        [15.3, 17],
        [15.8, 26],
        [17.8, 37],
        [18.5, 44],
        [16.8, 48.5],
        [10.5, 51.8],
        [5.2, 54.2],
      ].map((v) => new T.Vector2(...v)),
    );
    shirt.geometry.dispose();
    shirt.geometry = new T.LatheGeometry(shirtCurve.getPoints(80), 64);
    const sp = shirt.geometry.attributes.position;
    for (let i = 0; i < sp.count; i++) {
      const x = sp.getX(i),
        y = sp.getY(i),
        z = sp.getZ(i),
        a = Math.atan2(z, x);
      const f =
        0.12 * Math.sin(a * 8 + y * 0.12) + 0.065 * Math.sin(y * 0.4 + a * 3);
      sp.setXYZ(i, x + Math.cos(a) * f, y, z + Math.sin(a) * f);
    }
    shirt.geometry.computeVertexNormals();
    torso.add(shirt);
    const seam = M(0xc6c4bc, 0.95);
    contour(
      torso,
      [
        [0.65, 14, -9.5],
        [0.65, 25, -9.5],
        [0.65, 36, -10.55],
        [0.65, 46, -10.4],
      ],
      0.075,
      seam,
    );
    [17, 24, 31, 39].forEach((y) =>
      oval(
        torso,
        M(0xd6d3c7, 0.55),
        [0, y, y > 30 ? -10.7 : -9.6],
        [0.4, 0.4, 0.15],
      ),
    );
    contour(
      torso,
      [
        [-12, 39, -8.4],
        [-7, 39, -10.3],
        [-7, 32, -10],
        [-9.5, 31.4, -9.5],
        [-12, 32, -8.4],
        [-12, 39, -8.4],
      ],
      0.075,
      seam,
    );
    [-1, 1].forEach((v) =>
      contour(
        torso,
        [
          [v * 5.2, 52, -4.2],
          [v * 10, 50.5, -5.7],
          [v * 16.5, 47.4, -4.4],
        ],
        0.08,
        seam,
      ),
    );
    const belt = new T.Mesh(
      new T.CylinderGeometry(15.9, 15.9, 1.8, 28),
      M(0x111114, 0.6),
    );
    belt.scale.set(1, 1, 0.625);
    belt.position.y = 11.2;
    torso.add(belt);
    const tieShape = new T.Shape();
    tieShape.moveTo(-1.5, 46);
    tieShape.lineTo(1.5, 46);
    tieShape.lineTo(2.15, 27);
    tieShape.lineTo(0, 24.5);
    tieShape.lineTo(-2.15, 27);
    tieShape.closePath();
    const tie = new T.Mesh(
      new T.ExtrudeGeometry(tieShape, {
        depth: 0.45,
        bevelEnabled: true,
        bevelSize: 0.18,
        bevelThickness: 0.12,
        bevelSegments: 2,
        steps: 1,
      }),
      S.mats.tie,
    );
    tie.position.z = -11.1;
    torso.add(tie);
    const knot = lathe(
      [
        [0.9, -2.2],
        [1.8, -0.8],
        [2.05, 1.7],
        [1.65, 2.2],
      ],
      S.mats.tie,
      1,
      0.48,
      24,
    );
    knot.position.set(0, 47, -10.6);
    torso.add(knot);

    const collar = lathe(
      [
        [5.25, 51.1],
        [5.1, 53],
        [4.85, 54.3],
      ],
      S.mats.shirt,
      1,
      0.92,
      32,
    );
    collar.position.z = -0.8;
    torso.add(collar);
    [-1, 1].forEach((sign) => {
      const geo = new T.BufferGeometry();
      geo.setAttribute(
        "position",
        new T.Float32BufferAttribute(
          [
            sign * 0.6,
            52,
            -5.5,
            sign * 5.6,
            52.8,
            -4.5,
            sign * 7,
            48.2,
            -8.3,
            sign * 3.1,
            46.7,
            -10.8,
          ],
          3,
        ),
      );
      geo.setAttribute(
        "uv",
        new T.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2),
      );
      geo.setIndex(sign > 0 ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3]);
      geo.computeVertexNormals();
      const mat = S.mats.shirt.clone();
      mat.side = T.DoubleSide;
      torso.add(new T.Mesh(geo, mat));
    });
    makeCharacterHead(S);
    // arms live in world space (IK) so they can reach across the desk; 0 = right arm, 1 = left arm
    S.arm = [1, -1].map((sx) => {
      const a = {
        sx,
        phi: 0,
        pitch: 0,
        lastDy: 0,
        fyaw: S.fa,
        E: new T.Vector3(),
        Wc: new T.Vector3(),
        tip: new T.Vector3(),
        ready: false,
        s: 1,
        ang: S.fa,
      };
      a.sleeve = new T.Mesh(
        limbGeo([
          [0, -0.62],
          [3.5, -0.59],
          [4.85, -0.5],
          [5.0, -0.35],
          [4.9, -0.1],
          [4.5, 0.25],
          [4.12, 0.44],
          [4.18, 0.5],
          [3.38, 0.5],
          [3.38, 0.43],
        ]),
        S.mats.shirt,
      );
      a.upper = new T.Mesh(
        limbGeo([
          [2.9, -0.5],
          [3.25, -0.3],
          [3.8, 0.0],
          [3.7, 0.25],
          [3.5, 0.5],
        ]),
        S.mats.skin,
      );
      a.fore = new T.Mesh(
        limbGeo([
          [3.0, -0.5],
          [3.28, -0.4],
          [3.2, -0.25],
          [2.75, 0.1],
          [2.35, 0.38],
          [2.12, 0.5],
        ]),
        S.mats.skin,
      );
      a.elbow = new T.Mesh(new T.SphereGeometry(2.95, 24, 18), S.mats.skin);
      a.shoulder = new T.Mesh(new T.SphereGeometry(4.1, 32, 24), S.mats.shirt);
      a.wrist = new T.Mesh(new T.SphereGeometry(2.15, 20, 16), S.mats.skin);
      a.shoulder.scale.set(1, 0.82, 1.08);
      a.shoulder.visible = false;
      a.hand = makeHand(S.mats.skin, sx < 0);
      [a.sleeve, a.upper, a.fore, a.elbow, a.shoulder, a.wrist].forEach(
        (mm) => {
          mm.castShadow = true;
          mm.receiveShadow = true;
          arms.add(mm);
        },
      );
      arms.add(a.hand.group);
      return a;
    });
    g.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    const lapAng = (sx) => S.fa - sx * 0.2;
    S.lapPose = (sx) => ({
      tx: S.right.x * sx * 11,
      ty: LAP.y,
      tz: side * LAP.z,
      curl: 0.25,
      ang: lapAng(sx),
    });
    S.deskPose = () => ({
      tx: -S.right.x * 12,
      ty: 0.35,
      tz: side * 42,
      curl: 0.5,
      ang: S.fa + 0.15,
    });
    S.hand = S.lapPose(1);
    S.lhand = S.lapPose(-1);
    S.setEmotion = (e, dur) => {
      S.emo = e;
      S.emoT = dur || 0;
    };
    S.near = angNear;
    S.reset = function () {
      S.m++;
      S.mL++;
      S.tweens.forEach((t) => t.res());
      S.tweens = [];
      S.goal = null;
      S.grabP = null;
      S.grabDone = false;
      S.contactTarget = null;
      S.react = null;
      S.thinking = false;
      S.leftState = "lap";
      Object.assign(S.hand, S.lapPose(1));
      Object.assign(S.lhand, S.lapPose(-1));
      S.arm.forEach((a) => {
        a.phi = 0;
        a.pitch = 0;
        a.fyaw = S.fa;
        a.ready = false;
      });
      S.lean = SLOUCH;
      S.scoot = 0;
    };
    /* animate hand params: obj defaults to the shooting (right) hand */
    S.to = function (props, dur, key, obj) {
      obj = obj || S.hand;
      return new Promise((res) => {
        S.tweens = S.tweens.filter((t) => {
          if (t.obj !== obj) return true;
          for (const p in props) delete t.to[p];
          if (!Object.keys(t.to).length) {
            t.res();
            return false;
          }
          return true;
        });
        const from = {};
        for (const k in props) from[k] = obj[k];
        S.tweens.push({
          obj,
          from,
          to: Object.assign({}, props),
          t: 0,
          d: Math.max(0.001, dur),
          res,
          key,
        });
      });
    };
    /* motion ids: starting a new motion on a hand supersedes (silently stops) the previous async one */
    S.begin = (which) => (which === "l" ? ++S.mL : ++S.m);
    S.run = async function (which, stages, id) {
      const obj = which === "l" ? S.lhand : S.hand;
      for (const st of stages) {
        if ((which === "l" ? S.mL : S.m) !== id) return false;
        await S.to(
          typeof st[0] === "function" ? st[0](obj) : st[0],
          st[1],
          st[2] || null,
          obj,
        );
      }
      return (which === "l" ? S.mL : S.m) === id;
    };
    /* the safe way to and from the lap: back out past the desk edge, rise, then travel over the table (and the reverse) */
    S.liftStages = (which) => {
      const sx = which === "l" ? -1 : 1;
      return [
        [{ tz: side * 66, tx: S.right.x * sx * 11, curl: 0.35 }, 0.1],
        [{ ty: 9, curl: 0.4 }, 0.14],
      ];
    };
    S.dropStages = (which) => {
      const sx = which === "l" ? -1 : 1,
        lp = S.lapPose(sx);
      return [
        [(o) => ({ ty: Math.max(o.ty, 9), curl: 0.35 }), 0.14],
        [
          (o) => ({
            tz: side * 66,
            tx: lp.tx,
            ang: angNear(o.ang, lp.ang),
            curl: 0.3,
          }),
          0.22,
          "reach",
        ],
        [{ ty: LAP.y, tz: lp.tz, curl: lp.curl }, 0.2],
      ];
    };
    S.draw = function () {
      animateFace(S);
    };
    S.update = function (dt, time) {
      updateStudent(S, dt, time);
    };
    S.draw();
    return S;
  }

  /* ------------------------------------------------------------ arm solver */
  const _s = {
    d: new T.Vector3(),
    dir: new T.Vector3(),
    mid: new T.Vector3(),
    u: new T.Vector3(),
    v: new T.Vector3(),
    E: new T.Vector3(),
    p: new T.Vector3(),
    Wt: new T.Vector3(),
    off: new T.Vector3(),
    sl: new T.Vector3(),
    a: new T.Vector3(),
    b: new T.Vector3(),
  };
  const CAND = [
    0, 0.3, -0.3, 0.6, -0.6, 0.95, -0.95, 1.3, -1.3, 1.7, -1.7, 2.2, -2.2, 3.0,
  ];
  function tipOffset(P, arm, ang, pitch, out) {
    const F = fingerTip(P.curl, arm.sx),
      cp = Math.cos(pitch),
      sp = Math.sin(pitch),
      ca = Math.cos(ang),
      sa = Math.sin(ang);
    const lx = F.x * cp - F.y * sp,
      ly = F.x * sp + F.y * cp;
    return out.set(ca * lx - sa * F.z, ly, sa * lx + ca * F.z);
  }
  /* lift the wrist when palm, knuckles or finger pad would sink into the desk top */
  function handKeep(Wt, ang, pitch, P, arm) {
    const ca = Math.cos(ang),
      sa = Math.sin(ang),
      cp = Math.cos(pitch),
      sp = Math.sin(pitch),
      F = fingerTip(P.curl, arm.sx);
    let need = 0;
    const test = (lx, ly, lz, c) => {
      const x = lx * cp - ly * sp,
        y = lx * sp + ly * cp,
        wx = Wt.x + ca * x - sa * lz,
        wz = Wt.z + sa * x + ca * lz,
        wy = Wt.y + y;
      if (Math.abs(wx) < 32 && Math.abs(wz) < 52 && wy > -1.2 && wy < c)
        need = Math.max(need, c - wy);
    };
    test(0, 0, 0, 1.8);
    test(PALM, 0, 0, 1.7);
    test(PALM, 0, F.z, 1.7);
    test(F.x, F.y, F.z, 0.12);
    Wt.y += need;
  }
  /* how deep a limb point of radius r sits inside the desk top or the student's own torso */
  function hitPen(S, p, r) {
    let pen = 0;
    const ax = Math.abs(p.x),
      az = Math.abs(p.z);
    if (ax < 30 + r * 0.5 && az < 50 + r * 0.5) {
      const d = Math.min(r - p.y, p.y + 4 + r);
      if (d > 0) pen += d;
    }
    const q = _s.p.copy(p).applyMatrix4(S.invT);
    if (q.y > 3 && q.y < 52) {
      const e = Math.hypot(q.x / (17.3 + r * 0.25), q.z / (10.8 + r * 0.25));
      if (e < 1) pen += (1 - e) * 9;
    }
    return pen;
  }
  function armCost(S, sh, E, Wt) {
    let c = Math.max(0, E.y - (sh.y - 4)) * 0.6;
    for (let i = 0; i < 3; i++)
      c += hitPen(S, _s.sl.lerpVectors(sh, E, 0.4 + i * 0.3), 4) * 8;
    for (let i = 1; i <= 4; i++)
      c += hitPen(S, _s.sl.lerpVectors(E, Wt, i * 0.2), 2.9) * 8;
    return c;
  }
  /* Two-bone IK with a hard, anatomical reach limit.  Smooth wrist targets before
     solving so a distant pen never produces a telescoping or instantly snapping arm. */
  function solveArm(S, arm, sh, Wt, dt) {
    const l1 = SK.up,
      l2 = SK.fore,
      minR = Math.abs(l1 - l2) + 2.2;
    const maxR =
      (l1 + l2) * (S.contactTarget && arm === S.arm[0] ? 0.992 : 0.955); // extend naturally at pen contact, never stretch bones
    const wanted = _s.d.copy(Wt).sub(sh);
    let distance = wanted.length();
    if (distance > maxR) wanted.multiplyScalar(maxR / distance);
    else if (distance < minR) {
      if (distance < 1e-5) wanted.copy(S.fwd).multiplyScalar(minR);
      else wanted.multiplyScalar(minR / distance);
    }
    const target = _s.b.copy(sh).add(wanted);
    if (!arm.ready || !Number.isFinite(arm.Wc.x)) {
      arm.Wc.copy(target);
      arm.ready = true;
    } else {
      const delta = _s.p.copy(target).sub(arm.Wc);
      const precise = !!S.contactTarget && arm === S.arm[0];
      const speed = 1 - Math.exp(-dt * (precise ? 40 : 16));
      const step = Math.min(
        delta.length() * speed,
        Math.max(0.1, (precise ? 280 : 170) * dt),
      );
      if (delta.lengthSq() > 1e-8)
        arm.Wc.addScaledVector(delta, step / delta.length());
    }
    const d = _s.d.copy(arm.Wc).sub(sh);
    distance = d.length();
    if (distance > maxR) {
      d.multiplyScalar(maxR / distance);
      distance = maxR;
      arm.Wc.copy(sh).add(d);
    }
    if (distance < minR) {
      if (distance < 1e-5) d.copy(S.fwd).multiplyScalar(minR);
      else d.multiplyScalar(minR / distance);
      distance = minR;
      arm.Wc.copy(sh).add(d);
    }
    const dir = _s.dir.copy(d).normalize();
    const a = (l1 * l1 - l2 * l2 + distance * distance) / (2 * distance);
    const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const mid = _s.mid.copy(sh).addScaledVector(dir, a);
    const u = _s.u.copy(S.right).multiplyScalar(arm.sx * 0.35);
    u.y -= 1.0;
    u.addScaledVector(S.fwd, -0.3);
    u.addScaledVector(dir, -u.dot(dir));
    if (u.lengthSq() < 1e-8) u.set(0, -1, 0).addScaledVector(dir, dir.y);
    u.normalize();
    const v = _s.v.crossVectors(dir, u);
    let best = arm.phi,
      bc = Infinity;
    for (const ph of CAND) {
      _s.E.copy(mid)
        .addScaledVector(u, Math.cos(ph) * h)
        .addScaledVector(v, Math.sin(ph) * h);
      // Strong preference for continuous, downward elbows avoids abrupt swivel flips.
      const cost =
        armCost(S, sh, _s.E, arm.Wc) +
        Math.abs(ph) * 1.2 +
        Math.abs(ph - arm.phi) * 3.2;
      if (cost < bc) {
        bc = cost;
        best = ph;
      }
    }
    arm.phi += (best - arm.phi) * (1 - Math.exp(-dt * 9));
    arm.E.copy(mid)
      .addScaledVector(u, Math.cos(arm.phi) * h)
      .addScaledVector(v, Math.sin(arm.phi) * h);
    arm.s = 1;
    arm.lastDy = (arm.Wc.y - arm.E.y) / Math.max(1, arm.Wc.distanceTo(arm.E));
    arm.fyaw +=
      angDiff(arm.fyaw, Math.atan2(arm.Wc.z - arm.E.z, arm.Wc.x - arm.E.x)) *
      (1 - Math.exp(-dt * 9));
  }

  /* one arm: wrist target from the fingertip target, IK, then place all the pieces */
  function poseArm(S, arm, P, sh, dt, raise, fist) {
    let ang = P.ang;
    if (raise) _s.Wt.copy(raise);
    else {
      ang =
        S.contactTarget && arm === S.arm[0]
          ? P.ang
          : arm.fyaw + cl(angDiff(arm.fyaw, P.ang), -1.0, 1.0);
      arm.pitch +=
        (cl(arm.lastDy * 0.4, -0.3, 0.4) - arm.pitch) * Math.min(1, dt * 8);
      tipOffset(P, arm, ang, arm.pitch, _s.off);
      _s.Wt.set(P.tx - _s.off.x, P.ty - _s.off.y, P.tz - _s.off.z);
      handKeep(_s.Wt, ang, arm.pitch, P, arm);
    }
    solveArm(S, arm, sh, _s.Wt, dt);
    const E = arm.E,
      Wc = arm.Wc,
      se = _s.a.copy(E).sub(sh).multiplyScalar(0.62).add(sh);
    place(arm.sleeve, sh, se);
    place(arm.upper, se, E);
    place(arm.fore, E, Wc);
    arm.shoulder.position.copy(sh);
    arm.elbow.position.copy(E);
    arm.wrist.position.copy(Wc);
    arm.hand.group.position.copy(Wc);
    if (raise)
      arm.hand.group.rotation.set(
        0,
        (S.side * Math.PI) / 2,
        Math.PI / 2 - 0.15,
      );
    else arm.hand.group.rotation.set(0, -ang, arm.pitch);
    const f = fist || 0;
    poseHand(
      arm.hand,
      Math.max(P.curl, f * 1.1),
      Math.max(cl(0.28 + P.curl * 0.95, 0.28, 1.2), f * 1.2),
      cl(0.25 + P.curl * 0.45, 0.2, 0.85),
    );
    // World-space center of the finger pad, computed from the rendered skeleton.
    arm.hand.group.updateMatrixWorld(true);
    arm.hand.tipMarker.getWorldPosition(arm.tip);
  }
  function shoulderAt(S, sx, lam, scoot, out) {
    out
      .set(0, HIP.y + SH.y * Math.cos(lam), 0)
      .addScaledVector(S.right, sx * SH.x)
      .addScaledVector(S.fwd, SH.y * Math.sin(lam) - HIP.z);
    out.z += S.side * (SEAT - scoot);
    return out;
  }

  /* ------------------------------------------------------------ per frame */
  const _sh = [new T.Vector3(), new T.Vector3()],
    _rs = [new T.Vector3(), new T.Vector3()],
    _hp = new T.Vector3(),
    _lv = new T.Vector3(),
    _tg = new T.Vector3();
  function updateStudent(S, dt, time) {
    S.t += dt;
    const g = S.group;
    // hand animation: timed tweens, then the live drag goal
    S.tweens = S.tweens.filter((tw) => {
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.d),
        e = tw.key === "contact" ? 1 - Math.pow(1 - k, 3) : reachProgress(k);
      for (const p in tw.to)
        tw.obj[p] = tw.from[p] + (tw.to[p] - tw.from[p]) * e;
      if (tw.key === "reach" && "ty" in tw.to)
        tw.obj.ty += Math.sin(Math.PI * k) * 2.5;
      if (k >= 1) {
        tw.res();
        return false;
      }
      return true;
    });
    if (S.goal) {
      const k = 1 - Math.exp(-dt * 16),
        H0 = S.hand;
      for (const p in S.goal)
        H0[p] =
          p === "ang"
            ? H0.ang + angDiff(H0.ang, S.goal.ang) * k
            : H0[p] + (S.goal[p] - H0[p]) * k;
    }
    // reactions
    let jump = 0,
      headNod = 0,
      shake = 0,
      lean = 0,
      victory = false,
      rt = 0;
    if (S.react) {
      const r = S.react;
      r.t += dt;
      rt = r.t;
      const k = r.kind;
      if (k === "victory") {
        jump = Math.abs(Math.sin(rt * 7)) * 2.5;
        victory = true;
        headNod = -0.12;
      } else if (k === "happy") {
        jump = Math.abs(Math.sin(rt * 8)) * 1.0;
        headNod = Math.sin(rt * 9) * 0.08;
      } else if (k === "surprise") {
        headNod = -0.25 * Math.max(0, 1 - rt * 1.2);
        lean = -0.1 * Math.max(0, 1 - rt);
      } else if (k === "frustrated") {
        headNod = 0.3;
        shake = Math.sin(rt * 14) * 0.2 * Math.max(0, 1 - rt * 0.5);
        lean = 0.1;
      }
      if (rt > r.dur) S.react = null;
    }
    // blink + pupils + face
    S.blinkT -= dt;
    let blink = false;
    if (S.blinkT < 0) {
      blink = S.blinkT > -0.12;
      if (S.blinkT < -0.12) S.blinkT = 2 + Math.random() * 3;
    }
    let px = 0,
      py = 0;
    if (S.thinking) {
      px = Math.sin(time * 1.7 + S.idx) * 0.9;
      py = Math.sin(time * 1.1) * 0.5 - 0.3;
    } else {
      S.head.getWorldPosition(_hp);
      _lv.copy(S.look).sub(_hp);
      px = -cl(_lv.dot(S.right) / 30, -1, 1) * 0.8;
      py = cl(-_lv.y / 40, -1, 1) * 0.6;
    }
    if (
      blink !== S.blink ||
      Math.abs(px - S.px) > 0.2 ||
      Math.abs(py - S.py) > 0.2 ||
      S.emoDrawn !== S.emo
    ) {
      S.blink = blink;
      S.px = px;
      S.py = py;
      S.emoDrawn = S.emo;
      S.draw();
    }
    if (S.emoT > 0) {
      S.emoT -= dt;
      if (S.emoT <= 0) S.emo = "neutral";
    }
    // Thinking is expressed by a subtle hand motion in the lap, not a second
    // arm suddenly swinging across the board while the other arm is playing.
    if (S.leftState !== "lap") {
      S.begin("l");
      S.leftState = "lap";
      Object.assign(S.lhand, S.lapPose(-1));
    }
    const P0 = Object.assign({}, S.hand),
      P1 = Object.assign({}, S.lhand);
    if (S.thinking) {
      P1.ty += Math.sin(time * 3) * 0.35;
      P1.curl += 0.06 * (1 + Math.sin(time * 4));
    }
    // lean / scoot: lean far enough forward (and slide the chair a little) that the playing hand can reach its target
    let wantLam = SLOUCH,
      wantScoot = 0;
    if (!victory) {
      const anticipated = S.contactTarget
        ? {
            ...P0,
            tx: S.contactTarget.x,
            ty: S.contactTarget.y,
            tz: S.contactTarget.z,
          }
        : P0;
      const act = [
        [anticipated, S.arm[0]],
        [P1, S.arm[1]],
      ].filter((q) => Math.abs(q[0].tz) < 53 && q[0].ty > -5 && q[0].ty < 13); // never lean forward for a hand resting in the lap
      if (act.length) {
        const tg = act.map((q) => {
          const o = _s.off;
          tipOffset(q[0], q[1], q[0].ang, q[1].pitch, o);
          return [
            q[1],
            new T.Vector3(q[0].tx - o.x, q[0].ty - o.y, q[0].tz - o.z),
          ];
        });
        for (const lam of LEAN_STEPS) {
          const sc = SCOOT_MAX * cl((lam - 0.14) / 0.16, 0, 1);
          wantLam = lam;
          wantScoot = sc;
          let ok = true;
          for (const q of tg)
            if (
              shoulderAt(S, q[0].sx, lam, sc, _tg).distanceTo(q[1]) > REACH_OK
            ) {
              ok = false;
              break;
            }
          if (ok) break;
        }
      }
    }
    // Faster settling into the pose while a shot is being aligned. Previously
    // contact could be requested before shoulder movement finished.
    const reaching = !!S.contactTarget;
    const poseRate = reaching ? 8 : 4;
    S.lean += (wantLam - S.lean) * (1 - Math.exp(-dt * poseRate));
    S.scoot += (wantScoot - S.scoot) * (1 - Math.exp(-dt * poseRate));
    const breathe = Math.sin(time * 1.5 + S.idx * 2) * 0.01,
      sway = Math.sin(time * 0.45 + S.idx * 1.7);
    const totalLean = cl(S.lean + lean + breathe, -0.15, 0.36);
    S.torso.rotation.set(
      -totalLean,
      sway * 0.03,
      Math.sin(time * 0.37 + S.idx) * 0.012,
    );
    S.torso.position.y = HIP.y + jump;
    g.position.z = S.side * (SEAT - S.scoot);
    g.updateMatrixWorld(true);
    S.invT.copy(S.torso.matrixWorld).invert();
    // head follows the look target; the torso lean is compensated so the eyes stay on it
    S.head.getWorldPosition(_hp);
    const tgt = S.thinking
      ? _tg.set(S.look.x + Math.sin(time * 0.9) * 20, S.look.y, S.look.z)
      : S.look;
    _lv.copy(tgt).sub(_hp);
    const f = _lv.dot(S.fwd),
      r = _lv.dot(S.right),
      yaw = Math.atan2(r, Math.max(1, f)),
      pitch = Math.atan2(_lv.y, Math.hypot(f, r));
    S.head.rotation.y +=
      (-cl(yaw, -0.9, 0.9) * 0.85 + shake - S.head.rotation.y) *
      Math.min(1, dt * 7);
    S.head.rotation.x +=
      (cl(pitch * 0.85 + totalLean, -0.45, 0.5) +
        headNod +
        (S.thinking ? 0.1 * Math.sin(time * 1.3) : 0) -
        S.head.rotation.x) *
      Math.min(1, dt * 7);
    S.head.rotation.z +=
      (Math.sin(time * 0.6 + S.idx) * 0.03 +
        (S.emo === "think" ? 0.07 : 0) -
        S.head.rotation.z) *
      Math.min(1, dt * 4);
    // arms
    S.torso.localToWorld(_sh[0].set(SH.x, SH.y, 0));
    S.torso.localToWorld(_sh[1].set(-SH.x, SH.y, 0));
    for (let i = 0; i < 2; i++) {
      const arm = S.arm[i],
        P = i ? P1 : P0;
      if (victory) {
        const bob = Math.sin(rt * 7 + i) * 3;
        _rs[i]
          .copy(_sh[i])
          .addScaledVector(S.right, arm.sx * 5)
          .addScaledVector(S.fwd, 7);
        _rs[i].y += 40 + bob;
        poseArm(S, arm, P, _sh[i], dt, _rs[i], 1);
      } else poseArm(S, arm, P, _sh[i], dt, null, 0);
    }
  }

  return { makeStudent };
}
