import { storage } from "./storage.js";
/** Read storage only after mounting, and validate it before touching the renderer/engine. */
export function hydrateState(engine, ui) {
  const current = ui.get(),
    defaults = current.settings,
    raw = storage.get("settings", {});
  const settings = { ...defaults };
  for (const key of Object.keys(defaults))
    if (typeof raw?.[key] === typeof defaults[key]) settings[key] = raw[key];
  settings.name = settings.name.slice(0, 14);
  settings.vol = Number.isFinite(settings.vol)
    ? engine.clamp(settings.vol, 0, 1)
    : defaults.vol;
  settings.friction = Number.isFinite(settings.friction)
    ? engine.clamp(settings.friction, 0.8, 1.1)
    : defaults.friction;
  if (!["auto", "low", "medium", "high"].includes(settings.quality))
    settings.quality = defaults.quality;
  if (!["oak", "maple", "walnut"].includes(settings.tableSurface))
    settings.tableSurface = defaults.tableSurface;
  const preferences = structuredClone(current.preferences),
    saved = storage.get("preferences", null);
  const legacyPen = storage.get("pen", "ball"),
    legacyColors = storage.get("matadorPenColors", {}),
    legacyNames = storage.get("pvpNames", ["Player 1", "Player 2"]);
  function pen(value, fallback) {
    const selection = {
      pen: Object.hasOwn(engine.PENS, value?.pen) ? value.pen : fallback.pen,
      colors: {},
    };
    for (const [kind, color] of Object.entries(value?.colors || {}))
      if (Object.hasOwn(engine.PENS, kind) && /^#[0-9a-f]{6}$/i.test(color))
        selection.colors[kind] = color;
    return selection;
  }
  function difficulty(value, fallback) {
    return Object.hasOwn(engine.LEVELS, value) ? value : fallback;
  }
  function algorithm(value, fallback) {
    return Object.hasOwn(engine.ALGOS, value) ? value : fallback;
  }
  for (const key of ["vs", "train"]) {
    const old = preferences[key],
      value = saved?.[key] || { pen: legacyPen, colors: legacyColors };
    preferences[key] = {
      ...pen(value, old),
      difficulty: difficulty(value.difficulty, old.difficulty),
    };
  }
  preferences.train.algorithm =
    saved?.train?.algorithm === "auto"
      ? "auto"
      : algorithm(saved?.train?.algorithm, "auto");
  const ai = saved?.ai || {},
    pvp = saved?.pvp || {};
  preferences.ai = {
    a: algorithm(ai.a, "astar"),
    b: algorithm(ai.b, "mcts"),
    sa: difficulty(ai.sa, "advanced"),
    sb: difficulty(ai.sb, "advanced"),
    speed: [1, 2, 4].includes(ai.speed) ? ai.speed : 2,
    penA: pen(ai.penA, preferences.ai.penA),
    penB: pen(ai.penB, preferences.ai.penB),
  };
  preferences.pvp = {
    name1: String(pvp.name1 || legacyNames?.[0] || "Player 1").slice(0, 14),
    name2: String(pvp.name2 || legacyNames?.[1] || "Player 2").slice(0, 14),
    goal: [1, 3, 5].includes(pvp.goal) ? pvp.goal : 3,
    pen1: pen(pvp.pen1, preferences.pvp.pen1),
    pen2: pen(pvp.pen2, preferences.pvp.pen2),
  };
  ui.set({ settings, preferences });
}
