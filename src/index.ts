/**
 * DS Coverage — Public API
 *
 * Programmatic interface for running the scanner, analyzer, and dashboard builder.
 */

import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { writeFile } from "node:fs/promises";
import { loadConfig, deepMerge } from "./config.js";
import type { DsCoverageConfig } from "./config.js";
import { scan, buildCategorySummary } from "./scanner.js";
export { scan, buildCategorySummary } from "./scanner.js";
import { analyzeComponents } from "./component-analyzer.js";
import { buildRoadmap } from "./roadmap-builder.js";
import { buildDashboard } from "./dashboard-builder.js";
import { analyzeMigration } from "./migration-analyzer.js";
import { discoverMigrationMappings } from "./migration-defaults.js";
import type { Report } from "./types.js";

export type { DsCoverageConfig } from "./config.js";
export type { Report } from "./types.js";
export { DEFAULT_CONFIG } from "./config.js";
export { init } from "./init.js";
export type { InitOptions } from "./init.js";
export { doctor } from "./doctor.js";
export type { DoctorOptions } from "./doctor.js";
export { runWizard, buildConfigFromAnswers, serializeConfig } from "./wizard.js";
export type { WizardAnswers } from "./wizard.js";

export interface RunOptions {
  /** Project root directory (defaults to cwd) */
  projectRoot?: string;
  /** Override config (merged with file config + defaults) */
  config?: Partial<DsCoverageConfig>;
  /** Path to config file (overrides auto-discovery) */
  configPath?: string;
  /** Skip writing files to disk */
  dryRun?: boolean;
  /** Silent mode — no console output */
  silent?: boolean;
}

export interface RunResult {
  report: Report;
  dashboardHtml: string;
  reportJsonPath: string;
  dashboardPath: string;
}

/**
 * Run the full DS coverage scan pipeline.
 */
