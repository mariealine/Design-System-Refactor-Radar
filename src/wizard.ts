/**
 * DS Coverage — Interactive Setup Wizard
 *
 * Guides the user through project configuration using Node.js readline.
 * Zero dependencies — uses only Node.js built-ins.
 */

import { createInterface } from "node:readline";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { DsCoverageConfig } from "./config.js";
import { getPreset, type PresetId, PRESETS_INFO } from "./presets.js";
import { COPY, WIZARD_STEP_LABELS } from "./wizard-copy.js";

// ============================================
// TYPES
// ============================================

export interface WizardAnswers {
  cssMethodology: CssMethodology;
  framework: Framework;
  dsStatus: DsStatus;
  scanDir: string;
  scanDirs: string[];
  extensions: string[];
  componentDir: string;
  tokenCategories: string[];
  componentArchitecture: ComponentArchitecture;
  /** Target DS name for migration (empty = no migration) */
  migrationTargetDS: string;
  /** If true, show the "Components — API Redesign" tab in the dashboard */
  apiRedesignPlanned: "yes" | "no";
}

export type CssMethodology =
  | "tailwind"
  | "css-modules"
  | "css-in-js"
  | "vanilla-css"
  | "utility-custom"
  | "none";

export type Framework =
  | "react"
  | "vue"
  | "svelte"
  | "vanilla"
  | "other";

export type DsStatus = "existing" | "from-scratch";

export type ComponentArchitecture =
  | "cva"
  | "styled-components"
  | "css-modules"
  | "vanilla"
  | "other";

// ============================================
// PROMPT HELPERS
// ============================================

