/* Procedural Web Audio: classroom ambience, fan, murmur, flick, impact, desk vibration, win/lose. */
export function createSound() {
  let ctx = null,
    master = null,
    ambGain = null,
    noiseBuf = null,
    vol = 0.7,
    ambOn = true,
    murmurTimer = 0;
  function init() {
    if (ctx) {
      if (ctx.state === "suspended") ctx.resume();
      return;
    }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      ctx = null;
      return;
    }
    master = ctx.createGain();
    master.gain.value = vol;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    ambGain = ctx.createGain();
    ambGain.gain.value = ambOn ? 1 : 0;
    ambGain.connect(master);
    ambience();
  }
  function src(loop) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    s.loop = !!loop;
    return s;
  }
  function ambience() {
    // room tone
    const a = src(true),
      f = ctx.createBiquadFilter(),
      g = ctx.createGain();
    f.type = "bandpass";
    f.frequency.value = 520;
    f.Q.value = 0.35;
    g.gain.value = 0.05;
    a.connect(f);
    f.connect(g);
    g.connect(ambGain);
    a.start();
    // ceiling fan: low rumble with blade-pass amplitude modulation
    const b = src(true),
      lf = ctx.createBiquadFilter(),
      fg = ctx.createGain(),
      lfo = ctx.createOscillator(),
      lg = ctx.createGain();
    lf.type = "lowpass";
    lf.frequency.value = 170;
    fg.gain.value = 0.045;
    lfo.frequency.value = 3.1;
    lg.gain.value = 0.02;
    lfo.connect(lg);
    lg.connect(fg.gain);
    b.connect(lf);
    lf.connect(fg);
    fg.connect(ambGain);
    b.start();
    lfo.start();
    // distant students talking: syllable-like bursts through a vowel-ish filter
    const murmur = () => {
      if (!ctx) return;
      const t = ctx.currentTime,
        n = 3 + Math.floor(Math.random() * 4),
        f0 = 300 + Math.random() * 500;
      for (let i = 0; i < n; i++) {
        const s = src(false),
          bp = ctx.createBiquadFilter(),
          g2 = ctx.createGain(),
          st = t + i * (0.11 + Math.random() * 0.08);
        bp.type = "bandpass";
        bp.frequency.value = f0 * (0.8 + Math.random() * 0.8);
        bp.Q.value = 3;
        g2.gain.setValueAtTime(0, st);
        g2.gain.linearRampToValueAtTime(0.05, st + 0.03);
        g2.gain.linearRampToValueAtTime(0, st + 0.12);
        s.connect(bp);
        bp.connect(g2);
        g2.connect(ambGain);
        s.start(st, Math.random());
        s.stop(st + 0.14);
      }
      murmurTimer = setTimeout(murmur, 700 + Math.random() * 2600);
    };
    murmur();
  }
  function burst(dur, type, freq, q, gain, when, slideTo) {
    if (!ctx) return;
    const t = ctx.currentTime + (when || 0);
    const s = src(false),
      f = ctx.createBiquadFilter(),
      g = ctx.createGain();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (slideTo) f.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    f.Q.value = q;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(master);
    s.start(t, Math.random());
    s.stop(t + dur + 0.02);
  }
  function tone(freq, dur, type, gain, when, slideTo) {
    if (!ctx) return;
    const t = ctx.currentTime + (when || 0),
      o = ctx.createOscillator(),
      g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur + 0.03);
  }
  return {
    init,
    dispose() {
      clearTimeout(murmurTimer);
      const previous = ctx;
      ctx = null;
      if (previous) void previous.close();
      master = null;
      ambGain = null;
      noiseBuf = null;
    },
    setVolume(v) {
      vol = v;
      if (master) master.gain.value = v;
    },
    setAmbience(on) {
      ambOn = on;
      if (ambGain) ambGain.gain.value = on ? 1 : 0;
    },
    flick(p) {
      burst(0.06, "highpass", 2200, 0.7, 0.25 + 0.3 * p);
      tone(180 + 120 * p, 0.05, "triangle", 0.12);
    },
    hit(speed) {
      const k = Math.min(1, speed / 160);
      burst(0.09, "bandpass", 2600 + 900 * k, 4, 0.35 + 0.4 * k);
      tone(900 + 500 * k, 0.07, "square", 0.07 + 0.06 * k, 0, 420);
      this.desk(k * 0.7);
    },
    desk(k) {
      tone(70 + 30 * Math.random(), 0.35, "sine", 0.22 * (k || 0.5), 0.01, 48);
      burst(0.2, "lowpass", 300, 0.6, 0.12 * (k || 0.5));
    },
    drop() {
      tone(120, 0.18, "sine", 0.25, 0.05, 60);
      burst(0.12, "lowpass", 500, 0.5, 0.2, 0.05);
    },
    scratch(k) {
      burst(0.25 + 0.3 * k, "bandpass", 3200, 1.2, 0.05, 0, 1800);
    },
    tick() {
      tone(1400, 0.03, "square", 0.04);
    },
    think() {
      tone(520, 0.05, "sine", 0.05);
      tone(660, 0.05, "sine", 0.05, 0.07);
    },
    win() {
      [523, 659, 784, 1047].forEach((f, i) =>
        tone(f, 0.26, "triangle", 0.18, i * 0.11),
      );
      tone(1047, 0.7, "triangle", 0.16, 0.5);
    },
    lose() {
      [392, 349, 311, 262].forEach((f, i) =>
        tone(f, 0.3, "sawtooth", 0.09, i * 0.17),
      );
    },
    round(w) {
      if (w) {
        tone(660, 0.12, "triangle", 0.15);
        tone(880, 0.2, "triangle", 0.15, 0.1);
      } else {
        tone(300, 0.2, "triangle", 0.14);
        tone(220, 0.25, "triangle", 0.12, 0.12);
      }
    },
  };
}
