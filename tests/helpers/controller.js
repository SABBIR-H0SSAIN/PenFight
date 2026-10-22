import { registerHooks } from "node:module";
import * as THREE from "three";
import { createGameEngine } from "../../src/game/engine.js";
import { createUiStore } from "../../src/game/state/store.ts";
import { sceneFixture } from "./scene.js";
import { createCharacterFeature } from "../../src/features/character/scene/character-scene.js";
import { disposeObjectTree } from "../../src/game/scene/dispose.js";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/"))
      return nextResolve(
        new URL(`../../src/${specifier.slice(2)}`, import.meta.url).href,
        context,
      );
    return nextResolve(specifier, context);
  },
});
const { createController } =
  await import("../../src/game/controller/controller.js");

/** Drive the real controller and physics with a virtual animation clock, without WebGL. */
export function controllerFixture(
  t,
  { realCharacters = false, stepMs = 50, seed } = {},
) {
  const frames = new Map(),
    captured = new Set();
  let id = 0,
    time = performance.now();
  const window = new EventTarget(),
    document = new EventTarget();
  document.hidden = false;
  const globals = {
    window,
    document,
    location: { hash: "" },
    ResizeObserver: class {
      observe() {}
      disconnect() {}
    },
    requestAnimationFrame: (callback) => {
      frames.set(++id, callback);
      return id;
    },
    cancelAnimationFrame: (value) => frames.delete(value),
  };
  const originals = new Map(
    Object.keys(globals).map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  for (const [key, value] of Object.entries(globals))
    Object.defineProperty(globalThis, key, { configurable: true, value });
  const canvas = Object.assign(new EventTarget(), {
    clientWidth: 1000,
    clientHeight: 700,
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      width: canvas.clientWidth,
      height: canvas.clientHeight,
    }),
    setPointerCapture: (pid) => captured.add(pid),
    releasePointerCapture: (pid) => captured.delete(pid),
  });
  const student = () => ({
    head: new THREE.Object3D(),
    fwd: new THREE.Vector3(0, 0, 1),
    right: new THREE.Vector3(1, 0, 0),
    look: new THREE.Vector3(),
    arm: [{ ready: false, tip: new THREE.Vector3() }],
    hand: { tz: 0, ty: 0, ang: 0 },
    side: 1,
    fa: 0,
    mats: { tie: { color: new THREE.Color() } },
    reset() {},
    setEmotion() {},
    begin() {},
    update() {},
    liftStages: () => [],
    dropStages: () => [],
    run: async () => true,
    to: async () => true,
  });
  const pens = [],
    shots = [],
    shotContacts = [],
    hints = [];
  const characters = realCharacters
    ? [0, 1].map((slot) =>
        createCharacterFeature(sceneFixture().deps).makeStudent(slot),
      )
    : [student(), student()];
  const world = {
    camera: new THREE.PerspectiveCamera(42, 1000 / 700, 1, 1500),
    students: characters,
    deskMesh: { position: { y: -2 } },
    board: {},
    quality: "high",
    setQuality(q) {
      this.quality = q;
    },
    resize(width, height) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    },
    drawBoard() {},
    showAim() {},
    showHints(value) {
      if (value) hints.push(value);
    },
    setPen(i, pen) {
      pens[i] = { ...pen };
    },
    setPenType() {},
    clearTrails() {},
    pushTrail() {},
    ambient() {},
    render() {},
  };
  const engine = createGameEngine(),
    ui = createUiStore();
  if (seed !== undefined) {
    const rng = engine.rng;
    engine.rng = (value) => rng(seed ?? value);
  }
  const shoot = engine.shoot;
  engine.shoot = (...args) => {
    if (args[3]?.record) {
      shots.push(args);
      const rig = world.students[args[1]];
      shotContacts.push({
        who: args[1],
        tip: rig.arm[0].tip.clone(),
        target: rig.contactTarget && { ...rig.contactTarget },
        time,
      });
    }
    return shoot(...args);
  };
  const soundCalls = [];
  const sound = new Proxy(
    {},
    {
      get:
        (_, method) =>
        (...args) =>
          soundCalls.push({ method, args }),
    },
  );
  const controller = createController({ engine, world, sound, canvas, ui });
  t.after(async () => {
    controller.dispose();
    await Promise.resolve();
    if (realCharacters)
      for (const rig of characters) {
        disposeObjectTree(rig.group);
        disposeObjectTree(rig.arms);
      }
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  async function advance(count = 1) {
    for (let i = 0; i < count; i++) {
      time += stepMs;
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((callback) => callback(time));
      for (let j = 0; j < 12; j++) await Promise.resolve();
    }
  }
  function point(who = 0, offset = 0) {
    world.camera.updateMatrixWorld(true);
    const p = new THREE.Vector3(
      pens[who].x - 30 + Math.cos(pens[who].a) * offset,
      0,
      pens[who].y - 50 + Math.sin(pens[who].a) * offset,
    ).project(world.camera);
    return {
      x: ((p.x + 1) * canvas.clientWidth) / 2,
      y: ((1 - p.y) * canvas.clientHeight) / 2,
    };
  }
  function pointer(type, point, extra = {}) {
    const event = Object.assign(new Event(type, { cancelable: true }), {
      clientX: point.x,
      clientY: point.y,
      button: 0,
      pointerId: 1,
      isPrimary: true,
      ...extra,
    });
    canvas.dispatchEvent(event);
  }
  return {
    controller,
    engine,
    ui,
    world,
    window,
    document,
    canvas,
    advance,
    point,
    pointer,
    captured,
    shots,
    shotContacts,
    pens,
    hints,
    soundCalls,
  };
}
