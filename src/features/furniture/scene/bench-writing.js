/** Sparse edge graffiti, drawn once as a transparent layer over the real wood. */
export function drawBenchWriting(canvas, font, variation = 0, hero = false) {
  const g = canvas.getContext("2d"),
    w = canvas.width,
    h = canvas.height;
  g.clearRect(0, 0, w, h);
  let seed = 101 + variation * 73;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const glyphs = {
    A: [
      [
        [0, 1],
        [0.45, 0],
        [1, 1],
      ],
      [
        [0.2, 0.58],
        [0.78, 0.58],
      ],
    ],
    B: [
      [
        [0, 1],
        [0, 0],
        [0.65, 0],
        [0.9, 0.2],
        [0.62, 0.48],
        [0, 0.48],
      ],
      [
        [0.62, 0.48],
        [1, 0.7],
        [0.75, 1],
        [0, 1],
      ],
    ],
    C: [
      [
        [1, 0.1],
        [0.7, 0],
        [0.15, 0.12],
        [0, 0.55],
        [0.2, 0.92],
        [0.75, 1],
        [1, 0.87],
      ],
    ],
    E: [
      [
        [1, 0],
        [0, 0],
        [0, 1],
        [1, 1],
      ],
      [
        [0, 0.48],
        [0.75, 0.48],
      ],
    ],
    H: [
      [
        [0, 0],
        [0, 1],
      ],
      [
        [1, 0],
        [1, 1],
      ],
      [
        [0, 0.5],
        [1, 0.5],
      ],
    ],
    J: [
      [
        [0.25, 0],
        [1, 0],
      ],
      [
        [0.8, 0],
        [0.8, 0.8],
        [0.55, 1],
        [0.15, 0.95],
        [0, 0.7],
      ],
    ],
    K: [
      [
        [0, 0],
        [0, 1],
      ],
      [
        [1, 0],
        [0, 0.55],
        [1, 1],
      ],
    ],
    L: [
      [
        [0, 0],
        [0, 1],
        [1, 1],
      ],
    ],
    N: [
      [
        [0, 1],
        [0, 0],
        [1, 1],
        [1, 0],
      ],
    ],
    P: [
      [
        [0, 1],
        [0, 0],
        [0.7, 0],
        [1, 0.2],
        [0.75, 0.5],
        [0, 0.5],
      ],
    ],
    R: [
      [
        [0, 1],
        [0, 0],
        [0.7, 0],
        [1, 0.2],
        [0.75, 0.5],
        [0, 0.5],
      ],
      [
        [0.5, 0.5],
        [1, 1],
      ],
    ],
    S: [
      [
        [1, 0.08],
        [0.4, 0],
        [0, 0.2],
        [0.2, 0.45],
        [0.8, 0.55],
        [1, 0.8],
        [0.65, 1],
        [0, 0.9],
      ],
    ],
    T: [
      [
        [0, 0],
        [1, 0],
      ],
      [
        [0.5, 0],
        [0.5, 1],
      ],
    ],
  };
  const text = (value, x, y, angle, size, carved = false) => {
    g.save();
    g.translate(x * w, y * h);
    g.rotate(angle);
    const pixels = size * w;
    if (carved) {
      // Individual, slightly uneven cut strokes instead of a filled display font.
      g.lineCap = "round";
      g.lineJoin = "round";
      let left = -value.length * pixels * 0.36;
      for (const letter of value.toUpperCase()) {
        g.save();
        g.translate(left, (random() - 0.5) * pixels * 0.1);
        g.rotate((random() - 0.5) * 0.12);
        for (const points of glyphs[letter] || []) {
          const path = points.map(([px, py]) => [
            px * pixels * 0.52 + (random() - 0.5) * pixels * 0.025,
            (py - 0.5) * pixels,
          ]);
          for (const light of [true, false]) {
            g.beginPath();
            path.forEach(([px, py], index) => {
              const dx = light ? 0.6 : 0,
                dy = light ? 0.7 : 0;
              if (index === 0) g.moveTo(px + dx, py + dy);
              else g.lineTo(px + dx, py + dy);
            });
            g.strokeStyle = light
              ? "rgba(255,237,202,.25)"
              : `rgba(72,49,27,${0.26 + random() * 0.14})`;
            g.lineWidth = Math.max(0.55, pixels * 0.028);
            g.stroke();
          }
        }
        g.restore();
        left += pixels * (0.66 + random() * 0.1);
      }
    } else {
      g.font = `${pixels}px ${font}`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillStyle = "rgba(45,53,70,0.25)";
      g.fillText(value, 0, 0);
    }
    g.restore();
  };
  const initials = ["AJ", "RK", "SR", "SK", "RN", "AP"];
  const i = ((variation % 6) + 6) % 6;
  text(initials[i], 0.13, 0.86, -0.13, 0.035, true);
  text(
    hero ? "LAST BENCH" : `Class ${8 + (i % 3)}`,
    0.91,
    0.28,
    Math.PI / 2 + 0.03,
    0.025,
    true,
  );
  text(hero ? "Raju" : initials[(i + 2) % 6], 0.21, 0.13, 0.09, 0.027);
  if (hero) text("24", 0.67, 0.93, -0.07, 0.021);
  // Uneven tally strokes and a tiny unfinished tic-tac-toe near the margins.
  g.strokeStyle = "rgba(66,48,29,0.32)";
  g.lineWidth = Math.max(0.6, w * 0.0012);
  g.lineCap = "round";
  g.beginPath();
  for (let n = 0; n < 4; n++) {
    const x = w * (0.72 + n * 0.012);
    g.moveTo(x, h * 0.12);
    g.lineTo(x - w * 0.002, h * (0.144 + n * 0.001));
  }
  g.moveTo(w * 0.709, h * 0.14);
  g.lineTo(w * 0.768, h * 0.126);
  g.stroke();
  g.strokeStyle = "rgba(42,55,86,0.28)";
  g.beginPath();
  for (const n of [1, 2]) {
    g.moveTo(w * (0.77 + n * 0.018), h * 0.77);
    g.lineTo(w * (0.769 + n * 0.018), h * 0.812);
    g.moveTo(w * 0.77, h * (0.77 + n * 0.014));
    g.lineTo(w * 0.824, h * (0.771 + n * 0.014));
  }
  g.moveTo(w * 0.773, h * 0.772);
  g.lineTo(w * 0.784, h * 0.782);
  g.moveTo(w * 0.784, h * 0.772);
  g.lineTo(w * 0.773, h * 0.782);
  g.stroke();
  // Light abrasions collect near the used edges; the central playing area stays clean.
  g.lineWidth = Math.max(0.5, w * 0.0007);
  for (let n = 0; n < (hero ? 70 : 24); n++) {
    const x = random() * w,
      y =
        (random() < 0.5 ? 0.035 + random() * 0.05 : 0.915 + random() * 0.05) *
        h;
    g.strokeStyle = n % 3 ? "rgba(252,237,211,.16)" : "rgba(99,74,46,.12)";
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + ((3 + random() * 13) * w) / 1024, y + random() * 1.5);
    g.stroke();
  }
  // Broken ink and scuffed groove edges prevent a uniformly printed overlay.
  g.globalCompositeOperation = "destination-out";
  g.strokeStyle = "rgba(0,0,0,.35)";
  g.lineWidth = Math.max(0.5, w * 0.0006);
  for (let n = 0; n < 350; n++) {
    const x = random() * w,
      y = random() * h;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + random() * w * 0.012, y + 0.3);
    g.stroke();
  }
  g.globalCompositeOperation = "source-over";
}
