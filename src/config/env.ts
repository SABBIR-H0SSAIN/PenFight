/** Configuration-only JSON merge: never copies unknown keys or mutates the defaults. */
export interface ConfigRules {
  enums: Record<string, readonly (string | number)[]>;
  ranges: Record<string, readonly [number, number, boolean?]>;
  nameLength: number;
}
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function ruleFor<T>(rules: Record<string, T>, path: string): T | undefined {
  for (const [pattern, rule] of Object.entries(rules)) {
    const regex = pattern
      .split("*")
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("[^.]*");
    if (new RegExp(`^${regex}$`).test(path)) return rule;
  }
}
function merge(
  base: unknown,
  input: unknown,
  rules: ConfigRules,
  path = "",
): unknown {
  if (Array.isArray(base)) {
    return base.map((value, index) =>
      merge(
        value,
        Array.isArray(input) && input.length === base.length
          ? input[index]
          : undefined,
        rules,
        `${path}.${index}`,
      ),
    );
  }
  if (object(base)) {
    // Colour selections have dynamic pen keys; validate those against the catalogue.
    if (path.endsWith(".colors")) {
      const colors = { ...base };
      if (object(input))
        for (const [key, value] of Object.entries(input)) {
          if (
            rules.enums["preferences.*.pen"].includes(key) &&
            typeof value === "string" &&
            /^#[0-9a-f]{6}$/i.test(value)
          )
            colors[key] = value;
        }
      return colors;
    }
    return Object.fromEntries(
      Object.entries(base).map(([key, value]) => [
        key,
        merge(
          value,
          object(input) && Object.hasOwn(input, key) ? input[key] : undefined,
          rules,
          path ? `${path}.${key}` : key,
        ),
      ]),
    );
  }
  if (input === undefined || input === null || input === "") return base;
  if (typeof base === "boolean") {
    if (input === "true") input = true;
    if (input === "false") input = false;
  }
  if (
    typeof base === "number" &&
    typeof input === "string" &&
    input.trim() !== ""
  )
    input = Number(input);
  if (typeof input !== typeof base) return base;
  const choices = ruleFor(rules.enums, path);
  if (choices && !choices.includes(input as string | number)) return base;
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return base;
    const range = ruleFor(rules.ranges, path);
    if (
      (!range && !choices) ||
      (range &&
        (input < range[0] ||
          input > range[1] ||
          (range[2] && !Number.isInteger(input))))
    )
      return base;
    if (
      (path.endsWith(".shadowMap") || path.endsWith(".woodTextureSize")) &&
      !Number.isInteger(Math.log2(input))
    )
      return base;
  }
  if (typeof input === "string") {
    if (/^(settings\.name|preferences\.pvp\.name[12])$/.test(path))
      return input.trim().slice(0, rules.nameLength) || base;
    if (
      (path.startsWith("pens.") && path.endsWith(".color")) ||
      /^penColors\.[^.]+\.(default|swatches\.\d+)$/.test(path)
    ) {
      if (!/^#[0-9a-f]{6}$/i.test(input)) return base;
    }
    if (!input.trim() || input.length > 512) return base;
  }
  return input;
}
export function resolveConfig<T>(
  defaults: T,
  json: string | undefined,
  overrides: unknown,
  rules: ConfigRules,
): T {
  let parsed: unknown;
  try {
    parsed = json ? JSON.parse(json) : undefined;
  } catch {
    /* Optional malformed JSON keeps defaults. */
  }
  return merge(merge(defaults, parsed, rules), overrides, rules) as T;
}
