/**
 * DS Coverage — Migration Analyzer
 *
 * Scans the codebase for components that need to be migrated
 * from one library/DS to another. Detects imports and JSX usage,
 * then builds a report organized by migration complexity.
 *
 * Fully agnostic — works with any component library.
 */

import { relative } from "node:path";
import type { DsCoverageConfig } from "./config.js";
import type {
  MigrationReport,
  MigrationComponentReport,
  MigrationFileUsage,
  MigrationComplexity,
} from "./types.js";

// ============================================
// DETECTION
// ============================================

interface DetectedUsage {
  importLines: number[];
  usageLines: number[];
}

/**
 * Detect imports and JSX usage of a component in a file.
 * Looks for:
 * 1. Import statements matching the source pattern
 * 2. JSX/template usage: <ComponentName ... /> or <ComponentName>
 */
/**
 * Special import pattern that indicates native HTML elements.
 * When used, skip import detection and just count JSX usage.
 */
const HTML_NATIVE_PATTERN = "html-native";

function detectComponentUsage(
  content: string,
  componentName: string,
  importPattern: string,
): DetectedUsage {
  const lines = content.split("\n");
  const importLines: number[] = [];
  const usageLines: number[] = [];

  const isNativeHtml = importPattern === HTML_NATIVE_PATTERN;

  // For native HTML elements, skip import detection entirely
  if (!isNativeHtml) {
    // Build import regex from pattern
    // The importPattern can be a module path like "@company/ui" or a regex string
    var importRegex = new RegExp(
      `(?:import|from)\\s+.*['"]\\.?/?${escapeRegex(importPattern)}['"]` +
      `|` +
      `(?:import|from)\\s+.*['"]${escapeRegex(importPattern)}['"]` +
      `|` +
      `require\\s*\\(\\s*['"]${escapeRegex(importPattern)}['"]`,
      "i",
    );

    // Also detect named imports of the component specifically
    var namedImportRegex = new RegExp(
      `\\b${escapeRegex(componentName)}\\b.*from\\s+['"]` +
      `|` +
      `import\\s+${escapeRegex(componentName)}\\b` +
      `|` +
      `import\\s*\\{[^}]*\\b${escapeRegex(componentName)}\\b[^}]*\\}`,
    );
  }

  // JSX usage: <ComponentName or </ComponentName
  const jsxRegex = new RegExp(`</?${escapeRegex(componentName)}[\\s/>]`, "g");

  // Vue/Svelte template usage: <component-name or <ComponentName
  const kebabName = toKebabCase(componentName);
  const templateRegex = kebabName !== componentName.toLowerCase()
    ? new RegExp(`</?${escapeRegex(kebabName)}[\\s/>]`, "g")
    : null;

  let hasImport = isNativeHtml; // Native HTML is always "imported" (global)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip comments
    if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
      continue;
    }

    // Check for imports (skip for native HTML)
    if (!isNativeHtml && importRegex! && namedImportRegex!) {
      if (importRegex.test(line) || namedImportRegex.test(line)) {
        importLines.push(i + 1);
        hasImport = true;
        continue;
      }
    }

    // Check for JSX/template usage
    jsxRegex.lastIndex = 0;
    if (jsxRegex.test(line)) {
      usageLines.push(i + 1);
    }

    // Check kebab-case usage (Vue/Svelte)
    if (templateRegex) {
      templateRegex.lastIndex = 0;
      if (templateRegex.test(line)) {
        usageLines.push(i + 1);
      }
    }
  }

  // If no import was found, only count usages if the component name is very specific
  // (to avoid false positives from common words like "Button")
  if (!hasImport && usageLines.length > 0) {
    // Still return usages — the component might be imported via barrel exports or global registration
    // But only if it looks like a real JSX component (starts with uppercase)
    if (componentName[0] !== componentName[0].toUpperCase()) {
      return { importLines: [], usageLines: [] };
    }
  }

  return { importLines, usageLines };
}

// ============================================
// ANALYSIS
// ============================================

export function analyzeMigration(
  fileContents: Map<string, string>,
  scanDir: string,
  config: DsCoverageConfig,
): MigrationReport | null {
  if (!config.migration.enabled || config.migration.mappings.length === 0) {
    return null;
  }

  const components: MigrationComponentReport[] = [];

  for (const mapping of config.migration.mappings) {
    const files: MigrationFileUsage[] = [];
    let totalUsages = 0;

    for (const [filePath, content] of fileContents) {
      const relativePath = relative(scanDir, filePath);

      const usage = detectComponentUsage(
        content,
        mapping.source,
        mapping.sourceImportPattern,
      );

      const totalOccurrences = usage.importLines.length + usage.usageLines.length;
      if (totalOccurrences === 0) continue;

      files.push({
        path: relativePath,
        importLines: usage.importLines,
        usageLines: usage.usageLines,
        totalOccurrences,
      });

      totalUsages += totalOccurrences;
    }

    // Sort files by total occurrences descending
    files.sort((a, b) => b.totalOccurrences - a.totalOccurrences);

    components.push({
      source: mapping.source,
      target: mapping.target,
      targetImportPath: mapping.targetImportPath,
      complexity: mapping.complexity,
      guidelines: mapping.guidelines,
      propMapping: mapping.propMapping,
      breakingChanges: mapping.breakingChanges || [],
      effort: mapping.effort,
      totalUsages,
      filesAffected: files.length,
      files,
    });
  }

  // Sort: within each complexity group, by total usages descending
  const complexityOrder: MigrationComplexity[] = ["simple", "moderate", "complex"];
  components.sort((a, b) => {
    const ca = complexityOrder.indexOf(a.complexity);
    const cb = complexityOrder.indexOf(b.complexity);
    if (ca !== cb) return ca - cb;
    return b.totalUsages - a.totalUsages;
  });

  // Build summary
  const byComplexity: MigrationReport["summary"]["byComplexity"] = {
    simple: { count: 0, usages: 0, files: 0 },
    moderate: { count: 0, usages: 0, files: 0 },
    complex: { count: 0, usages: 0, files: 0 },
  };

  const allAffectedFiles = new Set<string>();

  for (const comp of components) {
    byComplexity[comp.complexity].count++;
    byComplexity[comp.complexity].usages += comp.totalUsages;
    const filesInGroup = new Set(comp.files.map((f) => f.path));
    byComplexity[comp.complexity].files += filesInGroup.size;
    for (const f of comp.files) allAffectedFiles.add(f.path);
  }

  return {
    targetDS: config.migration.targetDS,
    summary: {
      totalMappings: components.length,
      totalUsages: components.reduce((s, c) => s + c.totalUsages, 0),
      totalFilesAffected: allAffectedFiles.size,
      byComplexity,
    },
    components,
  };
}

// ============================================
// HELPERS
// ============================================

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}