function createReadline(): ReturnType<typeof createInterface> {
  return createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

async function ask(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function askChoice(
  rl: ReturnType<typeof createInterface>,
  question: string,
  options: readonly { key: string; label: string }[],
  defaultIdx = 0,
  currentKey?: string,
): Promise<string> {
  const idxFromKey = currentKey != null
    ? options.findIndex((o) => o.key === currentKey)
    : -1;
  const effectiveDefault = idxFromKey >= 0 ? idxFromKey : defaultIdx;

  console.log(`\n  ${question}\n`);
  for (let i = 0; i < options.length; i++) {
    const marker = i === effectiveDefault ? "▸" : " ";
    console.log(`    ${marker}  [${i + 1}]  ${options[i].label}`);
  }
  console.log("");

  const answer = await ask(rl, COPY.navigation.choicePrompt(1, options.length, effectiveDefault + 1));
  const idx = answer ? parseInt(answer, 10) - 1 : effectiveDefault;
  if (idx >= 0 && idx < options.length) {
    return options[idx].key;
  }
  return options[effectiveDefault].key;
}

async function askMultiChoice(
  rl: ReturnType<typeof createInterface>,
  question: string,
  options: readonly { key: string; label: string; defaultOn: boolean }[],
  currentSelection?: string[],
): Promise<string[]> {
  const defaultKeys =
    currentSelection && currentSelection.length > 0
      ? currentSelection
      : options.filter((o) => o.defaultOn).map((o) => o.key);
  const defaultNums = options
    .map((o, i) => (defaultKeys.includes(o.key) ? String(i + 1) : null))
    .filter(Boolean)
    .join(",");

  console.log(`\n  ${question}\n`);
  for (let i = 0; i < options.length; i++) {
    const check = defaultKeys.includes(options[i].key) ? "☑" : "☐";
    console.log(`    ${check}  [${i + 1}]  ${options[i].label}`);
  }
  console.log("");

  const answer = await ask(rl, COPY.navigation.multiPrompt(defaultNums));

  if (!answer) {
    return defaultKeys;
  }

  if (answer.toLowerCase() === "all" || answer === "*") {
    return options.map((o) => o.key);
  }

  const selected = answer
    .split(",")
    .map((s) => parseInt(s.trim(), 10) - 1)
    .filter((i) => i >= 0 && i < options.length)
    .map((i) => options[i].key);

  return selected.length > 0 ? selected : defaultKeys;
}

async function askText(
  rl: ReturnType<typeof createInterface>,
  question: string,
  defaultValue: string,
): Promise<string> {
  console.log(`\n  ${question}`);
  const answer = await ask(rl, COPY.navigation.textPrompt(defaultValue));
  return answer || defaultValue;
}

// ============================================
// WIZARD FLOW
// ============================================

type WizardState = Partial<WizardAnswers>;

function showSectionIfFirst(step: number): void {
  const sep = "  ─────────────────────────────────────────────────────";
  if (step === 0) {
    console.log("");
    console.log(sep);
    console.log(`  ${COPY.sections.techStack.title}`);
    console.log(`  ${COPY.sections.techStack.hint}`);
    console.log(sep);
  } else if (step === 3) {
    console.log("");
    console.log(sep);
    console.log(`  ${COPY.sections.projectStructure.title}`);
    console.log(`  ${COPY.sections.projectStructure.hint}`);
    console.log(sep);
  } else if (step === 7) {
    console.log("");
    console.log(sep);
    console.log(`  ${COPY.sections.designTokens.title}`);
    console.log(`  ${COPY.sections.designTokens.hint}`);
    console.log(sep);
  } else if (step === 8) {
    console.log("");
    console.log(sep);
    console.log(`  ${COPY.sections.migration.title}`);
    console.log(`  ${COPY.sections.migration.hint}`);
    console.log(sep);
  } else if (step === 9) {
    console.log("");
    console.log(sep);
    console.log("  📊  Dashboard");
    console.log("  Choose which tabs to show in the coverage dashboard.");
    console.log(sep);
  }
}

async function runSingleStep(
  rl: ReturnType<typeof createInterface>,
  state: WizardState,
  step: number,
): Promise<WizardState> {
  const a = { ...state };

  showSectionIfFirst(step);

  if (step === 0) {
    if (COPY.steps.cssMethodology.hint) console.log(`  💡 ${COPY.steps.cssMethodology.hint}\n`);
    a.cssMethodology = (await askChoice(
      rl,
      COPY.steps.cssMethodology.question,
      COPY.steps.cssMethodology.options,
      0,
      a.cssMethodology,
    )) as CssMethodology;
    return a;
  }

  if (step === 1) {
    a.framework = (await askChoice(
      rl,
      COPY.steps.framework.question,
      COPY.steps.framework.options,
      0,
      a.framework,
    )) as Framework;
    return a;
  }

  if (step === 2) {
    if (COPY.steps.dsStatus.hint) console.log(`  💡 ${COPY.steps.dsStatus.hint}\n`);
    a.dsStatus = (await askChoice(
      rl,
      COPY.steps.dsStatus.question,
      COPY.steps.dsStatus.options,
      0,
      a.dsStatus,
    )) as DsStatus;
    return a;
  }

  if (step === 3) {
    if (COPY.steps.scanDir.hint) console.log(`  💡 ${COPY.steps.scanDir.hint}\n`);
    a.scanDir = await askText(
      rl,
      COPY.steps.scanDir.question,
      a.scanDir ?? COPY.steps.scanDir.default,
    );
    a.scanDirs = [a.scanDir]; // Single dir by default
    return a;
  }

  if (step === 4) {
    if (COPY.steps.extensions.hint) console.log(`  💡 ${COPY.steps.extensions.hint}\n`);
    const defaultExtensions = getDefaultExtensions(a.framework ?? "react");
    const defaultStr = (a.extensions?.length ? a.extensions.join(", ") : defaultExtensions.join(", ")) as string;
    const extensionsStr = await askText(rl, COPY.steps.extensions.question, defaultStr);
    a.extensions = extensionsStr.split(",").map((s) => s.trim()).filter(Boolean);
    return a;
  }

  if (step === 5) {
    if (COPY.steps.componentDir.hint) console.log(`  💡 ${COPY.steps.componentDir.hint}\n`);
    a.componentDir = await askText(
      rl,
      COPY.steps.componentDir.question,
      a.componentDir ?? COPY.steps.componentDir.default,
    );
    return a;
  }

  if (step === 6) {
    if (COPY.steps.componentArchitecture.hint) console.log(`  💡 ${COPY.steps.componentArchitecture.hint}\n`);
    a.componentArchitecture = (await askChoice(
      rl,
      COPY.steps.componentArchitecture.question,
      getComponentArchitectureOptions(a.cssMethodology ?? "tailwind"),
      0,
      a.componentArchitecture,
    )) as ComponentArchitecture;
    return a;
  }

  if (step === 7) {
    if (COPY.steps.tokenCategories.hint) console.log(`  💡 ${COPY.steps.tokenCategories.hint}\n`);
    a.tokenCategories = await askMultiChoice(
      rl,
      COPY.steps.tokenCategories.question,
      getTokenCategoryOptions(a.cssMethodology ?? "tailwind"),
      a.tokenCategories,
    );
    return a;
  }

  if (step === 8) {
    if (COPY.steps.migrationPlan.hint) console.log(`  💡 ${COPY.steps.migrationPlan.hint}\n`);
    const wantsMigration = await askChoice(
      rl,
      COPY.steps.migrationPlan.question,
      COPY.steps.migrationPlan.options,
      0,
      a.migrationTargetDS ? "yes" : "no",
    );
    if (wantsMigration === "yes") {
      if (COPY.steps.migrationTarget.hint) console.log(`  💡 ${COPY.steps.migrationTarget.hint}\n`);
      const targetChoice = await askChoice(
        rl,
        COPY.steps.migrationTarget.question,
        COPY.steps.migrationTarget.options,
        0,
        a.migrationTargetDS && COPY.steps.migrationTarget.options.some((o) => o.key === a.migrationTargetDS)
          ? a.migrationTargetDS
          : undefined,
      );
      if (targetChoice === "Other") {
        const custom = await askText(
          rl,
          COPY.steps.migrationTarget.otherPrompt,
          a.migrationTargetDS ?? COPY.steps.migrationTarget.default,
        );
        a.migrationTargetDS = custom;
      } else {
        a.migrationTargetDS = targetChoice;
      }
    } else {
      a.migrationTargetDS = "";
    }
    return a;
  }

  if (step === 9) {
    if (COPY.steps.apiRedesignPlanned.hint) console.log(`  💡 ${COPY.steps.apiRedesignPlanned.hint}\n`);
    a.apiRedesignPlanned = (await askChoice(
      rl,
      COPY.steps.apiRedesignPlanned.question,
      COPY.steps.apiRedesignPlanned.options,
      1,
      a.apiRedesignPlanned,
    )) as "yes" | "no";
    return a;
  }

  return a;
}

function showSummary(a: WizardState): void {
  const sep = "  ─────────────────────────────────────────────────────";
  console.log("");
  console.log(sep);
  console.log(`  ${COPY.summary.title}`);
  console.log(sep);
  console.log("");
  console.log(`  ${COPY.summary.intro}`);
  console.log("");
  console.log(`    • ${COPY.summary.labels.css}:           ${PRESETS_INFO[a.cssMethodology!]?.label ?? a.cssMethodology}`);
  console.log(`    • ${COPY.summary.labels.framework}:     ${getFrameworkLabel(a.framework!)}`);
  console.log(`    • ${COPY.summary.labels.dsStatus}:     ${a.dsStatus === "existing" ? "Existing" : "New (from scratch)"}`);
  console.log(`    • ${COPY.summary.labels.scanDir}:       ${a.scanDir}/`);
  console.log(`    • ${COPY.summary.labels.extensions}:    ${a.extensions?.join(", ") ?? ""}`);
  console.log(`    • ${COPY.summary.labels.componentDir}: ${a.componentDir}/`);
  console.log(`    • ${COPY.summary.labels.componentArchitecture}: ${a.componentArchitecture ?? ""}`);
  console.log(`    • ${COPY.summary.labels.tokenCategories}: ${a.tokenCategories?.join(", ") ?? ""}`);
  if (a.migrationTargetDS) console.log(`    • ${COPY.summary.labels.migration}: ${a.migrationTargetDS}`);
  console.log(`    • ${COPY.summary.labels.apiRedesignPlanned}: ${a.apiRedesignPlanned === "yes" ? "Yes (show tab)" : "No (hide tab)"}`);
  console.log("");
}

export async function runWizard(): Promise<WizardAnswers> {
  const rl = createReadline();

  try {
    console.log("");
    const boxWidth = 52;
    const titleWithIcon = `   📐  ${COPY.intro.title}`;
    const paddedTitle = titleWithIcon.padEnd(boxWidth).slice(0, boxWidth);
    console.log("  ╭────────────────────────────────────────────────────╮");
    console.log("  │                                                    │");
    console.log(`  │${paddedTitle}│`);
    console.log("  │                                                    │");
    console.log("  ╰────────────────────────────────────────────────────╯");
    console.log("");
    console.log(`  ${COPY.intro.line1}`);
    console.log(`  ${COPY.intro.line2}`);
    console.log(`  ${COPY.intro.line3}`);
    console.log("");
    console.log(`  ${COPY.intro.line4}`);
    console.log("");

    let state: WizardState = {};
    let step = 0;

    while (step <= 9) {
      state = await runSingleStep(rl, state, step);
      if (step < 9) {
        const nav = await ask(rl, COPY.navigation.nextOrBack);
        if (nav.toLowerCase() === "b" && step > 0) {
          step--;
          continue;
        }
      }
      step++;
    }

    showSummary(state);

    for (;;) {
      const confirm = await ask(rl, COPY.summary.confirm);
      if (confirm.toLowerCase() !== "n" && confirm.toLowerCase() !== "no") {
        return state as WizardAnswers;
      }

      console.log("");
      console.log(`  ${COPY.summary.whichStepEdit}`);
      console.log("");
      for (let i = 0; i < WIZARD_STEP_LABELS.length; i++) {
        console.log(`    [${i + 1}]  ${WIZARD_STEP_LABELS[i]}`);
      }
      console.log("");

      const editInput = await ask(rl, COPY.summary.stepEditPrompt(WIZARD_STEP_LABELS.length));
      const editNum = editInput ? parseInt(editInput.trim(), 10) : 0;
      if (editNum < 1 || editNum > WIZARD_STEP_LABELS.length) {
        console.log(COPY.summary.cancelled);
        process.exit(0);
      }

      step = editNum - 1;
      while (step <= 9) {
        state = await runSingleStep(rl, state, step);
        if (step < 9) {
          const nav = await ask(rl, COPY.navigation.nextOrBack);
          if (nav.toLowerCase() === "b" && step > 0) {
            step--;
            continue;
          }
        }
        step++;
      }
      showSummary(state);
    }

  } finally {
    rl.close();
  }
}

// ============================================
// CONFIG BUILDER
// ============================================

export function buildConfigFromAnswers(answers: WizardAnswers): Partial<DsCoverageConfig> {
  const preset = getPreset(answers.cssMethodology as PresetId);

  // Filter violation categories based on user selection
  const violations: Record<string, DsCoverageConfig["violations"][string]> = {};
  for (const [key, catConfig] of Object.entries(preset.violations || {})) {
    if (answers.tokenCategories.includes(key)) {
      violations[key] = { ...catConfig, enabled: true };
    }
  }

  // Determine file extensions for component analysis
  const componentExtFilter = answers.extensions.filter((e) =>
    [".tsx", ".jsx", ".vue", ".svelte", ".ts", ".js"].includes(e),
  );

  // Build component analysis config
  const requireCVA = answers.componentArchitecture === "cva";
  const componentAnalysis: DsCoverageConfig["componentAnalysis"] = {
    enabled: true,
    showApiRedesignTab: answers.apiRedesignPlanned === "yes",
    directories: [`${answers.componentDir}/`],
    primaryDirectory: `${answers.componentDir}/`,
    legacyDirectories: [],
    api: {
      requireCVA,
      requireRadix: false,
      expectedProps: preset.componentAnalysis?.api?.expectedProps || ["variant", "size"],
      forbiddenProps: [],
      expectedSizes: preset.componentAnalysis?.api?.expectedSizes || ["small", "medium", "large"],
      forbiddenSizes: [],
      legacyVariantValues: [],
    },
    scoring: {
      usesCVA: requireCVA ? 25 : 0,
      correctNaming: 25,
      correctSizes: 15,
      hasClassName: answers.framework === "react" ? 15 : 0,
      usesCompoundVariants: requireCVA ? 15 : 0,
      hasAsChild: 0,
      usesRadix: 0,
    },
  };

  // Normalize scoring to sum to ~100
  const totalWeight = Object.values(componentAnalysis.scoring).reduce((a, b) => a + b, 0);
  if (totalWeight > 0 && totalWeight !== 100) {
    const factor = 100 / totalWeight;
    for (const key of Object.keys(componentAnalysis.scoring) as Array<keyof typeof componentAnalysis.scoring>) {
      componentAnalysis.scoring[key] = Math.round(componentAnalysis.scoring[key] * factor);
    }
  }

  // Build migration config
  const migration = answers.migrationTargetDS
    ? {
        enabled: true,
        targetDS: answers.migrationTargetDS,
        mappings: [] as DsCoverageConfig["migration"]["mappings"],
      }
    : {
        enabled: false,
        targetDS: "",
        mappings: [] as DsCoverageConfig["migration"]["mappings"],
      };

  const scanDirs = answers.scanDirs ?? [answers.scanDir];
  return {
    scanDir: answers.scanDir, // Keep for backward compatibility
    scanDirs: scanDirs.length > 1 ? scanDirs : undefined, // Only set if multiple
    extensions: answers.extensions,
    exclude: getDefaultExclusions(answers.framework),
    violations,
    componentAnalysis,
    migration,
    dashboard: {
      title: "Design System Coverage",
      subtitle: answers.dsStatus === "from-scratch"
        ? "Building a design system from scratch"
        : "",
    },
  };
}

// ============================================
// HELPERS
// ============================================

function getDefaultExtensions(framework: Framework): string[] {
  switch (framework) {
    case "react":
      return [".tsx", ".jsx", ".css", ".scss"];
    case "vue":
      return [".vue", ".ts", ".js", ".css", ".scss"];
    case "svelte":
      return [".svelte", ".ts", ".js", ".css", ".scss"];
    case "vanilla":
      return [".ts", ".js", ".html", ".css", ".scss"];
    default:
      return [".ts", ".js", ".tsx", ".jsx", ".css", ".scss"];
  }
}

function getDefaultExclusions(framework: Framework): string[] {
  const base = [
    "node_modules/",
    "dist/",
    "build/",
    ".test.",
    ".spec.",
    "test/",
    "__tests__/",
  ];

  switch (framework) {
    case "react":
      return [...base, "stories/", ".storybook/"];
    case "vue":
      return [...base, "stories/", ".storybook/"];
    default:
      return base;
  }
}

function getComponentArchitectureOptions(
  css: CssMethodology,
): { key: string; label: string }[] {
  const c = COPY.steps.componentArchitecture;
  const options: { key: string; label: string }[] = [];

  if (css === "tailwind" || css === "utility-custom") {
    options.push({ key: "cva", label: c.optionsCva });
  }
  if (css === "css-in-js") {
    options.push({ key: "styled-components", label: c.optionsStyled });
  }
  if (css === "css-modules") {
    options.push({ key: "css-modules", label: c.optionsCssModules });
  }
  options.push({ key: "vanilla", label: c.optionsVanilla });
  options.push({ key: "other", label: c.optionsOther });

  return options;
}

function getTokenCategoryOptions(
  css: CssMethodology,
): { key: string; label: string; defaultOn: boolean }[] {
  const labels = COPY.steps.tokenCategories.optionLabels;
  const defaultOn: Record<string, boolean> = {
    colors: true,
    typography: true,
    spacing: css === "tailwind",
    radius: true,
    shadows: true,
    darkMode: css === "tailwind",
  };
  return labels.map((o) => ({ ...o, defaultOn: defaultOn[o.key] ?? false }));
}

function getFrameworkLabel(framework: Framework): string {
  const labels: Record<Framework, string> = {
    react: "React",
    vue: "Vue",
    svelte: "Svelte",
    vanilla: "Vanilla JS/TS",
    other: "Other",
  };
  return labels[framework];
}

// ============================================
// CONFIG FILE SERIALIZER
// ============================================

export function serializeConfig(config: Partial<DsCoverageConfig>): string {
  return `/**
 * design-system-refactor-radar.config.mjs
 *
 * Auto-generated by \`npx design-system-refactor-radar init\`.
 * Customize the patterns, categories, and rules to match your design system.
 *
 * @type {import('design-system-refactor-radar/config').DsCoverageConfig}
 */
export default ${JSON.stringify(config, null, 2)};
`;
}
