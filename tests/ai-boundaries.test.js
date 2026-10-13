import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const aiRoot = new URL("../src/game/ai/", import.meta.url);

test("AI modules stay independent of UI and browser rendering", async () => {
  for (const file of await readdir(aiRoot, { recursive: true })) {
    if (!file.endsWith(".js")) continue;
    const source = await readFile(new URL(file, aiRoot), "utf8");
    assert.doesNotMatch(
      source,
      /(?:from\s*|import\s*\()\s*["'][^"']*(?:react|next\/|features\/|components\/)/,
      `${file} must not import presentation modules`,
    );
    assert.doesNotMatch(
      source,
      /\b(?:document|window|HTMLCanvasElement|CanvasRenderingContext2D)\b/,
      `${file} must remain usable without a browser`,
    );
  }
});
