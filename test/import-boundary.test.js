import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { analyzeImportBoundaries } from "../dist/import-boundary-analyzer.js";
import { deepMerge, DEFAULT_CONFIG } from "../dist/config.js";

const FIXTURES = join(import.meta.dirname, "fixtures");

const PURITY_CONFIG = deepMerge(DEFAULT_CONFIG, {
  scanDir: ".",
  scanDirs: ["components"],
  purity: {
    enabled: true,
    uiCandidateDirs: ["components"],
    allowedImportMatchers: ["react", "clsx", "classnames", "tailwind-merge", "@radix-ui/", "@/components/ui/"],
    forbiddenImportMatchers: ["@/lib/", "@/server/", "@/db/", "@/actions/", "@/features/"],
    businessDirMatchers: ["app/", "lib/", "server/", "db/", "actions/", "features/"],
    nextServerImportMatchers: ["next/headers", "next/cache"],
  },
});

describe("Import Boundary Analyzer", () => {
  it("detects pure UI component", async () => {
    const fileContents = new Map();
    const purePath = join(FIXTURES, "components", "pure-component.tsx");
    fileContents.set(purePath, readFileSync(purePath, "utf-8"));

    const reports = await analyzeImportBoundaries(fileContents, FIXTURES, PURITY_CONFIG);
    
    const report = reports["components/pure-component.tsx"];
    assert.ok(report, "Report should exist");
    assert.strictEqual(report.isUiCandidate, true);
    assert.strictEqual(report.purity, "pure");
    assert.strictEqual(report.score, 0);
    assert.strictEqual(report.reasons.length, 0);
  });

  it("detects forbidden imports", async () => {
    const fileContents = new Map();
    const impurePath = join(FIXTURES, "components", "impure-component.tsx");
    fileContents.set(impurePath, readFileSync(impurePath, "utf-8"));

    const reports = await analyzeImportBoundaries(fileContents, FIXTURES, PURITY_CONFIG);
    
    const report = reports["components/impure-component.tsx"];
    assert.ok(report, "Report should exist");
    assert.strictEqual(report.isUiCandidate, true);
    assert.strictEqual(report.purity, "impure");
    assert.ok(report.score > 0, "Score should be > 0");
    assert.ok(report.reasons.length > 0, "Should have violation reasons");
    
    const forbiddenReasons = report.reasons.filter(r => r.type === "forbidden-import");
    assert.ok(forbiddenReasons.length > 0, "Should detect forbidden imports");
    assert.ok(forbiddenReasons.some(r => r.importPath.includes("@/lib/") || r.importPath.includes("@/db/")), 
      "Should detect @/lib/ or @/db/ imports");
  });

  it("detects Next.js server API imports", async () => {
    const fileContents = new Map();
    const serverPath = join(FIXTURES, "components", "server-component.tsx");
    fileContents.set(serverPath, readFileSync(serverPath, "utf-8"));

    const reports = await analyzeImportBoundaries(fileContents, FIXTURES, PURITY_CONFIG);
    
    const report = reports["components/server-component.tsx"];
    assert.ok(report, "Report should exist");
    assert.strictEqual(report.isUiCandidate, true);
    assert.strictEqual(report.purity, "impure");
    
    const serverReasons = report.reasons.filter(r => r.type === "server-api");
    assert.ok(serverReasons.length > 0, "Should detect server API imports");
    assert.ok(serverReasons.some(r => r.importPath.includes("next/headers") || r.importPath.includes("next/cache")),
      "Should detect next/headers or next/cache");
  });

  it("detects transitive coupling", async () => {
    const fileContents = new Map();
    const transitivePath = join(FIXTURES, "components", "transitive-impure.tsx");
    const helperPath = join(FIXTURES, "components", "helper.ts");
    fileContents.set(transitivePath, readFileSync(transitivePath, "utf-8"));
    fileContents.set(helperPath, readFileSync(helperPath, "utf-8"));

    const reports = await analyzeImportBoundaries(fileContents, FIXTURES, PURITY_CONFIG);
    
    const report = reports["components/transitive-impure.tsx"];
    assert.ok(report, "Report should exist");
    assert.strictEqual(report.isUiCandidate, true);
    
    // Should detect transitive violation through helper.ts
    const transitiveReasons = report.reasons.filter(r => r.type === "transitive");
    assert.ok(transitiveReasons.length > 0, "Should detect transitive violations");
  });

  it("only analyzes UI candidate directories", async () => {
    const fileContents = new Map();
    const helperPath = join(FIXTURES, "helper.ts");
    fileContents.set(helperPath, readFileSync(helperPath, "utf-8"));

    const reports = await analyzeImportBoundaries(fileContents, FIXTURES, PURITY_CONFIG);
    
    // helper.ts is not in components/ so it shouldn't be analyzed
    const report = reports["helper.ts"];
    assert.strictEqual(report, undefined, "Non-UI candidate files should not be analyzed");
  });

  it("allows permitted imports", async () => {
    const fileContents = new Map();
    const purePath = join(FIXTURES, "components", "pure-component.tsx");
    fileContents.set(purePath, readFileSync(purePath, "utf-8"));

    const reports = await analyzeImportBoundaries(fileContents, FIXTURES, PURITY_CONFIG);
    
    const report = reports["components/pure-component.tsx"];
    assert.ok(report, "Report should exist");
    // Should not flag allowed imports like "react" or "@/components/ui/"
    const forbiddenReasons = report.reasons.filter(r => 
      r.importPath === "react" || r.importPath.includes("@/components/ui/")
    );
    assert.strictEqual(forbiddenReasons.length, 0, "Should not flag allowed imports");
  });
});
