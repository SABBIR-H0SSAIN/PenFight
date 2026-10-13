function isDark() {
  const d = document.documentElement.dataset.theme;
  return (
    d === "dark" || (!d && matchMedia("(prefers-color-scheme: dark)").matches)
  );
}
function themeVar(n) {
  return getComputedStyle(document.documentElement).getPropertyValue(n).trim();
}
export function drawTree(c, L) {
  const dpr = Math.min(2, devicePixelRatio || 1),
    w = c.clientWidth,
    h = c.clientHeight;
  if (c.width !== w * dpr) {
    c.width = w * dpr;
    c.height = h * dpr;
  }
  const g = c.getContext("2d");
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  const nodes = L.nodes || [];
  if (!nodes.length) {
    g.fillStyle = themeVar("--muted");
    g.font = "13px sans-serif";
    g.fillText("Search tree appears while the AI thinks.", 12, 24);
    return;
  }
  const maxD = Math.max(1, ...nodes.map((n) => n.d)),
    by = [];
  nodes.forEach((n) => {
    (by[n.d] = by[n.d] || []).push(n);
  });
  const pos = new Map();
  by.forEach((arr, d) => {
    arr.forEach((n, i) => {
      pos.set(n.id, {
        x: 14 + (w - 28) * (arr.length === 1 ? 0.5 : i / (arr.length - 1)),
        y: 18 + ((h - 36) * d) / maxD,
      });
    });
  });
  const selSet = new Set();
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const sel = L.selected && L.selected.label;
  nodes.forEach((n) => {
    if (
      n.goal ||
      (sel && n.d === 1 && (n.label === sel || sel.startsWith(n.label)))
    ) {
      let q = n;
      while (q) {
        selSet.add(q.id);
        q = byId.get(q.p);
      }
    }
  });
  g.lineWidth = 1;
  nodes.forEach((n) => {
    if (n.p < 0) return;
    const a = pos.get(n.p),
      b = pos.get(n.id);
    if (!a || !b) return;
    g.strokeStyle = selSet.has(n.id)
      ? themeVar("--accent")
      : themeVar("--line");
    g.globalAlpha = selSet.has(n.id) ? 1 : n.order ? 0.7 : 0.25;
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(b.x, b.y);
    g.stroke();
  });
  g.globalAlpha = 1;
  const big = nodes.length < 120;
  nodes.forEach((n) => {
    const p = pos.get(n.id);
    let r = big ? 4 : 2;
    if (n.n) r = 2 + Math.min(7, Math.sqrt(n.n) * 0.7);
    const v = n.v;
    g.fillStyle = n.goal
      ? themeVar("--good")
      : v == null
        ? themeVar("--muted")
        : "hsl(" +
          Math.round(220 - v * 1.0) +
          " 65% " +
          (isDark() ? "62%" : "48%") +
          ")";
    g.globalAlpha = n.order || n.d === 0 ? 1 : 0.35;
    if (selSet.has(n.id)) {
      g.strokeStyle = themeVar("--fg");
      g.lineWidth = 1.5;
    }
    g.beginPath();
    g.arc(p.x, p.y, r, 0, 6.283);
    g.fill();
    if (selSet.has(n.id)) g.stroke();
  });
  g.globalAlpha = 1;
  g.fillStyle = themeVar("--muted");
  g.font = "11px ui-monospace,monospace";
  const lbl = ["start", "target", "angle", "power", "spin"];
  for (let d = 0; d <= maxD; d++) {
    if (by[d] && by[d].length)
      g.fillText(
        L.algo === "mcts"
          ? ["root", "my shot", "reply", "my shot"][d] || ""
          : L.algo === "minimax"
            ? ["AI", "candidate", "reply"][d] || ""
            : L.algo === "fuzzy"
              ? ["fuzzy", "strategy"][d] || ""
              : lbl[d] || "",
        2,
        18 + ((h - 36) * d) / maxD - 7,
      );
  }
}
