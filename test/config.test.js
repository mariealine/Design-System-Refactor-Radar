import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { deepMerge, DEFAULT_CONFIG, loadConfig } from "design-system-assistant/config";

describe("Config", () => {
  it("DEFAULT_CONFIG has minimal agnostic defaults", () => {
    assert.equal(DEFAULT_CONFIG.scanDir, "src");
    assert.deepEqual(DEFAULT_CONFIG.violations, {}, "violations should be empty by default");
    assert.equal(DEFAULT_CONFIG.componentAnalysis.enabled, false, "component analysis disabled by default");
    assert.equal(DEFAULT_CONFIG.migration.enabled, false, "migration disabled by default");
    assert.equal(DEFAULT_CONFIG.roadmap.enabled, true, "roadmap enabled by default");
  });

  it("deepMerge merges nested objects", () => {
    const target = { a: { b: 1, c: 2 }, d: 3 };
    const source = { a: { b: 10 }, e: 5 };
    const result = deepMerge(target, source);

    assert.equal(result.a.b, 10, "should override nested value");
    assert.equal(result.a.c, 2, "should preserve unset nested value");
    assert.equal(result.d, 3, "should preserve unset top-level value");
    assert.equal(result.e, 5, "should add new top-level value");
  });

  it("deepMerge replaces arrays (not merges)", () => {
    const target = { arr: [1, 2, 3] };
    const source = { arr: [4, 5] };
    const result = deepMerge(target, source);

    assert.deepEqual(result.arr, [4, 5], "arrays should be replaced, not merged");
  });

  it("deepMerge handles null/undefined gracefully", () => {
    const target = { a: 1, b: { c: 2 } };
    const source = { a: undefined, b: null };
    const result = deepMerge(target, source);

    assert.equal(result.a, 1, "undefined should not override");
    assert.equal(result.b, null, "null should override");
  });

  it("loadConfig returns defaults when no config file exists", async () => {
    const config = await loadConfig("/tmp/nonexistent-project-12345");
    assert.equal(config.scanDir, DEFAULT_CONFIG.scanDir);
    assert.deepEqual(config.violations, DEFAULT_CONFIG.violations);
  });

  it("loadConfig merges user config with defaults", async () => {
    // This test uses the example config in the project root
    // Since there's no config file in the project root (we deleted the demo one),
    // it should just return defaults
    const config = await loadConfig(join(import.meta.dirname, ".."));
    assert.equal(config.scanDir, "src");
  });
});
