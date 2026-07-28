import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Many tests spawn git or scaffold real files in a temp tree; the pre-commit
    // hook runs biome, typecheck, check, and the tests in parallel, so under that
    // CPU contention the 5s default is too tight for the filesystem-heavy ones.
    testTimeout: 15_000,
  },
});
