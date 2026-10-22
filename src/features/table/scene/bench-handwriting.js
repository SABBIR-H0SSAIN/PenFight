// Original single-stroke letters, in a ten-unit writing grid. The table texture
// needs no system/web fonts: its handwriting is identical on phones and desktops.
const glyphs = Object.fromEntries(
  Object.entries({
    A: [7, "0,10 3,0 4,0 7,10|1,6 6,6"],
    B: [6, "0,10 0,0 4,0 6,2 5,4 0,5|1,5 5,5 6,7 5,10 0,10"],
    C: [7, "7,1 5,0 2,1 0,4 0,7 2,10 5,10 7,8"],
    D: [7, "0,10 0,0 3,0 6,2 7,6 6,9 3,10 0,10"],
    E: [6, "6,0 0,0 0,10 6,10|0,5 5,5"],
    F: [6, "0,10 0,0 6,0|0,5 5,5"],
    G: [7, "7,2 5,0 2,1 0,4 0,7 2,10 6,10 7,6 4,6"],
    H: [7, "0,0 0,10|7,0 7,10|0,5 7,5"],
    I: [3, "0,0 3,0|1.5,0 1.5,10|0,10 3,10"],
    J: [6, "6,0 6,8 4,10 1,10 0,8"],
    K: [7, "0,0 0,10|7,0 0,6 7,10"],
    L: [6, "0,0 0,10 6,10"],
    M: [9, "0,10 0,0 4.5,6 9,0 9,10"],
    N: [7, "0,10 0,0 7,10 7,0"],
    O: [7, "3,0 1,1 0,4 0,7 2,10 5,10 7,7 7,3 5,0 3,0"],
    P: [6, "0,10 0,0 4,0 6,2 6,4 4,5 0,5"],
    Q: [7, "3,0 1,1 0,4 0,7 2,10 5,10 7,7 7,3 5,0 3,0|4,7 8,11"],
    R: [7, "0,10 0,0 4,0 6,2 6,4 4,5 0,5|3,5 7,10"],
    S: [6, "6,1 4,0 1,1 0,3 2,5 5,6 6,8 4,10 1,10 0,9"],
    T: [7, "0,0 7,0|3.5,0 3.5,10"],
    U: [7, "0,0 0,7 1,9 3,10 6,9 7,7 7,0"],
    V: [7, "0,0 3,10 4,10 7,0"],
    W: [10, "0,0 2,10 5,4 8,10 10,0"],
    X: [7, "0,0 7,10|7,0 0,10"],
    Y: [7, "0,0 3.5,5 7,0|3.5,5 3.5,10"],
    Z: [7, "0,0 7,0 0,10 7,10|1,5 6,5"],
    a: [6, "5,5 3,4 1,5 0,8 1,10 3,10 5,8 5,4 5,10 6,9"],
    b: [6, "0,0 0,10 0,6 2,4 4,4 6,6 5,9 3,10 0,9"],
    c: [5, "5,5 3,4 1,5 0,7 1,10 4,10 5,9"],
    d: [6, "5,5 3,4 1,5 0,8 1,10 3,10 5,8 5,0 5,10 6,9"],
    e: [5, "0,7 4,7 5,6 3,4 1,5 0,7 1,10 4,10 5,9"],
    f: [4, "1,13 1,3 2,0 4,0|0,5 4,5"],
    g: [6, "5,5 3,4 1,5 0,8 1,10 3,10 5,8 5,4 5,12 3,14 0,13"],
    h: [6, "0,0 0,10 0,6 2,4 4,4 5,6 5,10 6,9"],
    i: [2, "1,4 1,10 2,9|1,1 1.1,1.1"],
    j: [3, "2,4 2,12 1,14 -1,13|2,1 2.1,1.1"],
    k: [5, "0,0 0,10|5,4 0,8 5,10"],
    l: [3, "1,0 0,8 1,10 3,9"],
    m: [9, "0,4 0,10 0,6 2,4 4,5 4,10 4,6 6,4 8,5 8,10 9,9"],
    n: [6, "0,4 0,10 0,6 2,4 4,4 5,6 5,10 6,9"],
    o: [6, "3,4 1,4 0,7 1,10 4,10 6,7 5,5 3,4"],
    p: [6, "0,4 0,14|0,6 2,4 4,4 6,6 5,9 3,10 0,9"],
    q: [6, "5,5 3,4 1,5 0,8 1,10 3,10 5,8 5,4 5,14 7,12"],
    r: [5, "0,4 0,10 0,6 2,4 4,4 5,5"],
    s: [5, "5,5 3,4 1,5 1,6 4,8 5,9 3,10 0,9"],
    t: [4, "2,1 1,8 2,10 4,9|0,4 4,4"],
    u: [6, "0,4 0,8 1,10 3,10 5,8 5,4 5,10 6,9"],
    v: [6, "0,4 2,10 3,10 6,4"],
    w: [9, "0,4 2,10 4,6 6,10 9,4"],
    x: [5, "0,4 5,10|5,4 0,10"],
    y: [6, "0,4 1,9 3,10 5,7|6,4 4,12 2,14 0,13"],
    z: [5, "0,4 5,4 0,10 5,10"],
    0: [6, "3,0 0,2 0,8 3,10 6,8 6,2 3,0|1,9 5,1"],
    1: [4, "0,2 2,0 2,10|0,10 4,10"],
    2: [6, "0,2 2,0 5,0 6,2 5,4 0,10 6,10"],
    3: [6, "0,1 3,0 6,1 5,4 3,5 6,6 6,9 3,10 0,9"],
    4: [6, "4,10 4,0 0,7 6,7"],
    5: [6, "6,0 1,0 0,5 3,4 6,6 6,9 3,10 0,9"],
    6: [6, "6,1 3,0 0,4 0,8 2,10 5,9 6,7 4,5 1,5"],
    7: [6, "0,0 6,0 2,10|1,5 6,5"],
    8: [6, "3,5 0,3 1,0 4,0 6,2 3,5 0,7 1,10 5,10 6,7 3,5"],
    9: [6, "5,5 2,5 0,3 1,0 4,0 6,2 6,7 3,10 0,9"],
    "'": [2, "1,0 0,3"],
    "!": [2, "1,0 0.7,7|0.7,10 0.8,10.1"],
    "?": [6, "0,2 1,0 4,0 6,2 5,4 3,5 3,7|3,10 3.1,10.1"],
    "+": [6, "0,5 6,5|3,2 3,8"],
    "=": [6, "0,4 6,4|0,7 6,7"],
    "-": [5, "0,6 5,6"],
    ":": [2, "1,4 1.1,4.1|1,9 1.1,9.1"],
    "(": [3, "3,0 1,3 0,6 1,9 3,11"],
    ")": [3, "0,0 2,3 3,6 2,9 0,11"],
    ".": [2, "1,10 1.1,10.1"],
  }).map(([letter, [width, paths]]) => [
    letter,
    {
      width,
      paths: paths
        .split("|")
        .map((path) =>
          path.split(" ").map((point) => point.split(",").map(Number)),
        ),
    },
  ]),
);

