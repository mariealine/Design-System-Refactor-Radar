import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { scan, buildCategorySummary } from "design-system-assistant";
import { deepMerge, DEFAULT_CONFIG } from "design-system-assistant/config";

const FIXTURES = join(import.meta.dirname, "fixtures");

const TAILWIND_CONFIG = deepMerge(DEFAULT_CONFIG, {
  scanDir: ".",
  extensions: [".tsx", ".ts"],
  exclude: [],
  violations: {
    colors: {
      enabled: true,
      label: "Colors",
      icon: "🎨",
      color: "red",
      pattern:
        "(?:bg|text|border|ring)-(?:gray|red|blue|green|emerald|slate)-(?:\\d{2,3}(?:/\\d+)?)|(?:bg|text|border|ring)-(?:white|black)(?![a-z-])",
    },
    typography: {
      enabled: true,
      label: "Typography",
      icon: "🔤",
      color: "blue",
      pattern:
        "\\btext-(?:xs|sm|base|lg|xl|2xl|3xl)\\b|\\bfont-(?:thin|light|normal|medium|semibold|bold|extrabold|black)\\b",
      deduplicateByLine: true,
    },
    radius: {
      enabled: true,
      label: "Radius",
      icon: "⬜",
      color: "green",
      pattern: "\\brounded-(?:sm|md|lg|xl|2xl|3xl|none)\\b",
    },
    shadows: {
      enabled: true,
      label: "Shadows",
      icon: "🌫️",
      color: "gray",
      pattern: "\\bshadow-(?:sm|md|lg|xl|2xl|inner)\\b",
    },
  },
});

describe("Scanner", () => {
  it("detects Tailwind violations in sample file", async () => {
    const result = await scan(FIXTURES, TAILWIND_CONFIG);

    assert.ok(result.fileReports.length > 0, "should find files");
    assert.ok(result.totalFiles > 0, "should count total files");

    const tailwindFile = result.fileReports.find((f) =>
      f.path.includes("sample-tailwind"),
    );
    assert.ok(tailwindFile, "should find sample-tailwind.tsx");
    assert.ok(tailwindFile.totalViolations > 0, "should detect violations");

    // Check color violations
    const colorViolations = tailwindFile.violations.colors;
    assert.ok(colorViolations, "should have color violations");
    assert.ok(colorViolations.length >= 3, `should detect >= 3 colors, got ${colorViolations.length}`);

    // Check radius violations
    const radiusViolations = tailwindFile.violations.radius;
    assert.ok(radiusViolations, "should have radius violations");
    assert.ok(radiusViolations.length >= 1, "should detect >= 1 radius");

    // Check shadow violations
    const shadowViolations = tailwindFile.violations.shadows;
    assert.ok(shadowViolations, "should have shadow violations");
    assert.ok(shadowViolations.length >= 1, "should detect >= 1 shadow");
  });

  it("detects flags in sample file", async () => {
    const result = await scan(FIXTURES, TAILWIND_CONFIG);
    const tailwindFile = result.fileReports.find((f) =>
      f.path.includes("sample-tailwind"),
    );

    assert.ok(tailwindFile, "should find sample-tailwind.tsx");
    assert.equal(tailwindFile.flags.migrateSimple.length, 1, "should find 1 @ds-migrate: simple");
    assert.equal(tailwindFile.flags.migrateComplex.length, 1, "should find 1 @ds-migrate: complex");
    assert.equal(tailwindFile.flags.todo.length, 1, "should find 1 @ds-todo");
    assert.equal(tailwindFile.totalFlags, 3, "total flags should be 3");
  });

  it("reports clean files with 0 violations", async () => {
    const result = await scan(FIXTURES, TAILWIND_CONFIG);
    const cleanFile = result.fileReports.find((f) =>
      f.path.includes("sample-clean"),
    );

    assert.ok(cleanFile, "should find sample-clean.tsx");
    assert.equal(cleanFile.totalViolations, 0, "clean file should have 0 violations");
    assert.equal(cleanFile.totalFlags, 0, "clean file should have 0 flags");
  });

  it("builds category summary correctly", async () => {
    const result = await scan(FIXTURES, TAILWIND_CONFIG);
    const summary = buildCategorySummary(result.fileReports, "colors");

    assert.ok(summary.totalFiles >= 1, "should have at least 1 file with color violations");
    assert.ok(summary.totalViolations >= 3, "should have at least 3 color violations total");
    assert.ok(summary.topFiles.length >= 1, "should have at least 1 top file");
  });

  it("handles missing scanDir gracefully", async () => {
    const badConfig = deepMerge(DEFAULT_CONFIG, {
      scanDir: "nonexistent-directory-12345",
    });

    await assert.rejects(
      () => scan(FIXTURES, badConfig),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("does not exist"));
        return true;
      },
    );
  });

  it("handles invalid regex pattern gracefully", async () => {
    const badConfig = deepMerge(TAILWIND_CONFIG, {
      violations: {
        badPattern: {
          enabled: true,
          label: "Bad",
          icon: "❌",
          color: "red",
          pattern: "[invalid(regex",
        },
      },
    });

    // Should not throw — just skip the invalid pattern
    const result = await scan(FIXTURES, badConfig);
    assert.ok(result.fileReports.length > 0);
  });
});
