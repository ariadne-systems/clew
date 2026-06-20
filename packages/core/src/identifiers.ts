/**
 * Shared identifier helpers for generators. Centralizing them keeps the
 * TypeScript and Java generators producing the same symbol for the same spec, and
 * the sanitization that guarantees a *valid* identifier in one place.
 */
import { SwTraceables, traces } from "@ariadne-thread/trace";

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
 * prefixed with `_`, so the result is a legal TypeScript and Java identifier even
 * for an unconstrained configured spec-set name (e.g. `2024-core` → `_2024Core`).
 */
export function toIdentifier(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9]+/g, "_");
  return /^[0-9]/.test(cleaned) ? `_${cleaned}` : cleaned;
}

/**
 * Derives an UPPER_SNAKE enum-member name from a spec's filename, so every
 * generator names the same traceable identically, e.g.
 * `SW-002-mint-ids.md` → `SW_002_MINT_IDS`.
 */
export const toMemberName: (filename: string) => string = traces(
  SwTraceables.SW_014_GENERATE_TRACEABLES,
  (filename: string): string => {
    const withoutExtension = filename.replace(/\.[^.]+$/, "");
    return toIdentifier(withoutExtension).toUpperCase();
  },
);
