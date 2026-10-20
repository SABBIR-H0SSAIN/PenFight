import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  createGameConfig,
  defaultGameConfig,
  gameConfig,
} from "../src/config/config.ts";

test("configuration works with no environment file and never shares mutable defaults", () => {
  const a = createGameConfig(),
    b = createGameConfig();
  assert.deepEqual(a, defaultGameConfig);
  assert.deepEqual(gameConfig, defaultGameConfig);
  a.preferences.vs.colors.ball = "#abcdef";
  a.camera.presets.overview.azimuth = -20;
  a.pens.ball.mass = 2;
  assert.deepEqual(b, defaultGameConfig);
  assert.equal(defaultGameConfig.camera.presets.overview.azimuth, 30);
});

test("partial JSON config tunes each subsystem and preserves omitted defaults", () => {
  const patch = {
    settings: { vol: 0.2, follow: true, quality: "low", tableSurface: "maple" },
    preferences: {
      vs: { pen: "heavy", difficulty: "expert", colors: { ball: "#abcdef" } },
      train: { algorithm: "mcts" },
      ai: { a: "fuzzy", speed: 4, penB: { pen: "premium" } },
      pvp: { goal: 5, name1: "Alex" },
    },
    matches: { versusGoal: 7 },
    camera: { defaultZoom: 1.2, presets: { side: { elevation: 60 } } },
    input: { penSafetyTouch: 48 },
    physics: { maxFlickSpeed: 180, timeStep: 0.004 },
    playback: { impactSpeed: 0.9 },
    ai: {
      difficulties: { expert: { think: 900, algo: "astar" } },
      budgets: { mcts: { iters: 500 } },
    },
    pens: { ball: { mass: 1.2 } },
    penColors: { matador_hs: { default: "#112233" } },
    audio: {
      ambience: { fan: { gain: 0.05 } },
      assets: { flick: "/audio/custom.wav" },
    },
    graphics: { exposure: 0.9, quality: { low: { shadowMap: 256 } } },
  };
  const config = createGameConfig(JSON.stringify(patch));
  function check(actual, expected) {
    for (const [key, value] of Object.entries(expected)) {
      if (value && typeof value === "object") check(actual[key], value);
      else assert.equal(actual[key], value, key);
    }
  }
  check(config, patch);
  assert.equal(config.settings.friction, 0.98);
  assert.equal(config.pens.ball.len, 20);
});

test("individual environment overrides parse false/zero and take precedence over JSON", () => {
  const config = createGameConfig(
    '{"settings":{"vol":0.2,"follow":true},"camera":{"defaultZoom":1.2}}',
    {
      settings: { vol: "0", follow: "false", replay: "true", friction: "1.01" },
      camera: { defaultZoom: "1.4" },
    },
  );
  assert.equal(config.settings.vol, 0);
  assert.equal(config.settings.follow, false);
  assert.equal(config.settings.replay, true);
  assert.equal(config.settings.friction, 1.01);
  assert.equal(config.camera.defaultZoom, 1.4);
});

test("malformed, non-object, and empty JSON all recover to defaults", () => {
  for (const value of [
    undefined,
    "",
    "broken",
    "{",
    "null",
    "true",
    "42",
    "[]",
    '"test"',
  ]) {
    assert.deepEqual(createGameConfig(value), defaultGameConfig);
  }
});

test("invalid higher-priority values keep valid JSON fallbacks", () => {
  const config = createGameConfig('{"settings":{"vol":0.4,"quality":"low"}}', {
    settings: { vol: "NaN", quality: "ultra", follow: "yes", friction: "" },
  });
  assert.equal(config.settings.vol, 0.4);
  assert.equal(config.settings.quality, "low");
  assert.equal(config.settings.follow, false);
  assert.equal(config.settings.friction, 0.98);
});

test("unsafe physics, camera, graphics, and AI settings cannot enter the game", () => {
  const invalid = {
    settings: { vol: -1, friction: 7 },
    camera: {
      defaultZoom: 9,
      radius: 1000,
      presets: { overview: { elevation: -1 } },
    },
    physics: { timeStep: 0, gravity: -5, surgeMultiplier: 0 },
    ai: {
      budgets: { mcts: { iters: 1e9 }, minimax: { depth: 100 } },
      difficulties: { expert: { mistake: 5, algo: "removed" } },
    },
    graphics: { exposure: Infinity, quality: { high: { shadowMap: 1000 } } },
    input: { penSafetyTouch: 0 },
    preferences: {
      ai: { a: "removed", speed: 7 },
      vs: { pen: "missing", difficulty: "impossible" },
      pvp: { goal: -1 },
    },
  };
  assert.deepEqual(createGameConfig(undefined, invalid), defaultGameConfig);
});