export async function run(options: RunOptions = {}): Promise<RunResult> {
  const projectRoot = options.projectRoot || process.cwd();

  // Load and merge config (deep merge to preserve nested defaults)
  let config = await loadConfig(projectRoot, options.configPath);
  if (options.config) {
    config = deepMerge(config, options.config);
  }

  const scanDir = join(projectRoot, config.scanDir);
  const log = options.silent ? () => {} : console.log;

  // Check if config has violations defined
  const enabledViolations = Object.entries(config.violations).filter(([, v]) => v.enabled);
  if (enabledViolations.length === 0) {
    log("⚠️  No violation categories configured.");
    log("   Run `npx ds-coverage init` to set up your project.\n");
  }

  log("🔍 Scanning design system coverage...\n");

  // 1. Scan files
  const { fileReports, fileContents, totalFiles } = await scan(projectRoot, config);
  log(`  ${totalFiles} files found, ${fileReports.length} scanned (after exclusions)\n`);

  // 2. Analyze component APIs
  const componentApi = analyzeComponents(fileReports, fileContents, scanDir, config);

  // 3. Build roadmap
  const roadmap = buildRoadmap(fileReports, config);

  // 3b. Analyze migration (if enabled)
  // When migration is enabled but mappings are empty, auto-discover from codebase
  let migrationConfig = config;
  if (
    config.migration.enabled &&
    config.migration.mappings.length === 0 &&
    config.migration.targetDS
  ) {
    const discovered = discoverMigrationMappings(
      fileContents,
      componentApi,
      scanDir,
      config,
    );
    if (discovered.length > 0) {
      migrationConfig = {
        ...config,
        migration: {
          ...config.migration,
          mappings: discovered,
        },
      };
    }
  }
  const migration = analyzeMigration(fileContents, scanDir, migrationConfig);

  // 4. Build summary
  const filesWithViolations = fileReports.filter((f) => f.totalViolations > 0);
  const totalViolations = fileReports.reduce((s, f) => s + f.totalViolations, 0);
  const totalFlags = fileReports.reduce((s, f) => s + f.totalFlags, 0);
  const coveragePercent =
    fileReports.length > 0
      ? Math.round(((fileReports.length - filesWithViolations.length) / fileReports.length) * 10000) / 100
      : 100;

  const categories: Record<string, ReturnType<typeof buildCategorySummary>> = {};
  for (const key of Object.keys(config.violations)) {
    if (config.violations[key].enabled) {
      categories[key] = buildCategorySummary(fileReports, key);
    }
  }

  const report: Report = {
    generatedAt: new Date().toISOString(),
    projectRoot: resolve(projectRoot),
    scanDir: relative(projectRoot, scanDir),
    summary: {
      totalFiles,
      totalFilesScanned: fileReports.length,
      totalFilesWithViolations: filesWithViolations.length,
      totalViolations,
      totalFlags,
      coveragePercent,
      categories,
      flags: {
        migrateSimple: fileReports.reduce((s, f) => s + f.flags.migrateSimple.length, 0),
        migrateComplex: fileReports.reduce((s, f) => s + f.flags.migrateComplex.length, 0),
        todo: fileReports.reduce((s, f) => s + f.flags.todo.length, 0),
      },
    },
    roadmap,
    componentApi,
    migration,
    files: fileReports
      .filter((f) => f.totalViolations > 0 || f.totalFlags > 0)
      .sort((a, b) => b.totalViolations - a.totalViolations),
  };

  // 5. Build dashboard
  const dashboardHtml = await buildDashboard(report, config);

  // 6. Write output files
  const reportJsonPath = join(projectRoot, config.output.reportJson);
  const dashboardPath = join(projectRoot, config.output.dashboardHtml);

  if (!options.dryRun) {
    await writeFile(reportJsonPath, JSON.stringify(report, null, 2), "utf-8");
    await writeFile(dashboardPath, dashboardHtml, "utf-8");
  }

  // 7. Print summary
  log("📊 Design System Coverage Report");
  log("======================================\n");
  log(`  Coverage:         ${coveragePercent}% (${fileReports.length - filesWithViolations.length}/${fileReports.length} compliant files)`);
  log(`  Total violations: ${totalViolations}`);
  log(`  Files affected:   ${filesWithViolations.length}\n`);

  if (Object.keys(categories).length > 0) {
    log("  By category:");
    for (const [key, cat] of Object.entries(categories)) {
      const label = config.violations[key]?.label || key;
      log(`    ${label.padEnd(14)} ${cat.totalViolations} violations in ${cat.totalFiles} files`);
    }
    log("");
  }

  log("  Flags:");
  log(`    @ds-migrate: simple  → ${report.summary.flags.migrateSimple}`);
  log(`    @ds-migrate: complex → ${report.summary.flags.migrateComplex}`);
  log(`    @ds-todo             → ${report.summary.flags.todo}`);

  if (config.componentAnalysis.enabled) {
    const ca = componentApi.summary;
    log("");
    log("  Component API:");
    log(`    Total:          ${ca.totalComponents} (${Object.entries(ca.byLocation).map(([k, v]) => `${v} ${k}/`).join(", ")})`);
    if (ca.usesCVA > 0) log(`    Uses CVA:       ${ca.usesCVA}`);
    log(`    Correct API:    ${ca.correctApiNaming}`);
    log(`    Avg compliance: ${ca.avgComplianceScore}%`);
  }

  if (migration && migration.summary.totalMappings > 0) {
    const ms = migration.summary;
    log("");
    log(`  Migration → ${migration.targetDS}:`);
    log(`    To migrate: ${ms.totalToMigrate} (${ms.totalMigrated} already migrated)`);
    log(`    Usages:     ${ms.totalUsages} in ${ms.totalFilesAffected} files`);
    if (migration.legacyHtml && migration.legacyHtml.totalElements > 0) {
      log(`    Legacy HTML: ${migration.legacyHtml.totalElements} elements in ${migration.legacyHtml.totalFiles} files`);
      for (const [tag, count] of Object.entries(migration.legacyHtml.byElement)) {
        if (count.usages > 0) log(`      <${tag}>: ${count.usages} (${count.files} files)`);
      }
    }
    if (ms.byComplexity.simple.count > 0) log(`    ✅ Simple:   ${ms.byComplexity.simple.count} (${ms.byComplexity.simple.usages} usages)`);
    if (ms.byComplexity.moderate.count > 0) log(`    ⚠️  Moderate: ${ms.byComplexity.moderate.count} (${ms.byComplexity.moderate.usages} usages)`);
    if (ms.byComplexity.complex.count > 0) log(`    🔴 Complex:  ${ms.byComplexity.complex.count} (${ms.byComplexity.complex.usages} usages)`);
  }

  if (!options.dryRun) {
    log(`\n  Report:    ${relative(projectRoot, reportJsonPath)}`);
    log(`  Dashboard: ${pathToFileURL(dashboardPath).href}\n`);
  }

  return { report, dashboardHtml, reportJsonPath, dashboardPath };
}
