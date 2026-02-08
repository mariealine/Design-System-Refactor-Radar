/**
 * DS Coverage — Doctor
 *
 * Validates config, checks environment, and diagnoses common issues.
 * Zero dependencies — uses only Node.js built-ins.
 */

import { stat, readdir } from "node:fs/promises";
import { join, extname } from "node:path";
import { loadConfig } from "./config.js";
import type { DsCoverageConfig } from "./config.js";

export interface DoctorOptions {
  projectRoot?: string;
  configPath?: string;
}

interface Check {
  label: string;
  status: "pass" | "warn" | "fail";
  detail?: string;
}

export async function doctor(options: DoctorOptions = {}): Promise<void> {
  const projectRoot = options.projectRoot || process.cwd();
  const checks: Check[] = [];

  console.log("\n🩺 ds-coverage doctor\n");
  console.log(`  Project root: ${projectRoot}\n`);

  // 1. Config loading
  let config: DsCoverageConfig;
  try {
    config = await loadConfig(projectRoot, options.configPath);
    const configSource = options.configPath || "auto-discovered";
    checks.push({ label: "Config loaded", status: "pass", detail: `Source: ${configSource}` });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    checks.push({ label: "Config loaded", status: "fail", detail: message });
    printChecks(checks);
    console.log("\n  ❌ Fix the config error above, then re-run `npx ds-coverage doctor`.\n");
    return;
  }

  // 2. scanDir exists
  const scanDir = join(projectRoot, config.scanDir);
  try {
    const s = await stat(scanDir);
    if (s.isDirectory()) {
      checks.push({ label: `scanDir exists (${config.scanDir}/)`, status: "pass" });
    } else {
      checks.push({ label: `scanDir exists (${config.scanDir}/)`, status: "fail", detail: "Path exists but is not a directory" });
    }
  } catch {
    checks.push({ label: `scanDir exists (${config.scanDir}/)`, status: "fail", detail: "Directory not found. Check your config." });
  }

  // 3. Files discoverable
  try {
    const fileCount = await countFiles(scanDir, config.extensions, config.exclude);
    if (fileCount === 0) {
      checks.push({ label: "Scannable files found", status: "warn", detail: `0 files matching [${config.extensions.join(", ")}] in ${config.scanDir}/. Check extensions and exclude patterns.` });
    } else {
      checks.push({ label: "Scannable files found", status: "pass", detail: `${fileCount} files matching [${config.extensions.join(", ")}]` });
    }
  } catch {
    checks.push({ label: "Scannable files found", status: "warn", detail: "Could not enumerate files." });
  }

  // 4. Violation categories
  const enabledViolations = Object.entries(config.violations).filter(([, v]) => v.enabled);
  if (enabledViolations.length === 0) {
    checks.push({ label: "Violation categories configured", status: "warn", detail: "No violation categories are enabled. Run `npx ds-coverage init` to set up patterns." });
  } else {
    checks.push({ label: "Violation categories configured", status: "pass", detail: `${enabledViolations.length} enabled: ${enabledViolations.map(([k]) => k).join(", ")}` });
  }

  // 5. Regex patterns valid
  let invalidPatterns = 0;
  for (const [key, catConfig] of enabledViolations) {
    try {
      new RegExp(catConfig.pattern, "g");
    } catch {
      invalidPatterns++;
      checks.push({ label: `Pattern valid: violations.${key}`, status: "fail", detail: `Invalid regex: "${catConfig.pattern}"` });
    }
  }
  if (invalidPatterns === 0 && enabledViolations.length > 0) {
    checks.push({ label: "All regex patterns valid", status: "pass" });
  }

  // 6. Component analysis
  if (config.componentAnalysis.enabled) {
    const compDir = join(scanDir, config.componentAnalysis.primaryDirectory);
    try {
      const s = await stat(compDir);
      if (s.isDirectory()) {
        checks.push({ label: `Component directory exists (${config.componentAnalysis.primaryDirectory})`, status: "pass" });
      } else {
        checks.push({ label: `Component directory exists (${config.componentAnalysis.primaryDirectory})`, status: "fail", detail: "Path exists but is not a directory" });
      }
    } catch {
      checks.push({ label: `Component directory exists (${config.componentAnalysis.primaryDirectory})`, status: "warn", detail: "Directory not found. Components won't be analyzed." });
    }
  } else {
    checks.push({ label: "Component analysis", status: "pass", detail: "Disabled (optional)" });
  }

  // 7. Migration
  if (config.migration.enabled) {
    const targetDS = (config.migration.targetDS || "").toLowerCase();
    const autoDiscover = config.migration.mappings.length === 0 && targetDS.includes("shadcn");
    if (config.migration.mappings.length === 0 && !autoDiscover) {
      checks.push({ label: "Migration mappings", status: "warn", detail: "Migration is enabled but no mappings are defined. Add entries to migration.mappings (or use targetDS 'shadcn/ui' for auto-discovery)." });
    } else {
      const detail = autoDiscover
        ? `Mappings will be auto-discovered from codebase → ${config.migration.targetDS}`
        : `${config.migration.mappings.length} mappings → ${config.migration.targetDS}`;
      checks.push({ label: "Migration mappings", status: "pass", detail });
    }
  } else {
    checks.push({ label: "Migration", status: "pass", detail: "Disabled (optional)" });
  }

  // 8. Output paths
  checks.push({ label: "Output paths configured", status: "pass", detail: `Report: ${config.output.reportJson}, Dashboard: ${config.output.dashboardHtml}` });

  // Print results
  printChecks(checks);

  const fails = checks.filter((c) => c.status === "fail").length;
  const warns = checks.filter((c) => c.status === "warn").length;
  const passes = checks.filter((c) => c.status === "pass").length;

  console.log("");
  if (fails > 0) {
    console.log(`  ❌ ${fails} issue(s) found. Fix them and re-run \`npx ds-coverage doctor\`.`);
  } else if (warns > 0) {
    console.log(`  ⚠️  ${passes} passed, ${warns} warning(s). Your setup works but could be improved.`);
  } else {
    console.log(`  ✅ All ${passes} checks passed. Your project is ready!`);
  }
  console.log(`\n  Run \`npx ds-coverage\` to scan your codebase.\n`);
}

function printChecks(checks: Check[]): void {
  for (const check of checks) {
    const icon = check.status === "pass" ? "✅" : check.status === "warn" ? "⚠️ " : "❌";
    console.log(`  ${icon} ${check.label}`);
    if (check.detail) {
      console.log(`     ${check.detail}`);
    }
  }
}

async function countFiles(
  dir: string,
  extensions: string[],
  exclude: string[],
): Promise<number> {
  let count = 0;

  async function walk(d: string): Promise<void> {
    const entries = await readdir(d, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(d, entry.name);
      const rel = fullPath.slice(dir.length + 1);
      if (exclude.some((exc) => rel.includes(exc))) continue;
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (extensions.includes(extname(entry.name))) {
        count++;
      }
    }
  }

  await walk(dir);
  return count;
}
