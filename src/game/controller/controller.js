import { gameConfig, CONFIG_LIMITS } from "../../config/config.ts";
import {
  impactPlaybackRate,
  replayWindow,
  interpolateRecording,
} from "./playback.js";
import { handAngle } from "@/features/character/motion.js";
import * as THREE from "three";
import { createScope } from "./scope.js";
import { buildMatchOptions, penColorFor } from "./modes.js";
import { createBenchmarkRunner } from "@/game/ai/benchmark.js";
import { roundOutcome } from "../physics/outcome.js";
import {
  CAMERA_PRESETS,
  cameraAngle,
  deskCamera,
  deskFov,
  interpolateOrbit,
  overviewCamera,
} from "./camera.js";

export function createController({
  engine: PF,
  world: World,
  sound: Snd,
  canvas,
  ui,
}) {
  const V3 = THREE.Vector3,
    clamp = PF.clamp,
    scope = createScope();
  let disposed = false,
    labDirty = true,
    hintRequest = 0;
  const benchmark = createBenchmarkRunner(PF, ui);
  const size = { width: 1, height: 1 };
  function viewport() {
    if (canvas.clientWidth > 0 && canvas.clientHeight > 0) {
      size.width = canvas.clientWidth;
      size.height = canvas.clientHeight;
    }
    return size;
  }
  const isMobile =
    /Android|iPhone|iPad|Mobi/i.test(navigator.userAgent) ||
    Math.min(viewport().width, viewport().height) <
      gameConfig.graphics.mobileBreakpoint;
  const G = {
    mode: "menu",
    token: 0,
    paused: false,
    state: null,
    scores: [0, 0],
    round: 1,
    goal: gameConfig.matches.versusGoal,
    names: ["Sabbir", "Bunty"],
    pens: [
      ui.get().preferences.pvp.pen1.pen,
      ui.get().preferences.pvp.pen2.pen,
    ],
    ai: [null, null],
    humans: [true, false],
    play: null,
    input: null,
    timers: [],
    speed: 1,
    shake: 0,
    camMode: "menu",
    surge: false,
    labOpen: false,
    live: null,
    hint: null,
    series: [0, 0],
    viewSide: 0,
    replaying: false,
    cameraDrag: null,
    touches: new Map(),
    pinch: null,
    gestureBlocked: false,
    nativePinchZoom: null,
    manualCamera: false,
  };
  const playRng = PF.rng(Date.now() & 0xffff);
  let clock = 0,
    last = performance.now();

  /* ---------------------------------------------------------------- world */
  const cam = World.camera,
    students = World.students;
  let SET = ui.get().settings,
    settingsApplied = false;
  function applySettings() {
    const next = ui.get().settings,
      qualityChanged = !settingsApplied || next.quality !== SET.quality;
    if (next.follow && !SET.follow && !ui.get().cameraPinned)
      G.manualCamera = false;
    SET = next;
    settingsApplied = true;
    Snd.setVolume(SET.vol);
    Snd.setAmbience(SET.amb);
    PF.setRealism(SET.real);
    PF.setFriction(SET.friction);
    if (
      G.mode !== "menu" &&
      !G.play?.replay &&
      !["react", "replay"].includes(G.camMode)
    )
      G.camMode = SET.follow ? "follow" : "game";
    const quality =
      SET.quality === "auto"
        ? isMobile
          ? gameConfig.graphics.autoMobile
          : gameConfig.graphics.autoDesktop
        : SET.quality;
    if (qualityChanged && World.quality !== quality) World.setQuality(quality);
  }
  applySettings();
  const unsubscribe = ui.subscribe(() => {
    if (SET !== ui.get().settings) applySettings();
  });
  let renderWidth = 0,
    renderHeight = 0,
    cameraReady = false;
  function resize() {
    if (canvas.clientWidth <= 0 || canvas.clientHeight <= 0) return;
    const size = viewport();
    if (size.width === renderWidth && size.height === renderHeight) return;
    cancelAim();
    cancelCameraDrag();
    cancelTouchGesture();
    if (
      cameraReady &&
      !ui.get().cameraPinned &&
      C.angle.preset === "overview"
    ) {
      C.angle = {
        ...overviewCamera(size.width / size.height),
        zoom: C.angle.zoom,
      };
      C.pending = true;
    }
    World.resize(size.width, size.height);
    if (cameraReady && ui.get().cameraPinned && C.pinnedDeskView)
      C.fov = deskFov(C.pos, C.look, size.width / size.height);
    renderWidth = size.width;
    renderHeight = size.height;
  }
  scope.listen(window, "resize", resize);
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  if (document.fonts?.load)
    document.fonts.load("30px 'Patrick Hand'").then(() => {
      if (!disposed) World.drawBoard();
    });

  /* --------------------------------------------------------------- timing */
  function sleepRaw(s) {
    return new Promise((res) => G.timers.push({ t: s, res }));
  }
  function chk(tok) {
    if (tok !== G.token) throw new Error("cancel");
  }
  const nextFrame = () => scope.nextFrame();
  function cancelAll() {
    cancelCameraDrag();
    cancelTouchGesture();
    G.token++;
    Snd.reset();
    clearHint();
    G.timers.splice(0).forEach((t) => t.res());
    if (G.input) {
      if (G.input.active) {
        G.input.active = false;
        releasePointer(G.input);
      }
      const r = G.input.res;
      G.input = null;
      r(null);
    }
    students.forEach((s) => s.reset());
    G.play?.onEnd?.(true);
    G.play = null;
    G.replaying = false;
    ui.set({ replaying: false, hintReady: false });
    World.showAim(0, 0, 0, 0, false);
    World.showHints(null);
  }
  async function wait(s) {
    const tok = G.token;
    await sleepRaw(s);
    chk(tok);
  }

  /* --------------------------------------------------------------- camera */
  const C = {
    pos: new V3(0, 140, 120),
    look: new V3(0, 0, 0),
    fov: 42,
    zoom: 1,
    orbit: 0,
    followDir: new V3(0, 0, 1),
    focus: new V3(),
    t: 0,
    who: 0,
    targetPosition: new V3(),
    targetLook: new V3(),
    angle: ui.get().camera,
    pending: false,
    directTime: 0,
    pinnedDeskView: false,
  };
  cameraReady = true;
  function gameCam(tp, tl) {
    const size = viewport();
    return deskCamera(C.angle, size.width / size.height, tp, tl);
  }
  function canUseCameraControls() {
    return (
      !disposed &&
      G.mode !== "menu" &&
      !G.paused &&
      !ui.get().end &&
      !ui.get().menuVisible &&
      !G.input?.active
    );
  }
  function canAdjustCamera() {
    return canUseCameraControls() && !ui.get().cameraPinned;
  }
  function setCameraPinned(pinned) {
    if (
      typeof pinned !== "boolean" ||
      !canUseCameraControls() ||
      ui.get().cameraPinned === pinned
    )
      return;
    cancelCameraDrag();
    cancelTouchGesture();
    if (pinned) {
      C.pinnedDeskView = G.manualCamera || G.camMode === "game";
      G.manualCamera = true;
      G.camMode = "game";
      G.shake = 0;
    } else {
      G.manualCamera = !SET.follow;
      G.camMode = SET.follow ? "follow" : "game";
    }
    ui.set({
      cameraPinned: pinned,
      ...(pinned && SET.follow ? { settings: { ...SET, follow: false } } : {}),
    });
  }
  function setCameraAngle(
    azimuth,
    elevation,
    preset = "custom",
    direct = true,
    zoom = C.angle.zoom,
  ) {
    if (
      !canAdjustCamera() ||
      !Number.isFinite(azimuth) ||
      !Number.isFinite(elevation) ||
      !Number.isFinite(zoom)
    )
      return;
    const angle = cameraAngle(azimuth, elevation, preset, zoom);
    if (
      C.angle.azimuth === angle.azimuth &&
      C.angle.elevation === angle.elevation &&
      C.angle.zoom === angle.zoom &&
      C.angle.preset === angle.preset &&
      G.manualCamera
    )
      return;
    C.angle = angle;
    C.pending = true;
    C.directTime = direct ? 0.18 : 0;
    G.manualCamera = true;
    G.camMode = "game";
    if (SET.follow) ui.set({ settings: { ...SET, follow: false } });
  }
  function publishCamera() {
    if (disposed || !C.pending) return;
    C.pending = false;
    ui.set({ camera: C.angle });
  }
  function cancelCameraDrag(event, keepCapture = false) {
    const drag = G.cameraDrag;
    if (!drag || (event && event.pointerId !== drag.pid)) return;
    G.cameraDrag = null;
    publishCamera();
    if (!keepCapture) releasePointer(drag);
  }
  function penWorld(i) {
    const f = G.curFrame ? G.curFrame.p[i] : G.state && G.state.pens[i];
    return f ? new V3(f.x - 30, 0.8, f.y - 50) : new V3();
  }
  function updateCamera(dt) {
    const tp = C.targetPosition,
      tl = C.targetLook,
      pinned = ui.get().cameraPinned && G.mode !== "menu";
    let tf = 42,
      k = C.directTime > 0 ? 24 : 6.5,
      m = G.manualCamera && G.mode !== "menu" ? "game" : G.camMode;
    if (m === "game" && SET.follow && !G.manualCamera && G.state) m = "follow";
    if (pinned) {
      // Retain the exact rendered pose, even halfway through an animation.
      m = "pinned";
      tf = C.fov;
      G.shake = 0;
    } else if (m === "menu") {
      const t = clock * 0.1;
      tl.set(0, 4, -6);
      tp.set(Math.sin(t) * 120, 70, Math.cos(t) * 120 * 0.8 + 20);
      tf = 40;
      k = 1.5;
    } else if (m === "follow" && G.state) {
      const who = G.play?.who ?? G.state.turn,
        p = penWorld(who),
        q = G.play?.rec && G.play.frameVel;
      if (q) {
        const sp = Math.hypot(q.x, q.y);
        if (sp > 20) C.followDir.lerp(new V3(q.x / sp, 0, q.y / sp), 0.1);
      }
      tl.copy(p).lerp(new V3(0, 0, 0), 0.25);
      tp.copy(p)
        .addScaledVector(C.followDir, -62)
        .add(new V3(0, 58, 0));
      tf = 42;
      k = 3;
      if (Math.abs(tp.x) > 95) tp.x = Math.sign(tp.x) * 95;
    } else if (m === "replay") {
      C.orbit += dt * 0.35;
      const f = C.focus,
        rr = 52 - Math.min(14, C.t * 3);
      tl.copy(f).add(new V3(0, 2, 0));
      tp.set(
        f.x + Math.cos(C.orbit + C.who * 3) * rr,
        26 + Math.sin(C.orbit * 0.7) * 4,
        f.z + Math.sin(C.orbit + C.who * 3) * rr,
      );
      tf = 36 - Math.min(8, C.t * 1.6);
      k = 5;
    } else if (m === "react") {
      const s = students[C.who],
        h = s.head.getWorldPosition(new V3());
      tl.copy(h);
      tp.copy(h)
        .addScaledVector(s.fwd, 92)
        .add(new V3(s.right.x * 10, 10, 0));
      tf = 32;
      k = 3.5;
    } else tf = gameCam(tp, tl);
    // Keep the projection fixed while a player is pulling back to aim.
    const e = G.input?.active || pinned ? 0 : 1 - Math.exp(-dt * k);
    C.directTime = Math.max(0, C.directTime - dt);
    const deskView = m === "game" || (m === "follow" && !G.state);
    if (deskView) interpolateOrbit(C.pos, C.look, tp, tl, e);
    else {
      C.pos.lerp(tp, e);
      C.look.lerp(tl, e);
    }
    if (deskView && !G.input?.active) {
      const size = viewport();
      C.fov = deskFov(C.pos, C.look, size.width / size.height);
    } else C.fov += (tf - C.fov) * e;
    C.zoom += ((deskView ? C.angle.zoom : 1) - C.zoom) * e;
    G.shake = Math.max(0, G.shake - dt * 2.4);
    const sh = G.input?.active || G.manualCamera ? 0 : G.shake * 1.1;
    cam.position.set(
      C.pos.x + (Math.random() - 0.5) * sh,
      C.pos.y + (Math.random() - 0.5) * sh,
      C.pos.z + (Math.random() - 0.5) * sh,
    );
    cam.lookAt(C.look);
    if (
      Math.abs(cam.fov - C.fov) > 0.01 ||
      Math.abs(cam.zoom - C.zoom) > 0.0001
    ) {
      cam.fov = C.fov;
      cam.zoom = C.zoom;
      cam.updateProjectionMatrix();
    }
    // Never remove the head to clear the view; a wider, higher camera keeps the desk playable.
    students.forEach((s) => {
      s.head.visible = true;
    });
    World.deskMesh.position.y =
      -2 + (G.shake > 0.05 ? (Math.random() - 0.5) * G.shake * 0.25 : 0);
  }

  /* ------------------------------------------------------------- playback */
  const REC = gameConfig.playback.recordInterval;
  function startPlay(res, who, opts) {
    opts = opts || {};
    return new Promise((resolve) => {
      const rec = res.rec;
      const fullDuration = rec[rec.length - 1].t;
      const range = opts.replay
        ? replayWindow(res.events, fullDuration)
        : { start: 0, end: fullDuration };
      // Landings use simulation time, so pause, replay and AI speed stay in sync.
      const events = res.events
        .flatMap((event) =>
          event.type === "out" &&
          !res.events.some((e) => e.type === "landing" && e.who === event.who)
            ? [
                event,
                {
                  ...event,
                  type: "landing",
                  t: Math.min(fullDuration, event.t + 0.38),
                },
              ]
            : event.type === "hit" ||
                event.type === "out" ||
                event.type === "landing"
              ? [event]
              : [],
        )
        .filter((event) => event.t >= range.start)
        .sort((a, b) => a.t - b.t);
      const impact =
        opts.slow !== false && SET.slowmo && !opts.replay
          ? events.find((e) => e.type === "hit" && e.speed > 90)?.t
          : null;
      G.play = {
        rec,
        who,
        t: range.start,
        dur: range.end,
        ei: 0,
        events,
        impact,
        speed: opts.speed || 1,
        replay: !!opts.replay,
        onEnd: (c) => {
          Snd.stopMotion();
          G.play = null;
          G.curFrame = null;
          resolve(c);
        },
        frameVel: null,
      };
    });
  }
  function soundPan(x, y) {
    cam.updateMatrixWorld(true);
    return clamp(new V3(x - 30, 1, y - 50).project(cam).x * 0.65, -0.8, 0.8);
  }
  function updatePlay(dt) {
    const P = G.play;
    if (!P) return;
    const sp = impactPlaybackRate(P.t, P.impact, P.speed);
    P.t = Math.min(P.dur, P.t + dt * sp);
    const fr = interpolateRecording(P.rec, P.t);
    if (!fr) return;
    G.curFrame = fr;
    P.frameVel = fr.p[P.who];
    while (P.ei < P.events.length && P.events[P.ei].t <= P.t) {
      const e = P.events[P.ei++];
      if (e.type === "hit") {
        const pen =
          G.pens.find((kind) => kind === "heavy" || kind === "premium") ||
          G.pens[P.who];
        Snd.hit(e.speed, { pen, pan: soundPan(e.x, e.y) });
        G.shake = Math.max(G.shake, clamp(e.speed / 220, 0.1, 0.8));
        const w = P.who;
        if (e.speed > 60 && !P.replay) {
          students[1 - w].react = { kind: "surprise", t: 0, dur: 1.2 };
          students[1 - w].setEmotion("surprise", 1.2);
          students[w].setEmotion("smug", 1.4);
        }
      } else if (e.type === "landing") {
        Snd.drop({ pen: G.pens[e.who], pan: soundPan(e.x, e.y) });
      }
    }
    Snd.motion(
      fr.p.map((pen, i) => ({
        speed: Math.hypot(pen.vx, pen.vy),
        out: pen.out,
        pen: G.pens[i],
        pan: soundPan(pen.x, pen.y),
      })),
    );
    for (let i = 0; i < 2; i++) {
      const s = fr.p[i];
      World.setPen(i, s, P.t);
      World.pushTrail(i, s.x, s.y, Math.hypot(s.vx, s.vy));
    }
    if (P.t >= P.dur - 1e-6) {
      World.clearTrails();
      const cb = P.onEnd;
      cb?.(false);
    }
  }

  /* ---------------------------------------------------------------- hands */
  const handFar = (S) => Math.abs(S.hand.tz) > 56 || S.hand.ty < -5;
  function angTo(cur, target) {
    let d = (target - cur) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return cur + d;
  }
  const contactOf = (pen, off) => ({
    x: pen.x + (Math.cos(pen.a) * off * pen.L) / 2,
    y: pen.y + (Math.sin(pen.a) * off * pen.L) / 2,
  });
  /* Index pad must arrive over the barrel before the physics impulse begins.
   Hold the pen stationary until the real animated pad is over it. */
  async function waitForTouch(S, contact, height, tok, limit = 0.55) {
    const arm = S.arm[0],
      x = contact.x - 30,
      z = contact.y - 50;
    let sumX = 0,
      sumY = 0,
      sumZ = 0;
    const started = clock;
    for (;;) {
      chk(tok);
      const elapsed = clock - started;
      const ex = x - arm.tip.x,
        ez = z - arm.tip.z,
        ey = height - arm.tip.y;
      if (arm.ready && Math.hypot(ex, ez) < 0.2 && Math.abs(ey) < 0.15)
        return true;
      if (elapsed >= limit) return false;
      // Calibrate small residual FK/constraint errors from the *rendered* index
      // pad; limits prevent corrections from dragging an unreachable limb away.
      if (elapsed > 0.05 && arm.ready) {
        const dx = Math.max(-0.2, Math.min(0.2, ex * 0.12));
        const dz = Math.max(-0.2, Math.min(0.2, ez * 0.12));
        const dy = Math.max(-0.13, Math.min(0.13, ey * 0.1));
        if (Math.abs(sumX + dx) < 1.6) {
          S.hand.tx += dx;
          sumX += dx;
        }
        if (Math.abs(sumZ + dz) < 1.6) {
          S.hand.tz += dz;
          sumZ += dz;
        }
        if (Math.abs(sumY + dy) < 1.0) {
          S.hand.ty += dy;
          sumY += dy;
        }
      }
      await wait(Math.min(0.025, limit - elapsed));
    }
  }
  async function flickAnim(i, act, contact, fromPull) {
    const S = students[i],
      tok = G.token,
      dx = Math.cos(act.ang),
      dz = Math.sin(act.ang),
      cx = contact.x - 30,
      cz = contact.y - 50;
    const height = 2 * PF.PENS[G.pens[i]].r + 0.22;
    const at = (back) => ({ tx: cx - dx * back, tz: cz - dz * back });
    S.contactTarget = { x: cx, y: height, z: cz };
    if (!fromPull) {
      S.thinking = false;
      S.goal = null;
      const a = handAngle(S.hand.ang, S.fa, act.ang),
        id = S.begin("r");
      const ok = await S.run(
        "r",
        [
          ...(handFar(S) ? S.liftStages("r") : []),
          [
            Object.assign({ ty: 8, curl: 0.38, ang: a }, at(2.4)),
            0.25,
            "reach",
          ],
          [Object.assign({ ty: height, curl: 0.55 }, at(0)), 0.14],
        ],
        id,
      );
      chk(tok);
      if (!ok) return;
      await waitForTouch(S, contact, height, tok, 0.16);
      Snd.tick();
      // Draw the fingertip back along the actual release vector, not through
      // the barrel, before driving it forward again to the physical contact.
      await S.to(
        Object.assign(
          { curl: 0.94, ty: height + 0.12 },
          at(1.8 + act.pow * 4.5),
        ),
        0.1 + act.pow * 0.08,
      );
      chk(tok);
    } else {
      if (S.grabP) await S.grabP;
      chk(tok);
      S.goal = null;
      await S.to(
        Object.assign(
          {
            curl: 0.94,
            ty: height + 0.12,
            ang: handAngle(S.hand.ang, S.fa, act.ang),
          },
          at(1.8 + act.pow * 4.5),
        ),
        0.12,
      );
      chk(tok);
    }
    // Do not drive the index finger beyond the physical pen before applying
    // the impulse: earlier code passed 2.6 cm THROUGH the barrel in 70 ms.
    await S.to(
      Object.assign({ curl: 0.62, ty: height }, at(0)),
      0.075 + act.pow * 0.03,
      "contact",
    );
    chk(tok);
    await waitForTouch(S, contact, height, tok);
  }
  /* pull the playing hand back to the lap right away, so it is never over the table while the pen slides */
  function retract(i) {
    const S = students[i];
    S.goal = null;
    S.grabP = null;
    S.contactTarget = null;
    const id = S.begin("r");
    return S.run("r", S.dropStages("r"), id);
  }

  /* ------------------------------------------------------------- shooting */
  async function executeShot(who, act, contact, fromPull) {
    const tok = G.token,
      st = G.state;
    await flickAnim(who, act, contact, fromPull);
    chk(tok);
    Snd.flick(act.pow, {
      pen: G.pens[who],
      pan: soundPan(contact.x, contact.y),
    });
    const res = PF.shoot(st.pens, who, act, {
      record: REC,
      afterOut: 0.45,
      maxT: gameConfig.physics.gameplaySimulationSeconds,
    });
    // A short vertical follow-through clears the pen instead of crossing its
    // barrel, then the arm returns to the lap while the result animates.
    const movingHand = students[who],
      followToken = G.token;
    movingHand.goal = null;
    movingHand.grabP = null;
    movingHand.contactTarget = null;
    movingHand.to({ ty: movingHand.hand.ty + 5, curl: 0.27 }, 0.11).then(() => {
      if (!disposed && G.token === followToken) retract(who);
    });
    G.lastRes = { res, who, act };
    G.camMode = SET.follow ? "follow" : "game";
    await startPlay(res, who);
    chk(tok);
    if (G.camMode === "follow") G.camMode = "game";
    return res;
  }
  function surgeAvail(i) {
    return G.state && G.state.surge[i];
  }

  /* ---------------------------------------------------------------- input */
  const ray = new THREE.Raycaster(),
    ndc = new THREE.Vector2(),
    plane = new THREE.Plane(new V3(0, 1, 0), 0);
  function pointerTable(e) {
    const r = canvas.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return null;
    ndc.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      (-(e.clientY - r.top) / r.height) * 2 + 1,
    );
    cam.updateMatrixWorld(true);
    ray.setFromCamera(ndc, cam);
    const p = new V3();
    return ray.ray.intersectPlane(plane, p)
      ? { x: p.x + 30, y: p.z + 50 }
      : null;
  }
  function humanAim(who) {
    return new Promise((res) => {
      clearHint();
      G.input = { res, active: false, who: who || 0 };
      showBanner(null);
      ui.set({
        hintAvailable: false,
        hintReady: G.mode === "train" && who === 0,
      });
    });
  }
  function screenPenHit(event) {
    if (!G.state) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    cam.updateMatrixWorld(true);
    const project = (x, y, z) => {
      const p = new V3(x - 30, y, z - 50).project(cam);
      return {
        x: rect.left + ((p.x + 1) * rect.width) / 2,
        y: rect.top + ((1 - p.y) * rect.height) / 2,
        depth: p.z,
      };
    };
    let hit = null;
    G.state.pens.forEach((base, who) => {
      const pen = G.curFrame?.p[who] || base;
      if (pen.out) return;
      const r = PF.PENS[G.pens[who]].r,
        ax = Math.cos(pen.a),
        ay = Math.sin(pen.a);
      const start = project(
        pen.x - (ax * base.L) / 2,
        (pen.z || 0) + r,
        pen.y - (ay * base.L) / 2,
      );
      const end = project(
        pen.x + (ax * base.L) / 2,
        (pen.z || 0) + r,
        pen.y + (ay * base.L) / 2,
      );
      if (
        start.depth < -1 ||
        start.depth > 1 ||
        end.depth < -1 ||
        end.depth > 1
      )
        return;
      const dx = end.x - start.x,
        dy = end.y - start.y;
      const t = clamp(
        ((event.clientX - start.x) * dx + (event.clientY - start.y) * dy) /
          Math.max(1e-6, dx * dx + dy * dy),
        0,
        1,
      );
      const distance = Math.hypot(
        event.clientX - start.x - dx * t,
        event.clientY - start.y - dy * t,
      );
      const center = project(pen.x, (pen.z || 0) + r, pen.y);
      const side = project(pen.x - ay * r, (pen.z || 0) + r, pen.y + ax * r);
      const radius =
        (event.pointerType === "touch"
          ? gameConfig.input.penSafetyTouch
          : gameConfig.input.penSafetyMouse) +
        Math.hypot(side.x - center.x, side.y - center.y);
      if (distance <= radius && (!hit || distance < hit.distance))
        hit = { who, distance };
    });
    return hit;
  }
  function cancelTouchGesture() {
    const ids = [...G.touches.keys()];
    G.touches.clear();
    G.pinch = null;
    G.gestureBlocked = false;
    G.nativePinchZoom = null;
    ids.forEach((pid) => releasePointer({ pid }));
  }
  function touchPair() {
    return [...G.touches.values()].slice(0, 2);
  }
  function startPinch() {
    const [a, b] = touchPair();
    if (!a || !b) return;
    cancelAim(null, G.touches.has(G.input?.pid));
    cancelCameraDrag(null, G.touches.has(G.cameraDrag?.pid));
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    G.gestureBlocked = true;
    G.pinch =
      distance >= gameConfig.input.pinchMinDistance
        ? { distance, zoom: C.angle.zoom }
        : null;
  }
  function zoomGesture(zoom) {
    if (!Number.isFinite(zoom)) return;
    setCameraAngle(
      C.angle.azimuth,
      C.angle.elevation,
      C.angle.preset,
      true,
      zoom,
    );
    publishCamera();
  }
  function finishTouch(event) {
    if (!G.touches.has(event.pointerId)) return;
    G.touches.delete(event.pointerId);
    if (G.pinch) {
      G.pinch = null;
      G.gestureBlocked = true;
    }
    if (G.touches.size === 0) G.gestureBlocked = false;
    const owned =
      (G.input?.active && G.input.pid === event.pointerId) ||
      G.cameraDrag?.pid === event.pointerId;
    if (!owned) releasePointer({ pid: event.pointerId });
  }
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
    scope.listen(canvas, type, finishTouch);
  scope.listen(canvas, "pointerdown", (e) => {
    Snd.init();
    if (e.pointerType === "touch") {
      if (
        disposed ||
        G.mode === "menu" ||
        G.paused ||
        ui.get().end ||
        ui.get().menuVisible
      )
        return;
      if (!G.touches.has(e.pointerId) && G.touches.size >= 2) {
        e.preventDefault();
        return;
      }
      G.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {}
      if (G.touches.size >= 2) {
        if (!G.pinch) startPinch();
        e.preventDefault();
        return;
      }
      if (G.gestureBlocked) return;
    }
    if (
      G.cameraDrag ||
      G.input?.active ||
      e.button !== 0 ||
      e.isPrimary === false
    )
      return;
    if (!canUseCameraControls()) return;
    const I = G.input,
      hit = screenPenHit(e),
      p = pointerTable(e);
    if (!hit) {
      if (canAdjustCamera()) beginCameraDrag(e);
      return;
    }
    // A nearby click on either pen can never become a camera-orbit drag.
    if (!I || hit.who !== I.who || !p) {
      e.preventDefault();
      return;
    }
    const pen = G.state.pens[I.who];
    const ax = Math.cos(pen.a),
      ay = Math.sin(pen.a);
    const tc = clamp(
      (p.x - pen.x) * ax + (p.y - pen.y) * ay,
      -pen.L / 2,
      pen.L / 2,
    );
    const cx = pen.x + ax * tc,
      cy = pen.y + ay * tc;
    clearHint();
    I.active = true;
    I.off = clamp(tc / (pen.L / 2), -0.9, 0.9);
    I.c = { x: cx, y: cy };
    I.p = p;
    I.p0 = p;
    I.pid = e.pointerId;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {}
    {
      const S = students[I.who],
        id = S.begin("r"),
        tx = cx - 30,
        tz = cy - 50;
      const contactY = 2 * PF.PENS[G.pens[I.who]].r + 0.22;
      S.goal = null;
      S.contactTarget = { x: tx, y: contactY, z: tz };
      S.grabDone = false;
      S.thinking = false;
      S.grabP = S.run(
        "r",
        [
          ...(handFar(S) ? S.liftStages("r") : []),
          [
            {
              tx,
              tz: tz + S.side * 2,
              ty: 9,
              curl: 0.4,
              ang: angTo(S.hand.ang, S.fa),
            },
            0.24,
            "reach",
          ],
          [{ tx, tz, ty: contactY, curl: 0.55 }, 0.13],
        ],
        id,
      ).then((ok) => {
        if (ok) {
          S.grabDone = true;
          updateAim();
        }
      });
    }
    ui.set({ hintReady: false });
    updateAim();
    e.preventDefault();
  });
  function beginCameraDrag(event) {
    G.cameraDrag = {
      pid: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      ...C.angle,
      started: false,
    };
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {}
    event.preventDefault();
  }
  scope.listen(canvas, "pointermove", (e) => {
    if (G.touches.has(e.pointerId)) {
      G.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (G.gestureBlocked || G.pinch) {
        if (!G.pinch && G.touches.size >= 2) startPinch();
        if (G.pinch && canAdjustCamera()) {
          const [a, b] = touchPair();
          zoomGesture(
            (G.pinch.zoom * Math.hypot(a.x - b.x, a.y - b.y)) /
              G.pinch.distance,
          );
        }
        e.preventDefault();
        return;
      }
    }

    const drag = G.cameraDrag;
    if (drag && e.pointerId === drag.pid) {
      const dx = e.clientX - drag.x,
        dy = e.clientY - drag.y;
      if (
        drag.started ||
        Math.hypot(dx, dy) > gameConfig.input.orbitThreshold
      ) {
        drag.started = true;
        setCameraAngle(
          drag.azimuth - dx * gameConfig.input.rotateSensitivity,
          drag.elevation + dy * gameConfig.input.tiltSensitivity,
        );
        e.preventDefault();
      }
      return;
    }
    const I = G.input;
    if (!I || !I.active || e.pointerId !== I.pid) return;
    const p = pointerTable(e);
    if (p) {
      I.p = p;
      updateAim();
    }
  });
  function aimVec(I) {
    const dx = I.p.x - (I.p0 || I.c).x,
      dy = I.p.y - (I.p0 || I.c).y,
      d = Math.hypot(dx, dy);
    return { ang: Math.atan2(-dy, -dx), pow: clamp(d / 30, 0, 1), d, dx, dy };
  }
  function updateAim() {
    const I = G.input;
    if (!I || !I.active) return;
    const v = aimVec(I),
      S = students[I.who],
      k = Math.min(1, 6.3 / Math.max(v.d, 0.01));
    I.cur = v;
    World.showAim(I.c.x, I.c.y, v.ang, v.pow, v.pow > 0.04 && SET.guide);
    if (S.grabDone)
      S.goal = {
        ang: handAngle(S.hand.ang, S.fa, v.ang),
        tx: I.c.x - 30 + v.dx * k,
        tz: I.c.y - 50 + v.dy * k,
        ty: 2 * PF.PENS[G.pens[I.who]].r + 0.22,
        curl: 0.4 + 0.6 * v.pow,
      };
    ui.set({ power: { value: v.pow, surge: G.surge } });
  }
  function endAim(e) {
    const I = G.input;
    if (!I || !I.active || (e && e.pointerId !== I.pid)) return;
    if (G.paused) {
      cancelAim(e);
      return;
    }
    const release = pointerTable(e);
    if (release) I.p = release;
    const v = aimVec(I);
    I.active = false;
    releasePointer(I);
    World.showAim(0, 0, 0, 0, false);
    ui.set({ power: null });
    students[I.who].goal = null;
    if (v.pow < 0.07) {
      retract(I.who);
      ui.set({ hintReady: G.mode === "train" && I.who === 0 });
      return;
    } // cancelled
    const act = {
      ang: v.ang,
      pow: v.pow,
      off: I.off,
      surge: I.who === 0 && G.surge && surgeAvail(0),
      t: -1,
    };
    if (act.surge) {
      G.state.surge[0] = false;
      G.surge = false;
      syncSurge();
    }
    const r = I.res;
    G.input = null;
    r({ act, contact: I.c, fromPull: true });
  }
  function releasePointer(input) {
    try {
      canvas.releasePointerCapture(input.pid);
    } catch {}
  }
  function cancelAim(event, keepCapture = false) {
    const input = G.input;
    if (!input?.active || (event && event.pointerId !== input.pid)) return;
    input.active = false;
    if (!keepCapture) releasePointer(input);
    World.showAim(0, 0, 0, 0, false);
    retract(input.who);
    ui.set({
      power: null,
      hintReady: G.mode === "train" && input.who === 0 && !G.paused,
    });
  }
  scope.listen(canvas, "pointerup", endAim);
  scope.listen(canvas, "pointercancel", cancelAim);
  scope.listen(canvas, "lostpointercapture", cancelAim);
  scope.listen(canvas, "pointerup", cancelCameraDrag);
  scope.listen(canvas, "pointercancel", cancelCameraDrag);
  scope.listen(canvas, "lostpointercapture", cancelCameraDrag);

  // Trackpad pinches emit Ctrl+wheel in Chromium and gesture events in Safari.
  scope.listen(
    canvas,
    "wheel",
    (event) => {
      if (!event.ctrlKey || G.mode === "menu") return;
      event.preventDefault();
      if (G.pinch || !canAdjustCamera()) return;
      cancelCameraDrag();
      const pixels =
        event.deltaY *
        (event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? canvas.clientHeight
            : 1);
      zoomGesture(
        C.angle.zoom *
          Math.exp(
            -clamp(pixels, -120, 120) * gameConfig.input.wheelZoomSensitivity,
          ),
      );
    },
    { passive: false },
  );
  scope.listen(
    canvas,
    "gesturestart",
    (event) => {
      if (G.mode === "menu") return;
      event.preventDefault();
      if (G.touches.size >= 2 || !canAdjustCamera()) return;
      cancelCameraDrag();
      G.nativePinchZoom = C.angle.zoom;
    },
    { passive: false },
  );
  scope.listen(
    canvas,
    "gesturechange",
    (event) => {
      if (G.mode === "menu") return;
      event.preventDefault();
      if (
        G.nativePinchZoom == null ||
        G.pinch ||
        !canAdjustCamera() ||
        !(event.scale > 0)
      )
        return;
      zoomGesture(G.nativePinchZoom * event.scale);
    },
    { passive: false },
  );
  scope.listen(canvas, "gestureend", (event) => {
    if (G.mode !== "menu") event.preventDefault();
    G.nativePinchZoom = null;
  });

  /* ------------------------------------------------------------------- AI */

  async function runAI(who, cfgOverride, noiseless) {
    const tok = G.token,
      cfg = Object.assign({}, cfgOverride || G.ai[who], {
        seed: (Math.random() * 1e6) | 0,
      }),
      S = students[who];
    S.thinking = true;
    S.setEmotion("think", 0);
    setThink(who, cfg);
    World.showHints(null);
    const gen = PF.decide(G.state, who, cfg),
      t0 = performance.now();
    let r;
    for (;;) {
      r = gen.next();
      if (r.done) break;
      G.live = r.value;
      setThink(who, cfg);
      labDirty = true;
      if (location.hash === "#fast") continue;
      await nextFrame();
      while (G.paused) {
        await nextFrame();
        chk(tok);
      }
      chk(tok);
    }
    const need = (cfg.think ?? 800) / G.speed - (performance.now() - t0);
    if (need > 0) await wait(need / 1000);
    S.thinking = false;
    S.setEmotion("neutral", 0);
    ui.set({ thinking: null });
    while (G.paused) {
      await nextFrame();
      chk(tok);
    }
    const out = r.value;
    G.live = out.info;
    labDirty = true;
    const act = Object.assign(
      {},
      noiseless ? out.action : PF.noisy(out.action, cfg.noise, playRng),
    );
    if (G.state.surge[who] && !noiseless && G.state.flicks[who] >= 2) {
      act.surge = true;
      G.state.surge[who] = false;
    }
    cfg.lastInfo = out.info;
    return { act, contact: contactOf(G.state.pens[who], act.off || 0), cfg };
  }
  function setThink(who, cfg) {
    const thinking = G.names[who] + " is thinking · " + PF.ALGOS[cfg.algo];
    ui.set({ thinking });
  }

  /* ----------------------------------------------------------- round flow */
  function syncBoard() {
    const b = World.board;
    b.names = G.names.slice();
    b.scores = G.scores.slice();
    b.goal = G.goal;
    b.round = G.round;
    World.drawBoard();
    updateHud();
  }
  function showStatic() {
    if (!G.state || G.play) return;
    const t = G.state.pens;
    for (let i = 0; i < 2; i++)
      World.setPen(
        i,
        Object.assign({ z: 0 }, t[i]),
        0,
        G.spawn == null ? 1 : G.spawn,
      );
  }
  function updateHud() {
    ui.set({
      names: [...G.names],
      scores: [...G.scores],
      round: G.round,
      goal: G.goal,
    });
  }
  let bannerTimer;
  function showBanner(title, subtitle = "", ms) {
    clearTimeout(bannerTimer);
    ui.set({ banner: title ? { title, subtitle } : null });
    if (title && ms)
      bannerTimer = scope.timeout(() => ui.set({ banner: null }), ms);
  }
  function turnLabel(who) {
    return G.mode === "pvp"
      ? G.names[who] + "’s flick"
      : G.humans[who]
        ? "Your flick"
        : G.names[who] + "’s turn";
  }

  async function spawn() {
    G.spawn = 0;
    World.setPenType(0, G.pens[0], G.penColors[0]);
    World.setPenType(1, G.pens[1], G.penColors[1]);
    World.clearTrails();
    for (let t = 0; t < 0.45; t += 0.03) {
      G.spawn = Math.min(1, t / 0.45);
      G.spawn = 1 - Math.pow(1 - G.spawn, 3);
      await wait(0.03);
    }
    G.spawn = 1;
    Snd.desk(0.3);
  }
  async function playRound(first) {
    const tok = G.token;
    G.state = PF.newState(G.pens, playRng, first);
    G.state.round = G.round;
    syncSurgeUI();
    G.curFrame = null;
    G.camMode = "game";
    students.forEach((s) => s.reset());
    syncBoard();
    await spawn();
    showBanner(
      "Round " + G.round,
      G.mode === "pvp"
        ? G.names[G.state.turn] + " flicks first"
        : G.state.turn === 0 && G.humans[0]
          ? "You flick first"
          : G.names[G.state.turn] + " flicks first",
      1400,
    );
    await wait(0.6);
    // no flick limit: the round continues until a pen leaves the desk
    for (;;) {
      const st = G.state,
        who = st.turn;
      World.drawBoard();
      World.board.turn = turnLabel(who);
      World.drawBoard();
      ui.set({ turn: { label: turnLabel(who), who } });
      updateHud();
      let got;
      if (G.humans[who]) {
        G.hint = null;
        students[who].setEmotion("neutral", 0);
        if (G.mode === "pvp") {
          G.viewSide = who;
          if (C.angle.preset === "player")
            setCameraAngle(
              CAMERA_PRESETS.player.azimuth + who * 180,
              C.angle.elevation,
              "player",
              false,
            );
        }
        got = await humanAim(who);
        chk(tok);
        if (!got) return null;
      } else got = await runAI(who);
      chk(tok);
      const res = await executeShot(who, got.act, got.contact, got.fromPull);
      chk(tok);
      const cfg = G.ai[who];
      if (cfg && cfg.mem)
        cfg.mem.conf = clamp(cfg.mem.conf + (res.hit ? 0.15 : -0.1), 0.05, 1);
      st.pens = res.pens;
      st.turn = 1 - who;
      st.flicks[who]++;
      updateHud();
      const outcome = roundOutcome(res.out);
      if (outcome) return { ...outcome, res, who };
      await wait(0.16);
    }
  }
  async function replayShot() {
    const tok = G.token,
      R = G.lastRes;
    if (!R) return;
    const ev =
      R.res.events.find((e) => e.type === "out") ||
      R.res.events.filter((e) => e.type === "hit").at(-1);
    const fx = ev ? ev.x : G.state.pens[0].x,
      fy = ev ? ev.y : G.state.pens[0].y;
    C.focus.set(fx - 30, 1, fy - 50);
    C.t = 0;
    C.who = R.who;
    C.orbit = Math.random() * 6;
    G.camMode = "replay";
    G.replaying = true;
    ui.set({ replaying: true });
    World.clearTrails();
    const sp = 0.9;
    const done = startPlay(R.res, R.who, {
      speed: sp,
      replay: true,
      slow: false,
    });
    const tick = scope.interval(() => {
      C.t += 0.05;
    }, 50);
    await done;
    clearInterval(tick);
    chk(tok);
    G.replaying = false;
    ui.set({ replaying: false });
  }
  async function roundEnd(r) {
    const tok = G.token,
      win = r.winner;
    r.points.forEach((points, side) => {
      G.scores[side] += points;
    });
    syncBoard();
    updateHud();
    const shared = win < 0;
    const humanWon = G.humans[0] && win === 0,
      humanMatch = G.humans[0] && G.mode !== "pvp";
    const how = shared
      ? "Both pens fell · +1 point each"
      : r.who === win
        ? "Knocked off the desk"
        : "Slid off the desk";
    const title = shared
      ? "Both players score"
      : G.names[win] + " takes the round";
    showBanner(title, how, 2200);
    Snd.round(shared || !humanMatch || humanWon);
    const matchDone = G.scores.some((score) => score >= G.goal);
    const reactions = () => {
      if (shared) {
        students.forEach((student) => {
          student.react = { kind: "happy", t: 0, dur: 2.4 };
          student.setEmotion("happy", 2.6);
        });
        return;
      }
      students[win].react = {
        kind: matchDone ? "victory" : "happy",
        t: 0,
        dur: 2.4,
      };
      students[win].setEmotion("happy", 2.6);
      students[1 - win].react = { kind: "frustrated", t: 0, dur: 2.4 };
      students[1 - win].setEmotion("frustrated", 2.6);
    };
    ui.set({ turn: { label: "", who: 0 } });
    if (r.how === "out" && SET.replay && G.lastRes && G.speed <= 1) {
      showBanner(null);
      await wait(0.1);
      await replayShot();
      reactions();
      showBanner(title, how, 2200);
      C.who = shared ? 1 - r.who : 1 - win;
      G.camMode = "react";
      await wait(0.35);
      chk(tok);
      C.who = shared ? r.who : win;
      await wait(0.35);
    } else {
      reactions();
      await wait(0.95);
    }
    G.camMode = "game";
    chk(tok);
  }
  async function matchLoop() {
    const tok = G.token;
    try {
      let first = 0;
      for (;;) {
        const r = await playRound(first);
        chk(tok);
        if (!r) return;
        await roundEnd(r);
        chk(tok);
        first = 1 - first;
        G.round++;
        if (G.scores[0] >= G.goal || G.scores[1] >= G.goal) break;
      }
      await matchEnd();
    } catch (e) {
      if (e.message !== "cancel") console.error(e);
    }
  }
  async function matchEnd() {
    const tied = G.scores[0] === G.scores[1],
      w = G.scores[0] > G.scores[1] ? 0 : 1,
      humanVs = G.humans[0] && G.mode !== "pvp",
      youWon = humanVs && w === 0;
    G.camMode = "react";
    C.who = w;
    if (tied) Snd.round(true);
    else if (humanVs) (youWon ? Snd.win : Snd.lose)();
    else Snd.win();
    const title = tied
      ? "Match drawn"
      : humanVs
        ? youWon
          ? "You win the match"
          : G.names[1] + " wins the match"
        : G.names[w] + " wins the series";
    const sub =
      G.scores[0] + " – " + G.scores[1] + " · " + (G.round - 1) + " rounds";
    await wait(0.6);
    showEnd(title, sub, youWon);
  }

  function setLab(on) {
    G.labOpen = on;
    ui.set({ labOpen: on });
    if (on) labDirty = true;
  }
  function publishDecision() {
    if (G.live && G.labOpen)
      ui.set({
        live: structuredClone(G.live),
      });
  }
  function syncSurge() {
    ui.set({
      surge: {
        ...ui.get().surge,
        available: !!surgeAvail(0),
        enabled: G.surge,
      },
    });
  }
  function syncSurgeUI() {
    G.surge = false;
    ui.set({
      surge: {
        visible: G.pens[0] === "premium" && G.humans[0],
        available: !!G.state?.surge[0],
        enabled: false,
      },
    });
  }
  function showEnd(title, subtitle, won) {
    ui.set({ end: { title, subtitle, won } });
  }
  function openMenu() {
    benchmark.stop(false);
    cancelAll();
    G.paused = false;
    Snd.setPaused(false);
    G.mode = "menu";
    G.camMode = "menu";
    G.labOpen = false;
    G.live = null;
    G.hint = null;
    ui.set({
      mode: "menu",
      cameraPinned: false,
      view: "main",
      menuVisible: true,
      paused: false,
      fromPause: false,
      end: null,
      labOpen: false,
      thinking: null,
      power: null,
      replaying: false,
      banner: null,
      hintBusy: false,
      hintAvailable: false,
      live: null,
      turn: { label: "", who: 0 },
      surge: { visible: false, available: false, enabled: false },
      benchmark: { running: false, status: "", result: null },
    });
    const { pen1, pen2 } = ui.get().preferences.pvp;
    G.pens = [pen1.pen, pen2.pen];
    G.penColors = [penColorFor(PF, pen1), penColorFor(PF, pen2)];
    G.state = PF.newState(G.pens, playRng, 0);
    G.pens.forEach((kind, i) => World.setPenType(i, kind, G.penColors[i]));
    G.spawn = 1;
    G.state.pens.forEach((pen, i) => World.setPen(i, { z: 0, ...pen }, 0, 1));
    Object.assign(World.board, {
      stage: "Classroom",
      names: [SET.name || "Player", "Bunty"],
      scores: [0, 0],
      turn: "",
    });
    World.drawBoard();
  }
  function begin(mode, options) {
    Snd.setPaused(false);
    Snd.init();
    benchmark.stop(false);
    cancelAll();
    G.paused = false;
    G.mode = mode;
    G.scores = [0, 0];
    G.round = 1;
    G.speed = options.speed || 1;
    G.humans = options.humans;
    G.names = options.names;
    G.pens = options.pens;
    G.penColors = options.penColors;
    G.goal = options.goal;
    G.ai = options.ai;
    G.viewSide = 0;
    G.manualCamera = false;
    C.angle = overviewCamera(viewport().width / viewport().height);
    C.pending = false;
    C.directTime = 0;
    G.hint = null;
    G.live = null;
    G.series = [0, 0];
    Object.assign(World.board, {
      stage: options.title,
      note: options.note || "Search before you flick.",
    });
    students.forEach((student, i) => {
      student.mats.tie.color.set(
        options.ties?.[i] || (i ? 0x8a1f2c : 0x1f3fa0),
      );
      student.react = null;
    });
    const algorithm = options.ai[mode === "aivai" ? 0 : 1]?.algo || "astar";
    ui.set({
      mode,
      speed: G.speed,
      menuVisible: false,
      end: null,
      paused: false,
      fromPause: false,
      human: options.humans[0],
      title: options.title,
      labAlgo: algorithm,
      power: null,
      camera: C.angle,
      cameraPinned: false,
      hintBusy: false,
      hintAvailable: false,
      live: null,
      benchmark: { running: false, status: "", result: null },
    });
    if (gameConfig.camera.defaultPinned) {
      C.fov = gameCam(C.pos, C.look);
      C.zoom = C.angle.zoom;
      setCameraPinned(true);
      C.pinnedDeskView = true;
    }
    setLab(!!options.lab);
    syncSurgeUI();
    syncBoard();
    void matchLoop();
  }
  function start(mode) {
    begin(mode, buildMatchOptions(PF, SET, ui.get().preferences, mode));
  }
  function pause() {
    if (G.mode === "menu" || G.paused || ui.get().end) return;
    Snd.init();
    G.paused = true;
    Snd.setPaused(true);
    cancelAim();
    cancelCameraDrag();
    cancelTouchGesture();
    clearHint();
    ui.set({ paused: true, hintReady: false });
  }
  function resume() {
    G.paused = false;
    Snd.setPaused(false);
    Snd.init();
    ui.set({
      paused: false,
      fromPause: false,
      menuVisible: false,
      hintReady: G.mode === "train" && G.input?.who === 0 && !G.input.active,
    });
  }
  function settings() {
    cancelAim();
    cancelCameraDrag();
    cancelTouchGesture();
    G.paused = true;
    ui.set({
      paused: false,
      fromPause: true,
      menuVisible: true,
      view: "settings",
    });
  }
  function back() {
    if (ui.get().fromPause) {
      G.paused = true;
      ui.set({ menuVisible: false, fromPause: false, paused: true });
    } else ui.set({ view: "main" });
  }
  function changeAlgorithm(algo) {
    clearHint();
    ui.set({ labAlgo: algo });
    const side = G.mode === "aivai" ? 0 : 1;
    if (G.ai[side]) G.ai[side].algo = algo;
    if (G.mode === "aivai") {
      G.names = G.ai.map((cfg) => PF.SHORT[cfg.algo]);
      if (G.names[0] === G.names[1]) G.names[1] += " (2)";
      syncBoard();
    }
  }
  scope.listen(window, "keydown", (event) => {
    if (event.defaultPrevented) return;
    if (event.key === "Escape" && G.mode !== "menu") {
      if (event.repeat) {
        event.preventDefault();
        return;
      }
      if (ui.get().fromPause) back();
      else if (G.paused) resume();
      else pause();
      event.preventDefault();
      return;
    }
    if (/INPUT|SELECT|TEXTAREA/.test(event.target?.tagName || "")) return;
    if (
      (event.key === "l" || event.key === "L") &&
      G.mode !== "menu" &&
      !G.paused
    )
      setLab(!G.labOpen);
  });
  scope.listen(window, "blur", pause);
  scope.listen(document, "visibilitychange", () => {
    if (document.hidden) pause();
  });
  function clearHint() {
    hintRequest++;
    G.hint = null;
    World.showHints(null);
    ui.set({ hintBusy: false, hintAvailable: false });
  }
  async function requestHint() {
    if (
      G.mode !== "train" ||
      G.paused ||
      G.input?.who !== 0 ||
      G.input.active ||
      ui.get().hintBusy
    )
      return;
    const tok = G.token,
      input = G.input,
      request = ++hintRequest;
    const current = () =>
      tok === G.token &&
      request === hintRequest &&
      G.input === input &&
      !input.active &&
      !G.paused;
    const algo = ui.get().labAlgo;
    const cfg = { algo, noise: null, mem: PF.newMemory("expert") };
    const gen = PF.decide(G.state, 0, Object.assign({}, cfg, { seed: 5 }));
    let r;
    ui.set({ hintBusy: true });
    try {
      for (;;) {
        if (!current()) return;
        r = gen.next();
        if (r.done) break;
        G.live = r.value;
        labDirty = true;
        await nextFrame();
      }
      if (!current()) return;
      G.live = r.value.info;
      G.hint = r.value;
      labDirty = true;
      ui.set({ hintBusy: false });
      ui.set({ hintAvailable: true });
      const pen = G.state.pens[0];
      World.showHints(
        (r.value.info.moves || []).slice(0, 5).map((m) => {
          const c = contactOf(pen, m.act.off || 0);
          return {
            x: c.x - Math.cos(m.act.ang) * 0,
            y: c.y,
            ang: m.act.ang,
            pow: m.act.pow,
            score: m.score,
            selected: m.selected,
          };
        }),
      );
    } finally {
      gen.return();
      if (request === hintRequest) ui.set({ hintBusy: false });
    }
  }
  /* ------------------------------------------------------------- main loop */
  const perf = { acc: 0, n: 0, low: 0, cool: 0 };
  const DTMAX = location.hash === "#fast" ? 0.5 : 0.05;
  function frame(ts) {
    if (disposed) return;
    scope.frame(frame);
    let dt = Math.min(DTMAX, (ts - last) / 1000);
    last = ts;
    // A menu turn needs the compositor; keep the last WebGL frame until it ends.
    // Advance the timestamp so the scene resumes without a catch-up jump.
    if (ui.get().menuVisible && ui.get().menuTurning) return;
    publishCamera();
    perf.acc += dt;
    perf.n++;
    if (perf.acc >= 1) {
      const fps = perf.n / perf.acc;
      if (SET.fps)
        ui.set({ fpsLabel: Math.round(fps) + " fps · " + World.quality });
      perf.acc = 0;
      perf.n = 0;
      perf.cool--;
      if (SET.quality === "auto" && G.mode !== "menu") {
        if (fps < 26) perf.low++;
        else perf.low = 0;
        if (perf.low >= 3 && perf.cool < 0) {
          const nq = World.quality === "high" ? "medium" : "low";
          if (nq !== World.quality) {
            World.setQuality(nq);
            perf.cool = 8;
          }
          perf.low = 0;
        }
      }
    }
    if (G.paused) {
      World.render();
      return;
    }
    const ds = dt * (G.mode === "aivai" ? G.speed : 1);
    clock += ds;
    for (let i = G.timers.length - 1; i >= 0; i--) {
      const t = G.timers[i];
      t.t -= ds;
      if (t.t <= 0) {
        G.timers.splice(i, 1);
        t.res();
      }
    }
    World.ambient(ds, clock);
    updatePlay(ds);
    if (!G.play) {
      showStatic();
    }
    const hp = students.map((s) => s.head.getWorldPosition(new V3()));
    students.forEach((s, i) => {
      s.look.copy(
        s.thinking || G.input
          ? penWorld(i)
          : G.play
            ? penWorld(G.play.who)
            : hp[1 - i],
      );
      s.update(ds, clock);
    });
    if (G.mode === "train" && G.hint && G.input) {
      /* keep hint arrows */
    } else if (!G.input) World.showHints(null);
    updateCamera(dt);
    if (labDirty && performance.now() - (frame.lt || 0) > 110) {
      frame.lt = performance.now();
      labDirty = false;
      publishDecision();
    }
    World.render();
  }
  openMenu();
  ui.set({ ready: true, error: null });
  scope.frame(frame);
  return {
    start,
    openMenu,
    pause,
    resume,
    settings,
    back,
    changeAlgorithm,
    showView(view) {
      Snd.init();
      Snd.page();
      ui.set({ view });
    },
    toggleLab() {
      setLab(!G.labOpen);
    },
    closeLab() {
      setLab(false);
    },
    toggleSurge() {
      if (surgeAvail(0)) {
        G.surge = !G.surge;
        syncSurge();
        Snd.tick();
      }
    },
    skipReplay() {
      if (G.play?.replay) {
        G.play.t = G.play.dur;
        G.play.ei = G.play.events.length;
        Snd.stopMotion();
      }
    },
    setSpeed(speed) {
      if (disposed || !CONFIG_LIMITS.speeds.includes(speed)) return;
      G.speed = speed;
      ui.set({ speed });
    },
    setCameraAngle,
    setCameraPinned,
    setCameraRotation(azimuth) {
      setCameraAngle(azimuth, C.angle.elevation);
      publishCamera();
    },
    setCameraTilt(elevation) {
      setCameraAngle(C.angle.azimuth, elevation);
      publishCamera();
    },
    setCameraZoom(zoom) {
      setCameraAngle(
        C.angle.azimuth,
        C.angle.elevation,
        C.angle.preset,
        true,
        zoom,
      );
      publishCamera();
    },
    resetCamera() {
      const angle = overviewCamera(viewport().width / viewport().height);
      setCameraAngle(
        angle.azimuth,
        angle.elevation,
        "overview",
        false,
        angle.zoom,
      );
    },
    setCameraPreset(preset) {
      const angle =
        preset === "overview"
          ? overviewCamera(viewport().width / viewport().height)
          : CAMERA_PRESETS[preset];
      if (angle)
        setCameraAngle(
          angle.azimuth + (preset === "player" ? G.viewSide * 180 : 0),
          angle.elevation,
          preset,
          false,
        );
    },
    requestHint() {
      setLab(true);
      return requestHint();
    },
    applyHint() {
      if (G.paused || G.input?.who !== 0 || G.input.active || !G.hint) return;
      const action = { ...G.hint.action },
        input = G.input;
      G.input = null;
      clearHint();
      ui.set({ hintReady: false });
      input.res({
        act: action,
        contact: contactOf(G.state.pens[0], action.off || 0),
        fromPull: false,
      });
    },
    benchmark,
    dispose() {
      if (disposed) return;
      disposed = true;
      benchmark.stop(false);
      cancelAll();
      unsubscribe();
      observer.disconnect();
      scope.dispose();
      Snd.dispose();
      ui.set({ ready: false });
    },
  };
}
