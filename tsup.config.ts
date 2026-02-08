import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      config: "src/config.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    sourcemap: true,
    target: "node20",
  },
  {
    entry: {
      cli: "bin/design-system-refactor-radar.ts",
    },
    format: ["cjs"],
    dts: false,
    sourcemap: true,
    target: "node20",
    banner: {
      js: "#!/usr/bin/env node",
    },
  },
]);
