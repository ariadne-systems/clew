/**
 * Shared identifier helpers for generators.
 */
import { realizes, SwTraceables } from "@ariadne-thread/trace";
import type { Relation } from "./generator.js";

/** Renders a name such as `SW` or `commands` as a PascalCase identifier fragment. */
export function toPascalCase(name: string): string {
  return name
    .split(/[^A-Za-z0-9]+/)
    .filter((part) => part.length > 0)
    .map(
      (part) =>
        `${(part[0] ?? "").toUpperCase()}${part.slice(1).toLowerCase()}`,
    )
    .join("");
}

/**
 * Sanitizes an arbitrary string into a valid identifier: each run of
 * non-alphanumeric characters becomes a single `_`, and a leading digit is
 * prefixed with `_` (e.g. `2024-core` → `_2024Core`).
 */
export function toIdentifier(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9]+/g, "_");
  return /^[0-9]/.test(cleaned) ? `_${cleaned}` : cleaned;
}

/**
 * Derives an UPPER_SNAKE enum-member name from a spec's filename, e.g.
 * `mint-ids.md` → `MINT_IDS`.
 */
export const toMemberName: (filename: string) => string = realizes(
  SwTraceables.SW_014_GENERATE_TRACEABLES,
  (filename: string): string => {
    const withoutExtension = filename.replace(/\.[^.]+$/, "");
    return toIdentifier(withoutExtension).toUpperCase();
  },
);

/** The enum symbol name for a spec set, e.g. `SW` → `SwTraceables`; always a valid identifier. */
export function setSymbolName(setName: string): string {
  return toIdentifier(`${toPascalCase(setName)}Traceables`);
}

/**
 * The spec ids a member-reference text names — each from the member's leading
 * `<PREFIX>_<NUMBER>`, the inverse of `toMemberName` (the discovery round-trip). The
 * prefix must start an identifier, so a `_<number>` inside a member's slug (e.g. the
 * `_2` in `SW_012_STEP_2`) is not a leading id and is not read as one.
 */
export function memberIds(text: string): string[] {
  const ids: string[] = [];
  const pattern = /(?:^|[^A-Za-z0-9_])([A-Za-z]+)_(\d+)/g;
  let match = pattern.exec(text);
  while (match !== null) {
    ids.push(`${match[1]}-${match[2]}`);
    match = pattern.exec(text);
  }
  return ids;
}

/** The relation an anchor verb expresses (case-insensitive): realizes, verifies, or concerns. */
export function relationOfVerb(verb: string): Relation {
  const lowered = verb.toLowerCase();
  if (lowered === "verifies") {
    return "verifies";
  }
  if (lowered === "concerns") {
    return "concerns";
  }
  return "realizes";
}