const hands = {
  signature: {
    slant: 0.24,
    width: 0.9,
    nib: 0.43,
    smooth: true,
    ink: "#193a70",
    alpha: 0.68,
  },
  ballpoint: {
    slant: -0.06,
    width: 0.8,
    nib: 0.34,
    ink: "#263e63",
    alpha: 0.6,
  },
  pencil: {
    slant: 0.1,
    width: 1,
    nib: 0.27,
    smooth: true,
    ink: "#423c34",
    alpha: 0.43,
  },
  scratch: { slant: -0.1, width: 0.76, nib: 0.38, ink: "#4b2c17", alpha: 0.58 },
};

function trace(g, points, smooth) {
  g.beginPath();
  g.moveTo(...points[0]);
  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    if (smooth && i < points.length - 1) {
      const next = points[i + 1];
      g.quadraticCurveTo(
        ...point,
        (point[0] + next[0]) / 2,
        (point[1] + next[1]) / 2,
      );
    } else g.lineTo(...point);
  }
  g.stroke();
}

/** Each note has one writer's nib/slant, with natural stroke and baseline drift. */
export function paintBenchHandwriting(g, mark, width, height, rand) {
  const hand = hands[mark.style] || hands.ballpoint;
  const size = mark.s / 10;
  const chars = [...mark.t].map((letter) => ({
    glyph: glyphs[letter],
    width: letter === " " ? 4 : (glyphs[letter]?.width || 5) + 1.4,
    drift: (rand() - 0.5) * 0.65,
    tilt: (rand() - 0.5) * 0.08,
    stretch: 0.93 + rand() * 0.14,
  }));
  const total = chars.reduce((sum, char) => sum + char.width, 0);
  g.save();
  g.translate(mark.x * width, mark.y * height);
  g.rotate(mark.r || 0);
  g.scale(size * hand.width, size);
  g.translate(-total / 2, -10);
  g.lineCap = "round";
  g.lineJoin = "round";
  let cursor = 0;
  for (const char of chars) {
    if (char.glyph) {
      g.save();
      g.translate(cursor, char.drift);
      g.rotate(char.tilt);
      g.scale(char.stretch, char.stretch);
      for (const path of char.glyph.paths) {
        const points = path.map(([x, y]) => [
          x + (10 - y) * hand.slant + (rand() - 0.5) * 0.23,
          y + (rand() - 0.5) * 0.23,
        ]);
        g.lineWidth = hand.nib * (0.8 + rand() * 0.4);
        g.globalAlpha = hand.alpha * (0.78 + rand() * 0.22);
        if (mark.style === "scratch") {
          g.save();
          g.translate(-0.16, -0.2);
          g.strokeStyle = "#f4d5a0";
          trace(g, points, false);
          g.restore();
        }
        g.strokeStyle = hand.ink;
        trace(g, points, hand.smooth);
      }
      g.restore();
    }
    cursor += char.width;
  }
  if (mark.underline) {
    g.strokeStyle = hand.ink;
    g.globalAlpha = hand.alpha * 0.65;
    g.lineWidth = hand.nib * 0.8;
    trace(
      g,
      [
        [-2, 12],
        [total * 0.42, 12.5],
        [total + 3, 11.3],
      ],
      true,
    );
  }
  g.restore();
}
