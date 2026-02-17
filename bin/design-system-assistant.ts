/**
 * Design System Assistant CLI
 *
 * Usage:
 *   npx design-system-assistant              # Scan and generate dashboard
 *   npx design-system-assistant init         # Interactive wizard + scaffold AI guidelines
 *   npx design-system-assistant doctor       # Validate config and diagnose issues
 *   npx design-system-assistant --dry-run    # Scan without writing files
 *   npx design-system-assistant --silent     # No console output
 *   npx design-system-assistant --open       # Open dashboard in browser after scan
 *   npx design-system-assistant --help       # Show help
 *
 * Shorthand: npx dsa
 */

import { run, init } from "../src/index.js";
import { doctor } from "../src/doctor.js";

const args = process.argv.slice(2);
const command = args[0] && !args[0].startsWith("-") ? args[0] : "scan";

if (args.includes("--version") || args.includes("-v")) {
  console.log("design-system-assistant 0.1.0");
  process.exit(0);
}

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
  Design System Assistant — Scanner & AI Guidelines

  Usage:
    npx design-system-assistant [command] [options]
    npx dsa [command] [options]

  Commands:
    scan (default)   Scan codebase and generate dashboard
    init             Interactive setup wizard + scaffold AI guidelines
                     (Cursor rules & skills, Claude/Agents skills)
    doctor           Validate config and diagnose common issues

  Scan options:
    --dry-run        Scan without writing report/dashboard files
    --silent         No console output
    --open           Open dashboard in browser after scan
    --config <path>  Path to config file (default: auto-discover)
    --dir <path>     Project root directory (default: cwd)

  Init options:
    --force              Overwrite existing files
    --dry-run            Show what would be created without writing
    --no-interactive     Skip wizard (use existing config or defaults)
    --target <name>      Only generate for specific target (cursor, claude, agents)
                         Can be repeated: --target cursor --target claude
    --config <path>      Path to config file
    --dir <path>         Project root directory (default: cwd)

  Doctor options:
    --config <path>  Path to config file (default: auto-discover)
    --dir <path>     Project root directory (default: cwd)

  General:
    -v, --version    Show version
    -h, --help       Show this help message

  Configuration:
    Run \`npx design-system-assistant init\` to launch the interactive setup wizard.
    It will guide you through configuration and generate:
    - design-system-assistant.config.mjs (your config file)
    - .cursor/rules/ (AI rules for Cursor)
    - .cursor/skills/ (AI skills for Cursor)

    All patterns and rules are derived from your config, ensuring
    that scanner rules and AI assistant behavior stay in sync.
  `);
  process.exit(0);
}

// Parse shared options
const dryRun = args.includes("--dry-run");
const silent = args.includes("--silent");

let projectRoot = process.cwd();
const dirIdx = args.indexOf("--dir");
if (dirIdx !== -1 && args[dirIdx + 1]) {
  projectRoot = args[dirIdx + 1];
}

let configPath: string | undefined;
const configIdx = args.indexOf("--config");
if (configIdx !== -1 && args[configIdx + 1]) {
  configPath = args[configIdx + 1];
}

async function main() {
  try {
    if (command === "init") {
      // Parse init-specific options
      const force = args.includes("--force");
      const noInteractive = args.includes("--no-interactive");
      const targets: Array<"cursor" | "claude" | "agents"> = [];
      let i = 0;
      while (i < args.length) {
        if (args[i] === "--target" && args[i + 1]) {
          const target = args[i + 1] as "cursor" | "claude" | "agents";
          if (["cursor", "claude", "agents"].includes(target)) {
            targets.push(target);
          }
          i += 2;
        } else {
          i++;
        }
      }

      await init({
        projectRoot,
        dryRun,
        silent,
        force,
        noInteractive,
        configPath,
        targets: targets.length > 0 ? targets : undefined,
      });
    } else if (command === "doctor") {
      await doctor({ projectRoot, configPath });
    } else {
      // Default: scan
      const open = args.includes("--open");
      const { dashboardPath } = await run({ projectRoot, dryRun, silent, configPath });

      if (open && !dryRun) {
        const { exec } = await import("node:child_process");
        const cmd =
          process.platform === "darwin"
            ? "open"
            : process.platform === "win32"
              ? "start"
              : "xdg-open";
        exec(`${cmd} "${dashboardPath}"`);
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n❌ Design System Assistant ${command} failed:\n`);
    console.error(`   ${message}\n`);

    // Helpful hints based on common errors
    if (message.includes("does not exist")) {
      console.error("   💡 Check that your scanDir is correct in your design-system-assistant config");
      console.error("   💡 Or run `npx design-system-assistant init` to create a config.\n");
    } else if (message.includes("config")) {
      console.error("   💡 Run `npx design-system-assistant init` to create or fix your config.\n");
    }

    process.exit(1);
  }
}

main();
