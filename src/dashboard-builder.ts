/**
 * DS Coverage — Dashboard Builder
 *
 * Generates a self-contained HTML dashboard from the report data.
 * The dashboard reads violation categories from the embedded config,
 * making it fully agnostic to any specific design system.
 */

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { DsCoverageConfig } from "./config.js";
import type { Report } from "./types.js";

// Works in both ESM (import.meta.url) and CJS (tsup injects shims)
const _currentDir = dirname(fileURLToPath(import.meta.url));

export async function buildDashboard(
  report: Report,
  config: DsCoverageConfig,
): Promise<string> {
  // Read the HTML template
  const templatePath = resolve(_currentDir, "../templates/dashboard.html");
  const template = await readFile(templatePath, "utf-8");

  // Build category metadata from config
  const categoryMeta: Record<string, { label: string; icon: string; color: string }> = {};
  for (const [key, cat] of Object.entries(config.violations)) {
    if (cat.enabled) {
      categoryMeta[key] = { label: cat.label, icon: cat.icon, color: cat.color };
    }
  }

  // Build component location labels from config
  const locationLabels: Record<string, string> = {};
  if (config.componentAnalysis.enabled) {
    locationLabels.primary = config.componentAnalysis.primaryDirectory.replace(/\/$/, "").split("/").pop() || "primary";
    for (const dir of config.componentAnalysis.legacyDirectories) {
      const label = dir.replace(/\/$/, "").split("/").pop() || "legacy";
      locationLabels[label] = label;
    }
  }

  // Embed data and config into the HTML
  const inlineData = `
<script>
window.__DS_REPORT__ = ${JSON.stringify(report)};
window.__DS_CONFIG__ = {
  title: ${JSON.stringify(config.dashboard.title)},
  subtitle: ${JSON.stringify(config.dashboard.subtitle || `${config.scanDir}/ — ${report.summary.totalFilesScanned} files scanned`)},
  categories: ${JSON.stringify(categoryMeta)},
  locationLabels: ${JSON.stringify(locationLabels)},
  componentAnalysisEnabled: ${config.componentAnalysis.enabled},
  roadmapEnabled: ${config.roadmap.enabled},
  migrationEnabled: ${config.migration.enabled && config.migration.mappings.length > 0},
  businessLogicAnalysisEnabled: ${config.businessLogicAnalysis.enabled},
  purityEnabled: ${config.purity.enabled},
  expectedProps: ${JSON.stringify(config.componentAnalysis.api.expectedProps)},
  expectedSizes: ${JSON.stringify(config.componentAnalysis.api.expectedSizes)},
  forbiddenProps: ${JSON.stringify(config.componentAnalysis.api.forbiddenProps)},
  forbiddenSizes: ${JSON.stringify(config.componentAnalysis.api.forbiddenSizes)},
};
</script>`;

  return template.replace("<!-- __DS_INLINE_DATA__ -->", inlineData);
}
