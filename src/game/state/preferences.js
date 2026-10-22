import { CONFIG_LIMITS } from "../../config/config.ts";
import { storage } from "./storage.js";
/** Hydrate client services before mounting scene features; validate all saved values. */
export function hydrateState(engine, ui) {
  const current = ui.get(),
    defaults = current.settings,
    raw = storage.get("settings", {});
  const settings = { ...defaults };
  for (const key of Object.keys(defaults))
    if (typeof raw?.[key] === typeof defaults[key]) settings[key] = raw[key];
  settings.name = settings.name.slice(0, CONFIG_LIMITS.nameLength);
  settings.vol = Number.isFinite(settings.vol)
    ? engine.clamp(settings.vol, 0, 1)
    : defaults.vol;
  settings.friction = Number.isFinite(settings.friction)
    ? engine.clamp(
        settings.friction,
        CONFIG_LIMITS.friction.min,
        CONFIG_LIMITS.friction.max,
      )
    : defaults.friction;
  if (!["auto", "low", "medium", "high"].includes(settings.quality))
    settings.quality = defaults.quality;
  if (!["oak", "maple", "walnut"].includes(settings.tableSurface))
    settings.tableSurface = defaults.tableSurface;
  const preferences = structuredClone(current.preferences),
    saved = storage.get("preferences", null);
  const legacyPen = storage.get("pen", null),
    legacyColors = storage.get("matadorPenColors", {}),
    legacyNames = storage.get("pvpNames", null);
  function pen(value, fallback) {
    const selection = {
      pen:
        typeof value?.pen === "string" && Object.hasOwn(engine.PENS, value.pen)
          ? value.pen
          : fallback.pen,
      colors: { ...fallback.colors },
    };
    for (const [kind, color] of Object.entries(value?.colors || {}))
      if (
        Object.hasOwn(engine.PENS, kind) &&
        typeof color === "string" &&
        /^#[0-9a-f]{6}$/i.test(color)
      )
        selection.colors[kind] = color;
    return selection;
  }
  function difficulty(value, fallback) {
    return typeof value === "string" && Object.hasOwn(engine.LEVELS, value)
      ? value
      : fallback;
  }
  function algorithm(value, fallback) {
    return typeof value === "string" && Object.hasOwn(engine.ALGOS, value)
      ? value
      : fallback;
  }
  for (const key of ["vs", "train"]) {
    const old = preferences[key],
      value = saved?.[key] || {
        ...old,
        pen: legacyPen || old.pen,
        colors: { ...old.colors, ...legacyColors },
      };
    preferences[key] = {
      ...pen(value, old),
      difficulty: difficulty(value.difficulty, old.difficulty),
    };
  }
  preferences.train.algorithm =
    saved?.train?.algorithm === "auto"
      ? "auto"
      : algorithm(saved?.train?.algorithm, current.preferences.train.algorithm);
  const ai = saved?.ai || {},
    pvp = saved?.pvp || {};
  preferences.ai = {
    a: algorithm(ai.a, preferences.ai.a),
    b: algorithm(ai.b, preferences.ai.b),
    sa: difficulty(ai.sa, preferences.ai.sa),
    sb: difficulty(ai.sb, preferences.ai.sb),
    speed: CONFIG_LIMITS.speeds.includes(ai.speed)
      ? ai.speed
      : preferences.ai.speed,
    penA: pen(ai.penA, preferences.ai.penA),
    penB: pen(ai.penB, preferences.ai.penB),
  };
  preferences.pvp = {
    name1: String(pvp.name1 || legacyNames?.[0] || preferences.pvp.name1).slice(
      0,
      CONFIG_LIMITS.nameLength,
    ),
    name2: String(pvp.name2 || legacyNames?.[1] || preferences.pvp.name2).slice(
      0,
      CONFIG_LIMITS.nameLength,
    ),
    goal: CONFIG_LIMITS.goals.includes(pvp.goal)
      ? pvp.goal
      : preferences.pvp.goal,
    pen1: pen(pvp.pen1, preferences.pvp.pen1),
    pen2: pen(pvp.pen2, preferences.pvp.pen2),
  };
  ui.set({ settings, preferences });
}
