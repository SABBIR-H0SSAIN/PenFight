/** Articulated fingers, thumb, and fingertip position used by arm IK. */
export function createHandBuilder({ T, PALM, FING, FJ }) {
  function makeHand(skin, left) {
    const g = new T.Group(),
      m = left ? -1 : 1,
      HD = { group: g, fing: {} };
    g.rotation.order = "YZX";
    const palm = new T.Mesh(new T.SphereGeometry(1, 18, 14), skin);
    palm.scale.set(5.2, 1.45, 4.6);
    palm.position.set(5.0, 0, 0);
    g.add(palm);
    const heel = new T.Mesh(new T.SphereGeometry(1, 14, 10), skin);
    heel.scale.set(3.0, 1.55, 3.7);
    heel.position.set(1.8, -0.05, 0);
    g.add(heel);
    const nailM = skin.clone();
    nailM.color.lerp(new T.Color(0xffffff), 0.16);
    nailM.roughness = 0.7;
    const finger = (name, lens, z, r0, yaw) => {
      const pivot = new T.Group();
      pivot.position.set(PALM - 0.4, -0.05, z * m);
      pivot.rotation.y = yaw * m;
      g.add(pivot);
      const segs = [];
      let parent = pivot;
      for (let i = 0; i < 3; i++) {
        const l = lens[i],
          ra = r0 * (1 - i * 0.11),
          rb = r0 * (1 - (i + 1) * 0.11),
          j = new T.Group();
        if (i > 0) j.position.x = lens[i - 1];
        parent.add(j);
        const cyl = new T.Mesh(new T.CylinderGeometry(rb, ra, l, 18), skin);
        cyl.rotation.z = -Math.PI / 2;
        cyl.position.x = l / 2;
        j.add(cyl);
        j.add(new T.Mesh(new T.SphereGeometry(ra, 18, 12), skin));
        if (i === 2) {
          const tip = new T.Mesh(new T.SphereGeometry(rb, 18, 12), skin);
          tip.position.x = l;
          j.add(tip);
          const nail = new T.Mesh(new T.SphereGeometry(1, 16, 12), nailM);
          nail.scale.set(l * 0.34, 0.13, rb * 0.68);
          nail.position.set(l * 0.6, rb * 0.82, 0);
          j.add(nail);
        }
        segs.push(j);
        parent = j;
      }
      HD.fing[name] = segs;
    };
    finger("idx", FING.idx, -2.9, 0.95, 0.05);
    finger("mid", FING.mid, -1.0, 1.0, 0.0);
    finger("ring", FING.ring, 0.9, 0.92, -0.05);
    finger("pink", FING.pink, 2.7, 0.8, -0.11);
    HD.tipMarker = new T.Object3D();
    HD.tipMarker.position.set(FING.idx[2], -0.68, 0);
    HD.fing.idx[2].add(HD.tipMarker);
    const tp = new T.Group();
    tp.position.set(2.4, -0.3, -3.6 * m);
    tp.rotation.order = "XYZ";
    tp.rotation.y = 0.62 * m;
    tp.rotation.z = -0.18;
    g.add(tp);
    const tl = [3.6, 2.9],
      tsegs = [];
    let par = tp;
    for (let i = 0; i < 2; i++) {
      const l = tl[i],
        ra = 1.2 - i * 0.12,
        rb = 1.2 - (i + 1) * 0.12,
        j = new T.Group();
      if (i > 0) j.position.x = tl[0];
      par.add(j);
      const cyl = new T.Mesh(new T.CylinderGeometry(rb, ra, l, 18), skin);
      cyl.rotation.z = -Math.PI / 2;
      cyl.position.x = l / 2;
      j.add(cyl);
      j.add(new T.Mesh(new T.SphereGeometry(ra, 18, 12), skin));
      if (i === 1) {
        const tip = new T.Mesh(new T.SphereGeometry(rb, 18, 12), skin);
        tip.position.x = l;
        j.add(tip);
      }
      tsegs.push(j);
      par = j;
    }
    HD.fing.thumb = tsegs;
    g.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return HD;
  }
  function poseHand(HD, idx, rest, thumb) {
    const set = (segs, c) => {
      for (let i = 0; i < 3; i++) segs[i].rotation.z = -c * FJ[i];
    };
    set(HD.fing.idx, idx);
    set(HD.fing.mid, rest);
    set(HD.fing.ring, rest * 1.05);
    set(HD.fing.pink, rest * 1.1);
    HD.fing.thumb[0].rotation.z = -thumb * 0.5;
    HD.fing.thumb[1].rotation.z = -thumb * 0.7;
  }
  function fingerTip(curl, sx) {
    let x = 0,
      y = 0,
      ph = 0;
    for (let i = 0; i < 3; i++) {
      ph += curl * FJ[i];
      x += FING.idx[i] * Math.cos(ph);
      y -= FING.idx[i] * Math.sin(ph);
    }
    x -= 0.68 * Math.sin(ph);
    y -= 0.68 * Math.cos(ph);
    const yaw = 0.05 * sx;
    return {
      x: PALM - 0.4 + x * Math.cos(yaw),
      y: y - 0.05,
      z: -2.9 * sx - x * Math.sin(yaw),
    };
  }
  return { makeHand, poseHand, fingerTip };
}
