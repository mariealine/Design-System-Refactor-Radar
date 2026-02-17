import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { deepMerge, DEFAULT_CONFIG } from "design-system-assistant/config";
import { run } from "design-system-assistant";

const FIXTURES = join(import.meta.dirname, "fixtures");

describe("Migration Analyzer", () => {
  it("detects component imports and usage", async () => {
    const config = deepMerge(DEFAULT_CONFIG, {
      scanDir: ".",
      extensions: [".tsx", ".ts"],
      exclude: [],
      migration: {
        enabled: true,
        targetDS: "New DS",
        mappings: [
          {
            source: "Button",
            sourceImportPattern: "@company/ui",
            target: "NewButton",
            targetImportPath: "@/components/ui/button",
            complexity: "simple",
            guidelines: "Update import and rename",
          },
        ],
      },
    });

    const result = await run({
      projectRoot: FIXTURES,
      config,
      dryRun: true,
      silent: true,
    });

    assert.ok(result.report.migration, "migration report should exist");
    assert.equal(result.report.migration.targetDS, "New DS");

    const buttonMig = result.report.migration.components.find(
      (c) => c.source === "Button",
    );
    assert.ok(buttonMig, "should find Button migration");
    assert.equal(buttonMig.complexity, "simple");
    assert.ok(buttonMig.filesAffected >= 1, "should detect at least 1 file using Button");
  });

  it("returns null when migration is disabled", async () => {
    const config = deepMerge(DEFAULT_CONFIG, {
      scanDir: ".",
      extensions: [".tsx", ".ts"],
      exclude: [],
      migration: {
        enabled: false,
        targetDS: "",
        mappings: [],
      },
    });

    const result = await run({
      projectRoot: FIXTURES,
      config,
      dryRun: true,
      silent: true,
    });

    assert.equal(result.report.migration, null, "migration should be null when disabled");
  });

  it("groups by complexity correctly", async () => {
    const config = deepMerge(DEFAULT_CONFIG, {
      scanDir: ".",
      extensions: [".tsx", ".ts"],
      exclude: [],
      migration: {
        enabled: true,
        targetDS: "Test DS",
        mappings: [
          {
            source: "Button",
            sourceImportPattern: "@company/ui",
            target: "NewButton",
            targetImportPath: "@/new-ui/button",
            complexity: "simple",
            guidelines: "Easy swap",
          },
          {
            source: "cn",
            sourceImportPattern: "@/lib/utils",
            target: "clsx",
            targetImportPath: "clsx",
            complexity: "complex",
            guidelines: "Replace utility",
          },
        ],
      },
    });

    const result = await run({
      projectRoot: FIXTURES,
      config,
      dryRun: true,
      silent: true,
    });

    const mig = result.report.migration;
    assert.ok(mig);
    assert.ok(mig.summary.byComplexity.simple.count >= 1, "should have simple migrations");
    assert.ok(mig.summary.byComplexity.complex.count >= 1, "should have complex migrations");
  });
});
