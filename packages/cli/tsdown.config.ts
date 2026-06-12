import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  // Bin-only package: it is executed, never imported, so it ships no type declarations.
  dts: false,
  clean: true,
});
