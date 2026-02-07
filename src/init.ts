/**
 * DS Coverage — Init
 *
 * Scaffolds AI guidelines (rules + skills) into the project.
 * Supports Cursor (.cursor/rules/), Claude (.claude/skills/),
 * and generic agents (.agents/skills/).
 *
 * When run interactively, launches a wizard to guide the user
 * through configuration and generates the config file + skills.
 */

import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { loadConfig, deepMerge } from "./config.js";
import type { DsCoverageConfig } from "./config.js";
import { generateComplianceRule } from "./templates/compliance-rule.js";
import { generateComponentRule } from "./templates/component-rule.js";
import { generateSkill } from "./templates/skill.js";
import { runWizard, buildConfigFromAnswers, serializeConfig } from "./wizard.js";

export interface InitOptions {
  projectRoot?: string;
  /** Override config (merged with file config + defaults) */
  config?: Partial<DsCoverageConfig>;
  /** Only generate for specific targets */
  targets?: Array<"cursor" | "claude" | "agents">;
  /** Silent mode */
  silent?: boolean;
  /** Dry run — show what would be created without writing */
  dryRun?: boolean;
  /** Force overwrite existing files */
  force?: boolean;
  /** Skip interactive wizard (use existing config or defaults) */
  noInteractive?: boolean;
  /** Path to config file (overrides auto-discovery) */
  configPath?: string;
}

interface GeneratedFile {
  path: string;
  relativePath: string;
  content: string;
  skipped: boolean;
  reason?: string;
}

const ALL_TARGETS = ["cursor", "claude", "agents"] as const;

export async function init(options: InitOptions = {}): Promise<GeneratedFile[]> {
  const projectRoot = options.projectRoot || process.cwd();
  const targets = options.targets || [...ALL_TARGETS];
  const log = options.silent ? () => {} : console.log;

  let config: DsCoverageConfig;

  // Check if a config file already exists
  let configExists = false;
  const configFileNames = [
    "ds-coverage.config.js",
    "ds-coverage.config.mjs",
    "ds-coverage.config.cjs",
    "ds-coverage.config.json",
    "ds-coverage.config.ts",
  ];

  for (const name of configFileNames) {
    try {
      await access(join(projectRoot, name));
      configExists = true;
      break;
    } catch {
      // not found
    }
  }

  if (!options.noInteractive && !configExists) {
    // Run interactive wizard
    const answers = await runWizard();
    const wizardConfig = buildConfigFromAnswers(answers);

    // Write config file
    const configContent = serializeConfig(wizardConfig);
    const configPath = join(projectRoot, "ds-coverage.config.mjs");

    if (!options.dryRun) {
      await writeFile(configPath, configContent, "utf-8");
      log("\n  ✅ ds-coverage.config.mjs");
    } else {
      log("\n  📝 ds-coverage.config.mjs (dry run)");
    }

    // Load full config (merge wizard output with defaults)
    config = await loadConfig(projectRoot, options.configPath);
    if (options.config) {
      config = deepMerge(config, options.config);
    }
  } else {
    // Load existing config
    config = await loadConfig(projectRoot, options.configPath);
    if (options.config) {
      config = deepMerge(config, options.config);
    }
    log("\n📐 Generating AI guidelines for your design system...\n");
  }

  // Generate content
  const complianceRule = generateComplianceRule(config);
  const componentRule = config.componentAnalysis.enabled
    ? generateComponentRule(config)
    : null;
  const skill = generateSkill(config);

  // Define all files to generate
  const filesToGenerate: Array<{
    target: string;
    relativePath: string;
    content: string;
  }> = [];

  for (const target of targets) {
    switch (target) {
      case "cursor":
        filesToGenerate.push({
          target: "cursor",
          relativePath: ".cursor/rules/design-system-compliance.mdc",
          content: complianceRule,
        });
        if (componentRule) {
          filesToGenerate.push({
            target: "cursor",
            relativePath: ".cursor/rules/ui-component-creation.mdc",
            content: componentRule,
          });
        }
        filesToGenerate.push({
          target: "cursor",
          relativePath: ".cursor/skills/design-system-compliance/SKILL.md",
          content: skill,
        });
        break;

      case "claude":
        filesToGenerate.push({
          target: "claude",
          relativePath: ".claude/skills/design-system-compliance/SKILL.md",
          content: skill,
        });
        break;

      case "agents":
        filesToGenerate.push({
          target: "agents",
          relativePath: ".agents/skills/design-system-compliance/SKILL.md",
          content: skill,
        });
        break;
    }
  }

  // Write files
  const results: GeneratedFile[] = [];

  for (const file of filesToGenerate) {
    const fullPath = join(projectRoot, file.relativePath);

    // Check if file exists
    let exists = false;
    try {
      await access(fullPath);
      exists = true;
    } catch {
      exists = false;
    }

    if (exists && !options.force) {
      results.push({
        path: fullPath,
        relativePath: file.relativePath,
        content: file.content,
        skipped: true,
        reason: "File already exists. Use --force to overwrite.",
      });
      log(`  ⏭  ${file.relativePath} (skipped — already exists)`);
      continue;
    }

    if (options.dryRun) {
      results.push({
        path: fullPath,
        relativePath: file.relativePath,
        content: file.content,
        skipped: false,
      });
      log(`  📝 ${file.relativePath} (dry run — would be created)`);
      continue;
    }

    // Create directory and write file
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, file.content, "utf-8");

    results.push({
      path: fullPath,
      relativePath: file.relativePath,
      content: file.content,
      skipped: false,
    });
    log(`  ✅ ${file.relativePath}`);
  }

  // Summary
  const created = results.filter((r) => !r.skipped);
  const skipped = results.filter((r) => r.skipped);

  log("");
  if (created.length > 0) {
    log(`  ${options.dryRun ? "Would create" : "Created"}: ${created.length} file(s)`);
  }
  if (skipped.length > 0) {
    log(`  Skipped: ${skipped.length} file(s) (use --force to overwrite)`);
  }
  log("");

  // Propose to update .gitignore
  if (!options.dryRun && created.length > 0) {
    await updateGitignore(projectRoot, log);
  }

  if (!options.dryRun && created.length > 0) {
    log("  ─── What's next? ──────────────────────────────────");
    log("");
    log("  💡 Your Cursor assistant now follows your design system!");
    log("");
    log("  • Edit ds-coverage.config.js to adjust rules");
    log("  • Re-run `npx ds-coverage init --force` after changes");
    log("  • Run `npx ds-coverage` to scan your codebase");
    log("  • Run `npx ds-coverage --open` to open the dashboard");
    log("");
  }

  return results;
}

// ============================================
// GITIGNORE HELPER
// ============================================

const GITIGNORE_ENTRIES = [
  "ds-coverage-report.json",
  "ds-coverage-dashboard.html",
];

async function updateGitignore(
  projectRoot: string,
  log: (...args: unknown[]) => void,
): Promise<void> {
  const gitignorePath = join(projectRoot, ".gitignore");

  let existing = "";
  try {
    existing = await readFile(gitignorePath, "utf-8");
  } catch {
    // No .gitignore — skip
    return;
  }

  const linesToAdd = GITIGNORE_ENTRIES.filter(
    (entry) => !existing.split("\n").some((line) => line.trim() === entry),
  );

  if (linesToAdd.length === 0) return;

  const block = `\n# ds-coverage (generated output)\n${linesToAdd.join("\n")}\n`;
  await writeFile(gitignorePath, existing.trimEnd() + "\n" + block, "utf-8");
  log(`  ✅ .gitignore (added: ${linesToAdd.join(", ")})`);
}