test("catalogue colour validation, fixed array lengths, and names remain safe", () => {
  const config = createGameConfig(undefined, {
    settings: { name: "Long player name longer than 14" },
    penColors: { matador_hs: { default: "invalid", swatches: ["#ffffff"] } },
    preferences: {
      vs: { colors: { unknown: "#ffffff", ball: "bad", gel: "#aabbcc" } },
    },
    audio: { contacts: ["contactC", "contactA", "contactB"] },
  });
  assert.equal(config.settings.name.length, 14);
  assert.deepEqual(config.penColors, defaultGameConfig.penColors);
  assert.deepEqual(config.preferences.vs.colors, { gel: "#aabbcc" });
  assert.deepEqual(config.audio.contacts, ["contactC", "contactA", "contactB"]);
});

test("unknown keys and prototype fields are ignored", () => {
  const config = createGameConfig(
    '{"__proto__":{"polluted":true},"settings":{"__proto__":{"polluted":true},"unknown":42},"extra":true}',
  );
  assert.deepEqual(config, defaultGameConfig);
  assert.equal({}.polluted, undefined);
});

function probe(environment, saved = {}) {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) => !key.startsWith("NEXT_PUBLIC_GAME_"),
    ),
  );
  return JSON.parse(
    execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `
    import { gameConfig } from './src/config/config.ts';
    import { createUiStore } from './src/game/state/store.ts';
    import { hydrateState } from './src/game/state/preferences.js';
    import { createGameEngine } from './src/game/engine.js';
    import { buildMatchOptions } from './src/game/controller/modes.js';
    import { overviewCamera } from './src/game/controller/camera.js';
    const saved = ${JSON.stringify(saved)};
    globalThis.localStorage = { getItem: key => key in saved ? JSON.stringify(saved[key]) : null };
    const ui = createUiStore(), engine = createGameEngine();
    hydrateState(engine, ui);
    const state = ui.get();
    console.log(JSON.stringify({
      settings: state.settings, preferences: state.preferences,
      camera: overviewCamera(1.5), physics: engine._internals,
      real: engine.REAL, friction: engine.FRICTION, ball: engine.PENS.ball,
      advanced: engine.LEVELS.advanced,
      vs: buildMatchOptions(engine, state.settings, state.preferences, 'vs'),
      train: buildMatchOptions(engine, state.settings, state.preferences, 'train'),
      ai: buildMatchOptions(engine, state.settings, state.preferences, 'aivai'),
      volume: gameConfig.settings.vol,
    }));
  `,
      ],
      {
        cwd: new URL("..", import.meta.url),
        env: { ...env, ...environment },
        encoding: "utf8",
      },
    ),
  );
}

test("actual environment variables reach store, hydration, modes, camera, pens and physics", () => {
  const result = probe({
    NEXT_PUBLIC_GAME_VOLUME: "0.3",
    NEXT_PUBLIC_GAME_AMBIENCE: "false",
    NEXT_PUBLIC_GAME_DEFAULT_PEN: "heavy",
    NEXT_PUBLIC_GAME_DIFFICULTY: "expert",
    NEXT_PUBLIC_GAME_FRICTION: "1.03",
    NEXT_PUBLIC_GAME_REALISM: "false",
    NEXT_PUBLIC_GAME_VS_GOAL: "5",
    NEXT_PUBLIC_GAME_CAMERA_ZOOM: "1.15",
    NEXT_PUBLIC_GAME_CONFIG: JSON.stringify({
      settings: { vol: 0.1 },
      preferences: {
        train: { algorithm: "minimax" },
        ai: { a: "fuzzy", b: "astar", sa: "beginner", speed: 4 },
        pvp: { name1: "Alex", goal: 5 },
      },
      matches: { trainingGoal: 50, aiGoal: 7 },
      physics: { maxFlickSpeed: 190 },
      pens: { ball: { mass: 1.2 } },
      ai: { difficulties: { advanced: { think: 750 } } },
    }),
  });
  assert.equal(result.settings.vol, 0.3);
  assert.equal(result.settings.amb, false);
  assert.equal(result.preferences.vs.pen, "heavy");
  assert.equal(result.preferences.vs.difficulty, "expert");
  assert.equal(result.preferences.train.algorithm, "minimax");
  assert.equal(result.preferences.ai.a, "fuzzy");
  assert.equal(result.preferences.ai.b, "astar");
  assert.equal(result.preferences.ai.speed, 4);
  assert.equal(result.preferences.pvp.name1, "Alex");
  assert.equal(result.preferences.pvp.goal, 5);
  assert.equal(result.vs.goal, 5);
  assert.equal(result.train.goal, 50);
  assert.equal(result.ai.goal, 7);
  assert.equal(result.camera.zoom, 1.15);
  assert.equal(result.physics.VMAX, 190);
  assert.equal(result.real, false);
  assert.equal(result.friction, 1.03);
  assert.equal(result.ball.mass, 1.2);
  assert.equal(result.advanced.think, 750);
});

