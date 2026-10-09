/** Match setup is independent of React, rendering, and input handling. */
export function penColorFor(PF, selection) {
  return (
    selection.colors[selection.pen] ||
    PF.PEN_CUSTOM[selection.pen]?.default ||
    null
  );
}
export function versusPenColors(PF, selection) {
  const human = penColorFor(PF, selection) || PF.PENS[selection.pen].color;
  const rgb = (hex) => {
    const n = parseInt(hex.replace("#", ""), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const base = rgb(human),
    palette = ["#235bd1", "#d64536", "#148267", "#e5b431"];
  const distance = (color) =>
    rgb(color).reduce((sum, value, i) => sum + (value - base[i]) ** 2, 0);
  const ai = palette.reduce((best, color) =>
    distance(color) > distance(best) ? color : best,
  );
  return [human, ai];
}
export function aiConfigFor(PF, spec) {
  const L = PF.LEVELS[spec.level];
  return {
    algo: spec.algo || L.algo,
    noise: spec.noise || L.noise,
    mistake: L.mistake,
    level: spec.level,
    mem: PF.newMemory(spec.level),
    think: L.think,
  };
}
export function buildMatchOptions(PF, settings, preferences, mode) {
  if (mode === "vs" || mode === "train") {
    const selection = preferences[mode === "vs" ? "vs" : "train"],
      L = PF.LEVELS[selection.difficulty];
    const algorithm =
      mode === "train" && selection.algorithm !== "auto"
        ? selection.algorithm
        : L.algo;
    return {
      humans: [true, false],
      names: [settings.name || "You", L.ai],
      pens: [selection.pen, selection.pen],
      penColors: versusPenColors(PF, selection),
      goal: mode === "train" ? 99 : 3,
      ai: [
        null,
        aiConfigFor(PF, { level: selection.difficulty, algo: algorithm }),
      ],
      title: mode === "train" ? "AI Training Lab" : "Human vs AI · " + L.name,
      lab: mode === "train",
    };
  }
  if (mode === "pvp") {
    const p = preferences.pvp,
      n1 = p.name1.trim() || "Player 1",
      n2 = p.name2.trim() || "Player 2";
    return {
      humans: [true, true],
      names: [n1, n1 === n2 ? n2 + " (2)" : n2],
      pens: [p.pen1.pen, p.pen2.pen],
      penColors: [penColorFor(PF, p.pen1), penColorFor(PF, p.pen2)],
      goal: p.goal,
      ai: [null, null],
      title: "Human vs Human",
      lab: false,
      note: "Pass and play.",
    };
  }
  const a = preferences.ai;
  return {
    humans: [false, false],
    names: [PF.SHORT[a.a], PF.SHORT[a.b] + (a.a === a.b ? " (2)" : "")],
    pens: [a.penA.pen, a.penB.pen],
    penColors: [penColorFor(PF, a.penA), penColorFor(PF, a.penB)],
    goal: 5,
    ai: [
      aiConfigFor(PF, { level: a.sa, algo: a.a }),
      aiConfigFor(PF, { level: a.sb, algo: a.b }),
    ],
    title: "AI vs AI Simulation",
    lab: true,
    speed: a.speed,
    ties: [0x1f3fa0, 0x8a1f2c],
    note: "Each AI has its own selected pen.",
  };
}
