import { buildMatadorHighSchool } from "./matador-high-school.js";
import { buildMatadorSmoothy } from "./matador-smoothy.js";
import { buildStandardPen } from "./standard-pen.js";
import { disposeObjectTree, release } from "../../../game/scene/dispose.js";

// A small convex cross-section makes rolled cap/clip support exact without
// walking every model vertex on every animation frame.
function crossSectionHull(points) {
  points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (a, b, c) =>
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const half = (values) => {
    const hull = [];
    for (const point of values) {
      while (hull.length > 1 && cross(hull.at(-2), hull.at(-1), point) <= 0)
        hull.pop();
      hull.push(point);
    }
    return hull.slice(0, -1);
  };
  return [...half(points), ...half([...points].reverse())];
}
/* Pen feature: meshes, materials, and snapshots rendered from physics state. */
export function createPenFeature(deps, matadorTemplate) {
  const { THREE: T, PF, W, H, cvs, ctex, M } = deps;
  const shared = {};
  const tipAxis = new T.Vector3();
  const yawRotation = new T.Quaternion();
  const up = new T.Vector3(0, 1, 0);
  const PEN_STYLE = {
    ball: {
      body: { c: 0x2350d8, r: 0.35, m: 0.0 },
      cap: 0xf1f1ec,
      grip: 0x16328f,
    },
    gel: {
      body: { c: 0x0fa3c8, r: 0.25, m: 0.0 },
      cap: 0x2b2f36,
      grip: 0x1c2026,
    },
    heavy: {
      body: { c: 0x30323a, r: 0.35, m: 0.85 },
      cap: 0x1a1b1f,
      grip: 0xb8892b,
    },
    premium: {
      body: { c: 0x131316, r: 0.22, m: 0.7 },
      cap: 0xb8892b,
      grip: 0xd9d9de,
    },
    matador_hs: {
      body: { c: 0x00e35b, r: 0.28, m: 0.06 },
      cap: 0xf5f5f7,
      grip: 0xf3cd60,
    },
    matador_smoothy: {
      body: { c: 0xefc8cf, r: 0.62, m: 0.02 },
      cap: 0xefc8cf,
      grip: 0xffffff,
    },
  };
  function hexInt(v, fb) {
    if (typeof v === "number") return v;
    if (typeof v === "string" && /^#?[0-9a-f]{6}$/i.test(v))
      return parseInt(v.replace("#", ""), 16);
    return fb || 0xffffff;
  }
  function labelTex(text, fg, bg) {
    const key = [text, fg, bg || ""].join("|");
    shared.penLabels = shared.penLabels || {};
    if (shared.penLabels[key]) return shared.penLabels[key];
    const c = cvs(512, 96),
      x = c.getContext("2d");
    x.clearRect(0, 0, c.width, c.height);
    if (bg) {
      x.fillStyle = bg;
      x.fillRect(0, 0, c.width, c.height);
    }
    x.fillStyle = fg || "#111";
    x.font = "700 44px Arial, sans-serif";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(text, c.width / 2, c.height / 2 + 2);
    const tex = ctex(c);
    tex.needsUpdate = true;
    shared.penLabels[key] = tex;
    return tex;
  }
  function addLabel(g, txt, x0, y0, z0, w, h, fg, bg) {
    const m = new T.Mesh(
      new T.PlaneGeometry(w, h),
      new T.MeshBasicMaterial({
        map: labelTex(txt, fg, bg),
        transparent: true,
        depthWrite: false,
      }),
    );
    m.position.set(x0, y0, z0);
    g.add(m);
    return m;
  }
  function penModel(type, tint, customColor) {
    const P = PF.PENS[type],
      S = PEN_STYLE[type],
      L = P.len,
      r = P.r,
      g = new T.Group();
    const chosen = customColor ? hexInt(customColor, S.body.c) : S.body.c;
    const bodyM =
      type === "matador_smoothy" || type === "matador_hs"
        ? null
        : new T.MeshStandardMaterial({
            color: chosen,
            roughness: S.body.r,
            metalness: S.body.m,
            transparent: S.body.a != null,
            opacity: S.body.a || 1,
            envMapIntensity: 1,
          });
    const addBand = !customColor && tint;
    const builders = {
      matador_hs: buildMatadorHighSchool,
      matador_smoothy: buildMatadorSmoothy,
    };
    const builder = builders[type] || buildStandardPen;
    builder({
      T,
      M,
      P,
      S,
      L,
      r,
      g,
      chosen,
      addBand,
      tint,
      addLabel,
      type,
      bodyM,
      template: matadorTemplate,
    });
    // Keep the original model proportions. Its lowest cap/clip vertex sets
    // resting height, including when rolled before tipping about an edge.
    g.updateMatrixWorld(true);
    const vertex = new T.Vector3();
    const crossSection = [];
    g.traverse((mesh) => {
      if (!mesh.isMesh) return;
      const vertices = mesh.geometry.attributes.position;
      for (let i = 0; i < vertices.count; i++) {
        vertex.fromBufferAttribute(vertices, i).applyMatrix4(mesh.matrixWorld);
        crossSection.push([vertex.y, vertex.z]);
      }
    });
    g.userData.supportHull = crossSectionHull(crossSection);
    g.traverse((o) => {
      if (o.isMesh) {
        const materials = Array.isArray(o.material) ? o.material : [o.material];
        o.castShadow = materials.some((material) => !material.transparent);
      }
    });
    return g;
  }
  function makePen(i) {
    const group = new T.Group(),
      holder = new T.Group();
    group.add(holder);
    const sh = new T.Mesh(
      new T.PlaneGeometry(1, 1),
      new T.MeshBasicMaterial({
        map: blobTex(),
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      }),
    );
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = 0.05;
    sh.renderOrder = 1;
    group.add(sh);
    return { group, holder, shadow: sh, model: null, type: null, i };
  }
  function blobTex() {
    if (shared.blob) return shared.blob;
    const c = cvs(64, 32),
      g = c.getContext("2d"),
      gr = g.createRadialGradient(32, 16, 1, 32, 16, 30);
    gr.addColorStop(0, "rgba(0,0,0,.9)");
    gr.addColorStop(1, "rgba(0,0,0,0)");
    g.save();
    g.scale(1, 0.5);
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    g.restore();
    return (shared.blob = new T.CanvasTexture(c));
  }
  function setPenType(p, type, customColor) {
    if (p.type === type && p.customColor === (customColor || null)) return;
    const i = p.i;
    if (p.model) {
      p.holder.remove(p.model);
      disposeObjectTree(p.model, p.type === "matador_hs");
    }
    p.model = penModel(
      type,
      customColor ? null : i === 1 ? 0xd33a3a : 0x1f9a4a,
      customColor,
    );
    p.holder.add(p.model);
    p.type = type;
    p.customColor = customColor || null;
    p.model.position.y = PF.PENS[type].r;
    p.shadow.scale.set(PF.PENS[type].len * 1.1, 4, 1);
  }
  /* Put pen mesh at a physics snapshot entry {x,y,a,z,out,outT} */
  function setPen(p, s, t, scale) {
    p.group.position.set(s.x - W / 2, s.z || 0, s.y - H / 2);
    yawRotation.setFromAxisAngle(up, -s.a);
    if (s.out && s.tipAngle) {
      tipAxis.set(s.tipNY, 0, -s.tipNX);
      p.holder.quaternion
        .setFromAxisAngle(tipAxis, s.tipAngle)
        .multiply(yawRotation);
    } else p.holder.quaternion.copy(yawRotation);
    if (p.model) {
      const roll = s.roll || 0,
        ca = Math.cos(roll),
        sa = Math.sin(roll);
      p.model.rotation.x = roll;
      let height = -Infinity;
      for (const [y, z] of p.model.userData.supportHull)
        height = Math.max(height, -y * ca + z * sa);
      p.model.position.y = height;
    }
    p.group.scale.setScalar(scale == null ? 1 : scale);
    p.shadow.visible = !s.out || (s.z || 0) > -2;
    p.shadow.rotation.z = s.a;
    p.shadow.material.opacity = 0.35;
  }
  return {
    makePen,
    setPenType,
    setPen,
    dispose() {
      if (shared.blob) release(shared.blob);
      Object.values(shared.penLabels || {}).forEach(release);
    },
  };
}
