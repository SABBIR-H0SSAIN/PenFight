import type { PEN_DEFINITIONS } from "./catalog.js";
/** Adding a catalogue entry automatically extends the shared pen type. */
export type PenKind = keyof typeof PEN_DEFINITIONS;
export type PenDefinition = (typeof PEN_DEFINITIONS)[PenKind];
