import { gameConfig } from "../../../config/config.ts";
/** Original light classroom-bench grain, scratches and carved writing. */
export function createOriginalBenchTexture(
  deps,
  surface = "oak",
  options = {},
) {
  const { cvs, FONT, R, W, H } = deps;
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  function woodTexture(w, h, carve, surface = "oak") {
    const c = cvs(w, h),
      g = c.getContext("2d");
    const gr = g.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, "#b27839");
    gr.addColorStop(0.5, "#c58b48");
    gr.addColorStop(1, "#b57b3a");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < w / 2.2; i++) {
      // grain
      const x = rand() * w,
        a = 0.04 + rand() * 0.1;
      g.strokeStyle =
        rand() < 0.6
          ? "rgba(70,36,10," + a + ")"
          : "rgba(255,220,160," + a * 0.8 + ")";
      g.lineWidth = 0.6 + rand() * 1.6;
      g.beginPath();
      g.moveTo(x, 0);
      for (let y = 0; y <= h; y += 40)
        g.lineTo(x + Math.sin(y * 0.012 + i) * 3 + (rand() - 0.5) * 1.2, y);
      g.stroke();
    }
    g.strokeStyle = "rgba(40,20,5,.45)";
    g.lineWidth = 2;
    [w / 3, (2 * w) / 3].forEach((x) => {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, h);
      g.stroke();
    }); // plank seams
    for (let i = 0; i < 14; i++) {
      const x = rand() * w,
        y = rand() * h,
        r = 40 + rand() * 120,
        rg = g.createRadialGradient(x, y, 0, x, y, r);
      const d = rand() < 0.5;
      rg.addColorStop(0, d ? "rgba(80,40,10,.16)" : "rgba(255,230,180,.14)");
      rg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = rg;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < 260; i++) {
      // scratches
      const x = rand() * w,
        y = rand() * h,
        a = rand() < 0.75 ? Math.PI / 2 + (rand() - 0.5) * 0.7 : rand() * 6.28,
        l = 20 + rand() * 150;
      g.strokeStyle =
        rand() < 0.65
          ? "rgba(255,238,205," + (0.18 + rand() * 0.3) + ")"
          : "rgba(50,25,8," + (0.2 + rand() * 0.3) + ")";
      g.lineWidth = 0.7 + rand() * 1.1;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
    for (let i = 0; i < 9; i++) {
      // pen marks / doodles
      const x = 40 + rand() * (w - 80),
        y = 40 + rand() * (h - 80);
      g.strokeStyle =
        rand() < 0.5 ? "rgba(25,45,150,.55)" : "rgba(20,20,26,.5)";
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(x, y);
      for (let k = 0; k < 7; k++)
        g.lineTo(x + (rand() - 0.5) * 36, y + (rand() - 0.5) * 36);
      g.stroke();
    }
    g.fillStyle = "rgba(30,30,120,.5)";
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.arc(rand() * w, rand() * h, 1.5 + rand() * 2.5, 0, 6.28);
      g.fill();
    }
    g.strokeStyle = "rgba(70,35,12,.28)";
    g.lineWidth = 3;
    g.beginPath();
    g.arc(w * 0.62, h * 0.2, 26, 0, 6.28);
    g.stroke(); // cup ring
    for (const tx of carve || []) {
      // carved writing: dark groove + light lip
      g.save();
      g.translate(tx.x * w, tx.y * h);
      g.rotate(tx.r || 0);
      g.font = (tx.s || 34) + "px " + FONT;
      g.textAlign = "center";
      g.fillStyle = "rgba(255,230,190,.5)";
      g.fillText(tx.t, 1.2, 1.4);
      g.fillStyle = "rgba(48,24,6,.78)";
      g.fillText(tx.t, 0, 0);
      g.restore();
    }
    g.strokeStyle = "rgba(60,30,8,.6)";
    g.lineWidth = 2;
    g.beginPath(); // tally marks
    for (let i = 0; i < 4; i++) {
      g.moveTo(w * 0.14 + i * 8, h * 0.14);
      g.lineTo(w * 0.14 + i * 8, h * 0.14 + 28);
    }
    g.moveTo(w * 0.14 - 6, h * 0.14 + 22);
    g.lineTo(w * 0.14 + 32, h * 0.14 + 6);
    g.stroke();
    const eg = (x0, y0, x1, y1) => {
      const l = g.createLinearGradient(x0, y0, x1, y1);
      l.addColorStop(0, "rgba(60,30,8,.55)");
      l.addColorStop(1, "rgba(60,30,8,0)");
      g.fillStyle = l;
      return l;
    };
    g.fillStyle = eg(0, 0, 22, 0);
    g.fillRect(0, 0, 22, h);
    g.fillStyle = eg(w, 0, w - 22, 0);
    g.fillRect(w - 22, 0, 22, h);
    g.fillStyle = eg(0, 0, 0, 22);
    g.fillRect(0, 0, w, 22);
    g.fillStyle = eg(0, h, 0, h - 22);
    g.fillRect(0, h - 22, w, 22);
    for (let i = 0; i < 90; i++) {
      const side = Math.floor(rand() * 4),
        p = rand();
      const x = side < 2 ? p * w : side === 2 ? rand() * 12 : w - rand() * 12,
        y = side < 2 ? (side === 0 ? rand() * 12 : h - rand() * 12) : p * h;
      g.fillStyle = rand() < 0.5 ? "rgba(235,205,150,.7)" : "rgba(40,20,5,.65)";
      g.fillRect(x, y, 2 + rand() * 4, 2 + rand() * 3);
    } // edge damage
    if (surface !== "oak") {
      g.save();
      g.globalCompositeOperation = "color";
      g.fillStyle = surface === "maple" ? "#d9c89f" : "#60452f";
      g.fillRect(0, 0, w, h);
      g.restore();
    }
    return c;
  }
  const w =
    options.resolution ||
    gameConfig.graphics.quality[R.quality || "high"].woodTextureSize;
  const h = Math.round((w * H) / W);
  const carve = [
    { t: "AJ", x: 0.8, y: 0.88, r: Math.PI, s: 54 },
    { t: "Raju", x: 0.18, y: 0.78, r: 0.1, s: 36 },
    { t: "LAST BENCH", x: 0.9, y: 0.4, r: Math.PI / 2, s: 40 },
    { t: "gdu", x: 0.17, y: 0.52, r: -Math.PI / 2, s: 28 },
    { t: "♥", x: 0.5, y: 0.12, r: 0.2, s: 44 },
    { t: "↑", x: 0.72, y: 0.58, r: 0.2, s: 36 },
    { t: "PF ’22", x: 0.3, y: 0.3, r: -0.15, s: 30 },
  ];
  const marks = options.background
    ? [
        {
          t: ["AJ", "RK", "SR", "SK", "RN", "AP"][options.variation || 0],
          x: 0.14,
          y: 0.83,
          r: -0.13,
          s: 34,
        },
        {
          t: `Class ${8 + ((options.variation || 0) % 3)}`,
          x: 0.82,
          y: 0.22,
          r: 0.1,
          s: 24,
        },
      ]
    : carve;
  const painted = woodTexture(
    w,
    h,
    marks.map((mark) => ({ ...mark, s: (mark.s * w) / 1024 })),
    surface,
  );
  // WebGL 1 otherwise silently shrinks the 1024×1707 canvas to 1024×1024.
  // Resample upward once so mipmaps retain the original longitudinal detail.
  const potWidth = 2 ** Math.ceil(Math.log2(w));
  const potHeight = 2 ** Math.ceil(Math.log2(h));
  if (w === potWidth && h === potHeight) return painted;
  const canvas = cvs(potWidth, potHeight);
  canvas.getContext("2d").drawImage(painted, 0, 0, potWidth, potHeight);
  return canvas;
}
