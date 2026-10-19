import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createSound } from "../src/game/audio/sound.js";
import { AUDIO_ASSETS } from "../src/game/audio/catalog.js";

function fixture(options = {}) {
  const contexts = [],
    requests = [];
  function parameter(value = 0) {
    return {
      value,
      setTargetAtTime(next) {
        this.value = next;
      },
    };
  }
  function node() {
    return {
      connections: [],
      disconnected: false,
      connect(other) {
        this.connections.push(other);
        return other;
      },
      disconnect() {
        this.disconnected = true;
      },
    };
  }
  function createContext() {
    const context = {
      state: "suspended",
      currentTime: 0,
      sampleRate: 32000,
      destination: node(),
      sources: [],
      gains: [],
      pans: [],
      async resume() {
        if (options.rejectResume) throw new Error("Gesture required");
        this.state = "running";
      },
      async suspend() {
        this.state = "suspended";
      },
      async close() {
        this.state = "closed";
      },
      createGain() {
        const value = Object.assign(node(), { gain: parameter(1) });
        this.gains.push(value);
        return value;
      },
      createBiquadFilter: () =>
        Object.assign(node(), { frequency: parameter() }),
      createStereoPanner() {
        const p = Object.assign(node(), { pan: parameter() });
        this.pans.push(p);
        return p;
      },
      createBufferSource() {
        const source = Object.assign(node(), {
          playbackRate: parameter(1),
          stopped: false,
          start(when, offset) {
            this.started = { when, offset };
          },
          stop() {
            this.stopped = true;
            this.onended?.();
          },
        });
        this.sources.push(source);
        return source;
      },
      createBuffer: (_, length, rate) => ({
        duration: length / rate,
        getChannelData: () => new Float32Array(length),
      }),
      async decodeAudioData(data) {
        if (options.rejectDecode) throw new Error("Unsupported encoding");
        return { duration: 2, key: new TextDecoder().decode(data) };
      },
    };
    contexts.push(context);
    return context;
  }
  const sound = createSound({
    createContext,
    random: () => 0.5,
    fetchAudio: async (url, args) => {
      requests.push({ url, ...args });
      if (options.fetchAudio) return options.fetchAudio(url, args);
      return {
        ok: !options.failFetch,
        arrayBuffer: async () => new TextEncoder().encode(url).buffer,
      };
    },
  });
  return { sound, contexts, requests };
}

test("all shipped audio is licensed, finite PCM with verified hashes and bounded size", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../public/audio/manifest.json", import.meta.url)),
  );
  assert.equal(manifest.assets.length, Object.keys(AUDIO_ASSETS).length);
  let total = 0;
  for (const asset of manifest.assets) {
    const data = await readFile(
      new URL("../public/audio/" + asset.file, import.meta.url),
    );
    assert.ok(Object.values(AUDIO_ASSETS).includes("/audio/" + asset.file));
    assert.equal(createHash("sha256").update(data).digest("hex"), asset.sha256);
    assert.equal(data.toString("ascii", 0, 4), "RIFF");
    assert.equal(data.toString("ascii", 8, 12), "WAVE");
    assert.equal(data.readUInt16LE(20), 1, "PCM");
    assert.equal(data.readUInt16LE(22), 1, "mono");
    assert.equal(data.readUInt16LE(34), 16, "16-bit");
    let peak = 0,
      energy = 0;
    for (let i = 44; i < data.length; i += 2) {
      const sample = data.readInt16LE(i) / 32768;
      peak = Math.max(peak, Math.abs(sample));
      energy += sample * sample;
    }
    assert.ok(peak > 0.1 && peak < 0.85, `${asset.file} has headroom`);
    assert.ok(energy > 0, asset.file);
    if (asset.loopCrossfadeSeconds) {
      assert.ok(
        Math.abs(data.readInt16LE(44) - data.readInt16LE(data.length - 2)) /
          32768 <
          0.15,
        `${asset.file} loop boundary`,
      );
    }
    assert.ok(
      ["CC0-1.0", "Public Domain (source declaration)"].includes(
        manifest.sources[asset.source].license,
      ),
    );
    total += data.length;
  }
  assert.ok(total < 1.5 * 1024 * 1024);
});

test("initialization loads local assets once and starts only the two ambient loops", async () => {
  const f = fixture();
  await Promise.all([f.sound.init(), f.sound.init()]);
  assert.equal(f.contexts.length, 1);
  assert.equal(f.requests.length, Object.keys(AUDIO_ASSETS).length);
  assert.ok(f.requests.every((r) => r.url.startsWith("/audio/")));
  assert.equal(f.contexts[0].sources.length, 2);
  f.sound.dispose();
});

