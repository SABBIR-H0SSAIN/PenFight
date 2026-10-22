import test from "node:test";
import assert from "node:assert/strict";
import { createGameConfig, defaultGameConfig } from "../src/config/config.ts";
import { configRules } from "../src/config/validation.ts";

function leaves(value, path = []) {
  return value && typeof value === "object"
    ? Object.entries(value).flatMap(([key, child]) =>
        leaves(child, [...path, key]),
      )
    : [{ path, value }];
}
const all = leaves(defaultGameConfig);
const read = (config, path) => path.reduce((value, key) => value[key], config);
function patch(path, value) {
  return path.reduceRight((child, key) => ({ [key]: child }), value);
}
function ruleFor(rules, path) {
  return Object.entries(rules).find(([pattern]) => {
    const parts = pattern.split(".");
    return (
      parts.length === path.length &&
      parts.every((part, i) => {
        const [start, end] = part.split("*");
        return end === undefined
          ? part === path[i]
          : path[i].startsWith(start) && path[i].endsWith(end);
      })
    );
  })?.[1];
}

test("every numeric option has validation and accepts its supported endpoints", () => {
  for (const { path, value } of all.filter(
    (item) => typeof item.value === "number",
  )) {
    const range = ruleFor(configRules.ranges, path),
      choices = ruleFor(configRules.enums, path);
    assert.ok(range || choices, `Missing validation: ${path.join(".")}`);
    for (const candidate of choices || range.slice(0, 2)) {
      const config = createGameConfig(undefined, patch(path, candidate));
      assert.equal(
        read(config, path),
        candidate,
        `${path.join(".")} accepts ${candidate}`,
      );
    }
    for (const candidate of [
      NaN,
      Infinity,
      -Infinity,
      ...(range ? [range[0] - 1, range[1] + 1] : [-1, 999999]),
    ]) {
      assert.equal(
        read(createGameConfig(undefined, patch(path, candidate)), path),
        value,
        `${path.join(".")} rejects ${candidate}`,
      );
    }
    if (range?.[2]) {
      assert.equal(
        read(createGameConfig(undefined, patch(path, range[0] + 0.25)), path),
        value,
        `${path.join(".")} rejects fractions`,
      );
    }
  }
});

test("every enum option accepts supported alternatives and rejects unknown values", () => {
  for (const { path, value } of all) {
    const choices = ruleFor(configRules.enums, path);
    if (!choices || Array.isArray(read(defaultGameConfig, path.slice(0, -1))))
      continue;
    for (const candidate of choices) {
      assert.equal(
        read(createGameConfig(undefined, patch(path, candidate)), path),
        candidate,
        path.join("."),
      );
    }
    assert.equal(
      read(createGameConfig(undefined, patch(path, "not-supported")), path),
      value,
      path.join("."),
    );
  }
});

test("all boolean options accept false and true explicitly and reject ambiguous values", () => {
  for (const { path, value } of all.filter(
    (item) => typeof item.value === "boolean",
  )) {
    for (const candidate of [true, false]) {
      assert.equal(
        read(createGameConfig(undefined, patch(path, candidate)), path),
        candidate,
      );
      assert.equal(
        read(createGameConfig(undefined, patch(path, String(candidate))), path),
        candidate,
      );
    }
    for (const candidate of [0, 1, "yes", "no", [], {}]) {
      assert.equal(
        read(createGameConfig(undefined, patch(path, candidate)), path),
        value,
      );
    }
  }
});

test("invalid object types cannot replace a complete section or mutate other sections", () => {
  for (const section of Object.keys(defaultGameConfig)) {
    for (const invalid of [null, [], 42, true, "bad"]) {
      assert.deepEqual(
        createGameConfig(undefined, { [section]: invalid }),
        defaultGameConfig,
      );
    }
  }
});
