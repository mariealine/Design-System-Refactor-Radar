import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { deepMerge, DEFAULT_CONFIG } from "../dist/config.js";

// Import template generators from the built bundle
// They're not directly exported, so we need to use the init pathway
// Instead, let's test via dynamic import of the chunks
// Actually, the templates are used internally — let's test via the init dry-run

import { init } from "../dist/index.js";
import { join } from "node:path";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";

describe("Templates", () => {
  let tempDir;

  it("init generates compliance rule with correct structure", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "ds-coverage-test-"));

    // Create a minimal config file
    const config = deepMerge(DEFAULT_CONFIG, {
      violations: {
        colors: {
          enabled: true,
          label: "Colors",
          icon: "🎨",
          color: "red",
          pattern: "hardcoded-color",
        },
      },
      componentAnalysis: {
        enabled: true,
        directories: ["components/ui/"],
        primaryDirectory: "components/ui/",
      },
    });

    const configContent = `export default ${JSON.stringify(config, null, 2)};`;
    await writeFile(join(tempDir, "ds-coverage.config.js"), configContent);
    await mkdir(join(tempDir, "src"), { recursive: true });

    // Use dryRun to avoid filesystem writes (sandbox-safe)
    const results = await init({
      projectRoot: tempDir,
      noInteractive: true,
      targets: ["cursor"],
      silent: true,
      dryRun: true,
    });

    assert.ok(results.length > 0, "should generate files");

    // Check compliance rule
    const complianceRule = results.find((r) =>
      r.relativePath.includes("design-system-compliance.mdc"),
    );
    assert.ok(complianceRule, "should generate compliance rule");
    assert.ok(complianceRule.content.includes("Colors") || complianceRule.content.includes("colors"), "compliance rule should mention Colors");
    assert.ok(complianceRule.content.includes("@ds-migrate"), "compliance rule should mention flagging");
    assert.ok(complianceRule.content.includes("Boy Scout"), "compliance rule should mention Boy Scout Rule");

    // Check component rule
    const componentRule = results.find((r) =>
      r.relativePath.includes("ui-component-creation.mdc"),
    );
    assert.ok(componentRule, "should generate component rule when componentAnalysis is enabled");
    assert.ok(componentRule.content.includes("components/ui/"), "component rule should reference primary dir");

    // Check skill
    const skill = results.find((r) => r.relativePath.includes("SKILL.md"));
    assert.ok(skill, "should generate SKILL.md");
    assert.ok(skill.content.includes("design-system-compliance"), "skill should reference itself");

    // Cleanup
    await rm(tempDir, { recursive: true, force: true });
  });

  it("init skips component rule when componentAnalysis is disabled", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "ds-coverage-test-"));

    const config = deepMerge(DEFAULT_CONFIG, {
      componentAnalysis: { enabled: false },
    });
    const configContent = `export default ${JSON.stringify(config, null, 2)};`;
    await writeFile(join(tempDir, "ds-coverage.config.js"), configContent);
    await mkdir(join(tempDir, "src"), { recursive: true });

    const results = await init({
      projectRoot: tempDir,
      noInteractive: true,
      targets: ["cursor"],
      silent: true,
      dryRun: true,
    });

    const componentRule = results.find((r) =>
      r.relativePath.includes("ui-component-creation"),
    );
    assert.equal(componentRule, undefined, "should NOT generate component rule when disabled");

    await rm(tempDir, { recursive: true, force: true });
  });
});