test("volume and ambience set before activation are respected, and ambience toggles do not duplicate loops", async () => {
  const f = fixture();
  f.sound.setVolume(0);
  f.sound.setAmbience(false);
  await f.sound.init();
  const context = f.contexts[0];
  assert.equal(context.gains[0].gain.value, 0);
  assert.equal(context.sources.length, 0);
  f.sound.flick(1);
  assert.equal(context.sources.length, 0);
  f.sound.setVolume(0.4);
  f.sound.setAmbience(true);
  await f.sound.init();
  for (let i = 0; i < 10; i++) await Promise.resolve();
  assert.equal(context.sources.length, 2);
  f.sound.setAmbience(true);
  assert.equal(context.sources.length, 2);
  f.sound.setAmbience(false);
  assert.ok(context.sources.every((s) => s.stopped));
  f.sound.dispose();
});

test("contacts vary, pan with the scene, and distinguish pen material profiles", async () => {
  const f = fixture();
  f.sound.setAmbience(false);
  await f.sound.init();
  f.sound.hit(100, { pen: "heavy", pan: -0.6 });
  f.sound.hit(100, { pen: "matador_hs", pan: 0.7 });
  const context = f.contexts[0];
  assert.notEqual(context.sources[0].buffer.key, context.sources[1].buffer.key);
  assert.ok(
    context.sources[0].playbackRate.value <
      context.sources[1].playbackRate.value,
  );
  assert.equal(context.pans[0].pan.value, -0.6);
  assert.equal(context.pans[1].pan.value, 0.7);
  f.sound.dispose();
});

test("movement reuses one loop per pen and stops for stationary or falling pens", async () => {
  const f = fixture();
  f.sound.setAmbience(false);
  await f.sound.init();
  const motion = [
    { speed: 100, out: false, pen: "ball", pan: 0.2 },
    { speed: 50, out: false, pen: "gel", pan: -0.3 },
  ];
  for (let i = 0; i < 100; i++) f.sound.motion(motion);
  assert.equal(f.contexts[0].sources.length, 2);
  f.sound.motion([
    { ...motion[0], out: true },
    { ...motion[1], speed: 0 },
  ]);
  assert.ok(f.contexts[0].sources.every((s) => s.stopped));
  f.sound.dispose();
});

test("pause stops effects and movement, suspends audio, and resume restores context", async () => {
  const f = fixture();
  await f.sound.init();
  f.sound.drop();
  f.sound.motion([{ speed: 80, pen: "ball" }]);
  f.sound.setPaused(true);
  const context = f.contexts[0],
    count = context.sources.length;
  assert.equal(context.state, "suspended");
  assert.ok(
    context.sources
      .filter(
        (s) =>
          !s.buffer.key?.includes("fan-loop") &&
          !s.buffer.key?.includes("classroom-loop"),
      )
      .every((s) => s.stopped),
  );
  f.sound.flick(1);
  assert.equal(context.sources.length, count);
  f.sound.setPaused(false);
  f.sound.flick(1);
  assert.equal(context.state, "running");
  assert.equal(context.sources.length, count + 1);
  f.sound.dispose();
});

test("asset, decoder, and browser activation failures do not reject or block gameplay", async () => {
  for (const options of [
    { failFetch: true },
    { rejectDecode: true },
    { rejectResume: true },
  ]) {
    const f = fixture(options);
    await assert.doesNotReject(() => f.sound.init());
    assert.doesNotThrow(() => {
      f.sound.flick(0.8);
      f.sound.hit(120);
      f.sound.drop();
      f.sound.motion([{ speed: 40 }]);
    });
    f.sound.dispose();
  }
  const unavailable = createSound({
    createContext() {
      throw new Error("No audio device");
    },
  });
  await assert.doesNotReject(() => unavailable.init());
  assert.doesNotThrow(() => {
    unavailable.flick(1);
    unavailable.dispose();
  });
});

test("rapid contacts are bounded and dispose disconnects all sources and aborts requests", async () => {
  const f = fixture();
  f.sound.setAmbience(false);
  await f.sound.init();
  for (let i = 0; i < 100; i++) f.sound.hit(100);
  assert.ok(f.contexts[0].sources.filter((s) => !s.stopped).length <= 16);
  f.sound.dispose();
  assert.equal(f.contexts[0].state, "closed");
  assert.ok(f.contexts[0].sources.every((s) => s.disconnected));
  assert.ok(f.requests.every((r) => r.signal.aborted));
  await f.sound.init();
  assert.equal(f.contexts.length, 2, "supports a React lifecycle remount");
  f.sound.dispose();
});

test("late asset completion cannot restart disposed ambience", async () => {
  const pending = [];
  const f = fixture({
    fetchAudio: () => new Promise((resolve) => pending.push(resolve)),
  });
  const loading = f.sound.init();
  f.sound.dispose();
  pending.forEach((resolve) =>
    resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) }),
  );
  await loading;
  assert.equal(f.contexts[0].sources.length, 0);
});