test("saved player choices win over environment defaults, including legacy selections", () => {
  const env = {
    NEXT_PUBLIC_GAME_VOLUME: "0.3",
    NEXT_PUBLIC_GAME_DEFAULT_PEN: "heavy",
  };
  const result = probe(env, {
    "pfa.settings": { vol: 0.9 },
    "pfa.preferences": { vs: { pen: "gel", difficulty: "beginner" } },
  });
  assert.equal(result.settings.vol, 0.9);
  assert.equal(result.volume, 0.3);
  assert.equal(result.preferences.vs.pen, "gel");
  assert.equal(result.preferences.vs.difficulty, "beginner");
  assert.equal(
    probe(env, { "pfa.pen": "premium" }).preferences.vs.pen,
    "premium",
  );
});

test("all public scalar aliases reach their matching settings, mode and goal fields", () => {
  const result = probe({
    NEXT_PUBLIC_GAME_PLAYER_NAME: "Sam",
    NEXT_PUBLIC_GAME_VOLUME: "0",
    NEXT_PUBLIC_GAME_AMBIENCE: "false",
    NEXT_PUBLIC_GAME_QUALITY: "low",
    NEXT_PUBLIC_GAME_TABLE_SURFACE: "walnut",
    NEXT_PUBLIC_GAME_FOLLOW: "true",
    NEXT_PUBLIC_GAME_REPLAY: "false",
    NEXT_PUBLIC_GAME_SLOWMO: "false",
    NEXT_PUBLIC_GAME_FPS: "true",
    NEXT_PUBLIC_GAME_AIM_GUIDE: "false",
    NEXT_PUBLIC_GAME_FRICTION: "1.1",
    NEXT_PUBLIC_GAME_REALISM: "false",
    NEXT_PUBLIC_GAME_DEFAULT_PEN: "gel",
    NEXT_PUBLIC_GAME_DIFFICULTY: "beginner",
    NEXT_PUBLIC_GAME_VS_GOAL: "7",
    NEXT_PUBLIC_GAME_TRAINING_GOAL: "25",
    NEXT_PUBLIC_GAME_AI_GOAL: "9",
    NEXT_PUBLIC_GAME_CAMERA_ZOOM: "0.75",
  });
  assert.deepEqual(result.settings, {
    name: "Sam",
    vol: 0,
    amb: false,
    quality: "low",
    tableSurface: "walnut",
    follow: true,
    replay: false,
    slowmo: false,
    fps: true,
    guide: false,
    friction: 1.1,
    real: false,
  });
  assert.equal(result.preferences.vs.pen, "gel");
  assert.equal(result.preferences.train.pen, "gel");
  assert.equal(result.preferences.vs.difficulty, "beginner");
  assert.equal(result.preferences.train.difficulty, "beginner");
  assert.equal(result.vs.goal, 7);
  assert.equal(result.train.goal, 25);
  assert.equal(result.ai.goal, 9);
  assert.equal(result.camera.zoom, 0.75);
});

test("legacy colour-only storage is preserved without a legacy pen key", () => {
  const result = probe(
    {},
    { "pfa.matadorPenColors": { matador_hs: "#123456" } },
  );
  assert.equal(result.preferences.vs.colors.matador_hs, "#123456");
  assert.equal(result.preferences.train.colors.matador_hs, "#123456");
});
