import { gameConfig } from "../../config/config.ts";
import { AUDIO_ASSETS, CONTACT_SOUNDS, materialProfile } from "./catalog.js";

/** Recorded tabletop foley, with per-session ownership and a quiet offline fallback. */
export function createSound({
  createContext = () =>
    new (window.AudioContext || window.webkitAudioContext)({
      latencyHint: "interactive",
    }),
  fetchAudio = (...args) => fetch(...args),
  random = Math.random,
} = {}) {
  let ctx = null,
    master = null,
    effects = null,
    ambience = null,
    abort = null,
    generation = 0,
    volume = gameConfig.settings.vol,
    ambOn = gameConfig.settings.amb,
    paused = false,
    ready = Promise.resolve(),
    fallback = null,
    previousContact = -1;
  const buffers = new Map(),
    loading = new Map(),
    voices = new Set(),
    ambientLoops = new Map(),
    motionLoops = new Map();
  const clamp = (v, min, max) =>
    Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : min;

  function ramp(param, value, seconds = 0.035) {
    param.setTargetAtTime(value, ctx.currentTime, seconds);
  }
  function resumeContext() {
    if (ctx && ctx.state !== "running" && ctx.state !== "closed")
      void ctx.resume().catch(() => {});
  }
  function load(key) {
    if (loading.has(key)) return loading.get(key);
    const context = ctx,
      version = generation,
      signal = abort.signal;
    const pending = (async () => {
      try {
        const response = await fetchAudio(AUDIO_ASSETS[key], {
          signal,
          cache: "force-cache",
        });
        if (!response.ok) return;
        const data = await response.arrayBuffer();
        if (version !== generation || signal.aborted) return;
        const buffer = await context.decodeAudioData(data);
        if (version !== generation || signal.aborted) return;
        buffers.set(key, buffer);
        if (key === "fan" || key === "classroom") startAmbience();
      } catch {
        // Asset/network/decoder failures must never interrupt a match.
      }
    })();
    loading.set(key, pending);
    return pending;
  }
  function init() {
    if (!ctx) {
      try {
        ctx = createContext();
        master = ctx.createGain();
        effects = ctx.createGain();
        ambience = ctx.createGain();
        master.gain.value = volume;
        ambience.gain.value = ambOn ? 1 : 0;
        effects.connect(master);
        ambience.connect(master);
        master.connect(ctx.destination);
        abort = new AbortController();
        ready = Promise.all(
          Object.keys(AUDIO_ASSETS)
            .filter((key) => !["fan", "classroom"].includes(key) || ambOn)
            .map(load),
        ).then(() => {});
      } catch {
        if (ctx) void ctx.close().catch(() => {});
        ctx = master = effects = ambience = null;
        return Promise.resolve();
      }
    }
    if (!paused) resumeContext();
    return ready;
  }
  function voice(
    buffer,
    {
      gain,
      rate = 1,
      pan = 0,
      cutoff = 7000,
      loop = false,
      ambient = false,
      offset = 0,
    },
  ) {
    const source = ctx.createBufferSource(),
      filter = ctx.createBiquadFilter(),
      level = ctx.createGain(),
      panner = ctx.createStereoPanner?.();
    source.buffer = buffer;
    source.loop = loop;
    source.playbackRate.value = rate;
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    level.gain.value = loop ? 0 : gain;
    source.connect(filter);
    filter.connect(level);
    if (panner) {
      panner.pan.value = clamp(pan, -0.8, 0.8);
      level.connect(panner);
      panner.connect(ambient ? ambience : effects);
    } else level.connect(ambient ? ambience : effects);
    let stopped = false;
    const handle = {
      source,
      level,
      panner,
      ambient,
      loop,
      stop() {
        if (stopped) return;
        stopped = true;
        try {
          source.stop();
        } catch {}
        source.disconnect();
        filter.disconnect();
        level.disconnect();
        panner?.disconnect();
        voices.delete(handle);
      },
    };
    source.onended = () => handle.stop();
    voices.add(handle);
    source.start(0, offset);
    if (loop) ramp(level.gain, gain, ambient ? 0.5 : 0.025);
    return handle;
  }
  function startAmbience() {
    if (!ctx || !ambOn) return;
    for (const [key, gain, cutoff] of [
      [
        "fan",
        gameConfig.audio.ambience.fan.gain,
        gameConfig.audio.ambience.fan.cutoff,
      ],
      [
        "classroom",
        gameConfig.audio.ambience.classroom.gain,
        gameConfig.audio.ambience.classroom.cutoff,
      ],
    ]) {
      const buffer = buffers.get(key);
      if (!buffer || ambientLoops.has(key)) continue;
      ambientLoops.set(
        key,
        voice(buffer, {
          gain,
          cutoff,
          loop: true,
          ambient: true,
          offset: random() * buffer.duration,
        }),
      );
    }
  }
  function contactKey() {
    previousContact =
      (previousContact +
        1 +
        Math.floor(random() * (CONTACT_SOUNDS.length - 1))) %
      CONTACT_SOUNDS.length;
    return CONTACT_SOUNDS[previousContact];
  }
  function fallbackClick(gain, pan, rate) {
    if (!fallback) {
      fallback = ctx.createBuffer(
        1,
        Math.ceil(ctx.sampleRate * 0.09),
        ctx.sampleRate,
      );
      const samples = fallback.getChannelData(0);
      let smoothed = 0;
      for (let i = 0; i < samples.length; i++) {
        smoothed = smoothed * 0.45 + (random() * 2 - 1) * 0.55;
        samples[i] =
          smoothed *
          Math.exp(-i / (ctx.sampleRate * 0.012)) *
          Math.min(1, i / 24);
      }
    }
    voice(fallback, { gain: gain * 0.3, pan, rate, cutoff: 4800 });
  }
  function play(key, { gain = 0.4, pan = 0, pen, rate = 1 } = {}) {
    if (!ctx || paused || ctx.state !== "running" || volume === 0) return;
    const transient = [...voices].filter((v) => !v.loop);
    if (transient.length >= gameConfig.audio.maxVoices) transient[0].stop();
    const profile = materialProfile(pen),
      pitch = profile.rate * rate * (0.97 + random() * 0.06),
      buffer = buffers.get(key);
    if (buffer)
      voice(buffer, {
        gain: gain * profile.gain,
        pan,
        rate: pitch,
        cutoff: profile.cutoff,
      });
    else fallbackClick(gain, pan, pitch);
  }
  function stopMotion() {
    motionLoops.forEach((v) => v.stop());
    motionLoops.clear();
  }
  function reset() {
    stopMotion();
    [...voices].filter((v) => !v.ambient).forEach((v) => v.stop());
  }
  return {
    init,
    reset,
    stopMotion,
    setPaused(on) {
      paused = !!on;
      if (paused) {
        reset();
        if (ctx && ctx.state !== "closed") void ctx.suspend().catch(() => {});
      } else resumeContext();
    },
    setVolume(value) {
      volume = clamp(value, 0, 1);
      if (master) ramp(master.gain, volume);
      if (!volume) reset();
    },
    setAmbience(on) {
      ambOn = !!on;
      if (!ctx) return;
      ramp(ambience.gain, ambOn ? 1 : 0, 0.15);
      if (ambOn) {
        void load("fan");
        void load("classroom");
        startAmbience();
      } else {
        ambientLoops.forEach((v) => v.stop());
        ambientLoops.clear();
      }
    },
    motion(pens) {
      const buffer = buffers.get("slide");
      if (!ctx || paused || ctx.state !== "running" || !volume || !buffer) {
        stopMotion();
        return;
      }
      pens.forEach(({ speed, out, pen, pan }, i) => {
        if (out || !Number.isFinite(speed) || speed < 3) {
          motionLoops.get(i)?.stop();
          motionLoops.delete(i);
          return;
        }
        const profile = materialProfile(pen),
          gain = Math.min(0.13, speed / 1400) * profile.gain;
        if (!motionLoops.has(i))
          motionLoops.set(
            i,
            voice(buffer, {
              gain,
              pan,
              loop: true,
              cutoff: profile.cutoff * 0.65,
              rate: profile.rate,
              offset: random() * buffer.duration,
            }),
          );
        const current = motionLoops.get(i);
        ramp(current.level.gain, gain);
        ramp(
          current.source.playbackRate,
          profile.rate * (0.72 + Math.min(speed, 160) / 300),
        );
        if (current.panner) ramp(current.panner.pan, clamp(pan, -0.8, 0.8));
      });
    },
    flick(power, options) {
      play("flick", { ...options, gain: 0.24 + clamp(power, 0, 1.6) * 0.34 });
    },
    hit(speed, options) {
      play(contactKey(), {
        ...options,
        gain: 0.14 + (clamp(speed, 0, 180) / 180) * 0.47,
      });
    },
    desk(amount = 0.3) {
      play(contactKey(), {
        gain: 0.12 + clamp(amount, 0, 1) * 0.15,
        rate: 0.85,
      });
    },
    drop(options) {
      play("drop", { ...options, gain: 0.5 });
    },
    tick() {
      play("flick", { gain: 0.09, rate: 1.1 });
    },
    page() {
      play("contactA", { gain: 0.075, rate: 1.15 });
    },
    win() {
      play(contactKey(), { gain: 0.22, rate: 1.08 });
    },
    lose() {
      play(contactKey(), { gain: 0.14, rate: 0.85 });
    },
    round(won) {
      play(contactKey(), { gain: won ? 0.18 : 0.12 });
    },
    dispose() {
      generation++;
      abort?.abort();
      [...voices].forEach((v) => v.stop());
      ambientLoops.clear();
      motionLoops.clear();
      buffers.clear();
      loading.clear();
      const previous = ctx;
      ctx = master = effects = ambience = fallback = abort = null;
      paused = false;
      if (previous && previous.state !== "closed")
        void previous.close().catch(() => {});
    },
  };
}
