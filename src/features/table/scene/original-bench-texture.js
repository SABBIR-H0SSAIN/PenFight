import { gameConfig } from "../../../config/config.ts";
import { paintBenchHandwriting } from "./bench-handwriting.js";
/** Light classroom-bench grain with worn student notes and pencil doodles. */
export function createOriginalBenchTexture(
  deps,
  surface = "oak",
  options = {},
) {
  const { cvs, R, W, H } = deps;
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  function sketch(g, scale, draw) {
    g.save();
    g.scale(scale, scale);
    g.lineCap = "round";
    g.lineJoin = "round";
    g.lineWidth = 2.1;
    g.strokeStyle = "rgba(38,34,31,.38)";
    draw();
    g.translate(-0.65, -0.8);
    g.lineWidth = 0.8;
    g.strokeStyle = "rgba(249,224,184,.42)";
    draw();
    g.restore();
  }
  function schoolBenchDoodle(g, x, y, scale) {
    g.save();
    g.translate(x, y);
    g.rotate(-0.055);
    sketch(g, scale, () => {
      // Familiar side view: a thick wooden top, steel legs and crossbar.
      g.beginPath();
      g.moveTo(-70, -20);
      g.lineTo(67, -20);
      g.lineTo(62, -10);
      g.lineTo(-65, -10);
      g.closePath();
      g.stroke();
      g.beginPath();
      g.moveTo(-53, -9);
      g.lineTo(-47, 47);
      g.moveTo(50, -9);
      g.lineTo(44, 47);
      g.moveTo(-48, 31);
      g.lineTo(46, 31);
      g.moveTo(-57, 47);
      g.lineTo(-39, 47);
      g.moveTo(36, 47);
      g.lineTo(54, 47);
      g.stroke();
      // Notebook left on the tabletop gives the little sketch its classroom context.
      g.beginPath();
      g.moveTo(-13, -22);
      g.lineTo(-10, -39);
      g.lineTo(18, -38);
      g.lineTo(20, -22);
      g.moveTo(3, -38);
      g.lineTo(4, -23);
      g.stroke();
    });
    g.restore();
  }
  function openBookDoodle(g, x, y, scale) {
    g.save();
    g.translate(x, y);
    g.rotate(0.08);
    sketch(g, scale, () => {
      g.beginPath();
      g.moveTo(0, 34);
      g.quadraticCurveTo(-22, 19, -51, 24);
      g.lineTo(-48, -24);
      g.quadraticCurveTo(-20, -27, 0, -12);
      g.quadraticCurveTo(20, -27, 48, -24);
      g.lineTo(51, 24);
      g.quadraticCurveTo(22, 19, 0, 34);
      g.closePath();
      g.moveTo(0, -12);
      g.lineTo(0, 34);
      for (const yy of [-10, 0, 10, 20]) {
        g.moveTo(-41, yy);
        g.lineTo(-10, yy + 4);
        g.moveTo(10, yy + 4);
        g.lineTo(41, yy);
      }
      g.stroke();
    });
    g.restore();
  }
  function pencilDoodle(g, x, y, scale) {
    g.save();
    g.translate(x, y);
    g.rotate(-0.6);
    sketch(g, scale, () => {
      g.beginPath();
      g.moveTo(-66, -5);
      g.lineTo(-49, -10);
      g.lineTo(48, -10);
      g.lineTo(59, -5);
      g.lineTo(48, 0);
      g.lineTo(-49, 0);
      g.closePath();
      g.moveTo(-49, -10);
      g.lineTo(-49, 0);
      g.moveTo(40, -10);
      g.lineTo(40, 0);
      g.stroke();
      g.beginPath();
      g.moveTo(-66, -5);
      g.lineTo(-74, -5);
      g.stroke();
      for (let i = -25; i <= 22; i += 12) {
        g.beginPath();
        g.moveTo(i, -9);
        g.lineTo(i + 4, -1);
        g.stroke();
      }
    });
    g.restore();
  }
  function paperPlaneDoodle(g, x, y, scale) {
    g.save();
    g.translate(x, y);
    g.rotate(-0.1);
    sketch(g, scale, () => {
      g.beginPath();
      g.moveTo(-43, 17);
      g.lineTo(47, -19);
      g.lineTo(22, 24);
      g.lineTo(10, 4);
      g.lineTo(-43, 17);
      g.moveTo(10, 4);
      g.lineTo(47, -19);
      g.lineTo(9, 13);
      g.stroke();
      g.beginPath();
      g.moveTo(26, 20);
      g.quadraticCurveTo(43, 26, 55, 16);
      g.stroke();
    });
    g.restore();
  }
  function studentDoodles(g, w, h) {
    const unit = w / 1024;
    g.save();
    g.translate(w * 0.35, h * 0.19);
    g.rotate(0.08);
    g.scale(unit, unit);
    g.strokeStyle = "rgba(27,53,97,.43)";
    g.lineWidth = 1.7;
    g.lineCap = "round";
    g.beginPath();
    // A half-finished game, with hurried grid lines and two different hands.
    g.moveTo(-14, -40);
    g.lineTo(-16, 38);
    g.moveTo(12, -37);
    g.lineTo(15, 39);
    g.moveTo(-42, -13);
    g.lineTo(39, -15);
    g.moveTo(-40, 13);
    g.lineTo(42, 11);
    g.moveTo(-35, -33);
    g.lineTo(-22, -20);
    g.moveTo(-22, -35);
    g.lineTo(-34, -20);
    g.moveTo(21, 20);
    g.lineTo(35, 34);
    g.moveTo(35, 20);
    g.lineTo(20, 35);
    g.stroke();
    g.beginPath();
    g.ellipse(0, 0, 8, 9, -0.2, 0, Math.PI * 2);
    g.stroke();
    g.restore();

    g.save();
    g.translate(w * 0.38, h * 0.88);
    g.rotate(-0.13);
    g.scale(unit, unit);
    g.strokeStyle = "rgba(40,38,33,.4)";
    g.lineWidth = 1.65;
    g.lineCap = "round";
    g.beginPath();
    g.ellipse(0, 0, 23, 21, 0.1, 0, Math.PI * 2);
    g.moveTo(-8, -7);
    g.lineTo(-7, -2);
    g.moveTo(7, -8);
    g.lineTo(8, -3);
    g.moveTo(-11, 5);
    g.quadraticCurveTo(0, 19, 12, 4);
    g.stroke();
    g.restore();

    g.save();
    g.translate(w * 0.82, h * 0.7);
    g.rotate(0.15);
    g.scale(unit, unit);
    g.strokeStyle = "rgba(59,42,63,.42)";
    g.lineWidth = 1.8;
    g.beginPath();
    g.moveTo(0, 21);
    g.bezierCurveTo(-47, -7, -18, -32, 0, -12);
    g.bezierCurveTo(21, -36, 44, -8, 0, 21);
    g.moveTo(-36, 20);
    g.lineTo(34, -17);
    g.moveTo(24, -17);
    g.lineTo(34, -17);
    g.lineTo(31, -7);
    g.stroke();
    g.restore();

    g.save();
    g.translate(w * 0.16, h * 0.61);
    g.scale(unit, unit);
    g.strokeStyle = "rgba(35,57,88,.36)";
    g.lineWidth = 1.45;
    for (const [x, y, radius] of [
      [0, 0, 18],
      [37, -22, 9],
    ]) {
      g.beginPath();
      for (let i = 0; i <= 5; i++) {
        const angle = -Math.PI / 2 + i * Math.PI * 0.8;
        const xx = x + Math.cos(angle) * radius;
        const yy = y + Math.sin(angle) * radius;
        if (i === 0) g.moveTo(xx, yy);
        else g.lineTo(xx, yy);
      }
      g.stroke();
    }
    g.restore();
  }
  function woodTexture(w, h, carve, surface = "oak", withDoodles = false) {
    const c = cvs(w, h),
      g = c.getContext("2d");
    const unit = w / 1024;
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
    for (let i = 0; i < 175; i++) {
      // scratches
      const x = rand() * w,
        y = rand() * h,
        a = rand() < 0.75 ? Math.PI / 2 + (rand() - 0.5) * 0.7 : rand() * 6.28,
        l = (20 + rand() * 150) * unit;
      g.strokeStyle =
        rand() < 0.65
          ? "rgba(255,238,205," + (0.18 + rand() * 0.3) + ")"
          : "rgba(50,25,8," + (0.2 + rand() * 0.3) + ")";
      g.lineWidth = (0.7 + rand() * 1.1) * unit;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
    if (!withDoodles) {
      for (let i = 0; i < 6; i++) {
        // Worn ballpoint marks remain on the surrounding classroom furniture.
        const x = 40 * unit + rand() * (w - 80 * unit),
          y = 40 * unit + rand() * (h - 80 * unit);
        g.strokeStyle =
          rand() < 0.5 ? "rgba(25,45,150,.55)" : "rgba(20,20,26,.5)";
        g.lineWidth = 1.4 * unit;
        g.beginPath();
        g.moveTo(x, y);
        for (let k = 0; k < 7; k++)
          g.lineTo(
            x + (rand() - 0.5) * 36 * unit,
            y + (rand() - 0.5) * 36 * unit,
          );
        g.stroke();
      }
    }
    if (withDoodles) {
      schoolBenchDoodle(g, w * 0.35, h * 0.56, unit * 0.78);
      openBookDoodle(g, w * 0.7, h * 0.58, unit * 0.82);
      pencilDoodle(g, w * 0.29, h * 0.37, unit * 0.8);
      paperPlaneDoodle(g, w * 0.72, h * 0.27, unit * 0.78);
    }
    g.strokeStyle = "rgba(70,35,12,.28)";
    g.lineWidth = 3 * unit;
    g.beginPath();
    g.arc(w * 0.62, h * 0.2, 26 * unit, 0, 6.28);
    g.stroke(); // cup ring
    g.strokeStyle = "rgba(60,30,8,.6)";
    g.lineWidth = 2 * unit;
    g.beginPath(); // tally marks
    for (let i = 0; i < 4; i++) {
      g.moveTo(w * 0.14 + i * 8 * unit, h * 0.14);
      g.lineTo(w * 0.14 + i * 8 * unit, h * 0.14 + 28 * unit);
    }
    g.moveTo(w * 0.14 - 6 * unit, h * 0.14 + 22 * unit);
    g.lineTo(w * 0.14 + 32 * unit, h * 0.14 + 6 * unit);
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
    // Ink sits over the finish, so maple/walnut cannot recolour it into wood.
    if (withDoodles) studentDoodles(g, w, h);
    for (const tx of carve || []) paintBenchHandwriting(g, tx, w, h, rand);
    return c;
  }
  const w =
    options.resolution ||
    gameConfig.graphics.quality[R.quality || "high"].woodTextureSize;
  const h = Math.round((w * H) / W);
  // Share only the immutable painted image, never a disposable GPU texture.
  // The cache belongs to one world and is released when that world is disposed.
  const cache = (R.benchTextureCanvases ||= new Map());
  const cacheKey = JSON.stringify([
    "school-desk-inscriptions-v5-drawn-strokes",
    w,
    h,
    surface,
    !!options.background,
    options.background ? options.variation || 0 : 0,
  ]);
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  const carve = [
    {
      t: "Sabbir was here",
      x: 0.71,
      y: 0.85,
      r: -0.09,
      s: 34,
      style: "signature",
      underline: true,
    },
    {
      t: "WHEN'S LUNCH?",
      x: 0.26,
      y: 0.76,
      r: -0.13,
      s: 24,
      style: "ballpoint",
    },
    {
      t: "NO HOMEWORK!",
      x: 0.78,
      y: 0.42,
      r: 0.07,
      s: 25,
      style: "ballpoint",
      underline: true,
    },
    { t: "SSC '26", x: 0.19, y: 0.47, r: -0.06, s: 30, style: "scratch" },
    { t: "x + y = ?", x: 0.78, y: 0.14, r: 0.12, s: 27, style: "pencil" },
    { t: "Hi!", x: 0.14, y: 0.3, r: -0.24, s: 26, style: "pencil" },
  ];
  const marks = options.background
    ? [
        {
          t: [
            "S. AHMED",
            "AKASH '23",
            "TANVIR",
            "N + ?",
            "BATCH '24",
            "WAS HERE",
          ][options.variation || 0],
          x: 0.14,
          y: 0.83,
          r: -0.11,
          s: 31,
          style: options.variation % 2 ? "pencil" : "scratch",
        },
        {
          t: ["ROLL 17", "SSC '25", "HI!", "MATHS :(", "BELL?", "A+B"][
            options.variation || 0
          ],
          x: 0.82,
          y: 0.22,
          r: 0.08,
          s: 25,
          style: options.variation % 2 ? "scratch" : "pencil",
        },
      ]
    : carve;
  const painted = woodTexture(
    w,
    h,
    marks.map((mark) => ({ ...mark, s: (mark.s * w) / 1024 })),
    surface,
    !options.background,
  );
  // WebGL 1 otherwise silently shrinks the 1024×1707 canvas to 1024×1024.
  // Resample upward once so mipmaps retain the original longitudinal detail.
  const potWidth = 2 ** Math.ceil(Math.log2(w));
  const potHeight = 2 ** Math.ceil(Math.log2(h));
  if (w === potWidth && h === potHeight) {
    cache.set(cacheKey, painted);
    return painted;
  }
  const canvas = cvs(potWidth, potHeight);
  canvas.getContext("2d").drawImage(painted, 0, 0, potWidth, potHeight);
  cache.set(cacheKey, canvas);
  return canvas;
}
