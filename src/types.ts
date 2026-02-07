/**
 * DS Coverage — Shared Types
 *
 * All types used across the scanner, analyzer, and dashboard.
 */

// ============================================
// VIOLATION TYPES
// ============================================

export interface Violation {
  line: number;
  column: number;
  match: string;
  /** Trimmed line content (max 120 chars) */
  context: string;
}

export interface FileReport {
  /** Relative path from scanDir */
  path: string;
  violations: Record<string, Violation[]>;
  flags: {
    migrateSimple: Violation[];
    migrateComplex: Violation[];
    todo: Violation[];
  };
  totalViolations: number;
  totalFlags: number;
}

// ============================================
// SUMMARY TYPES
// ============================================

export interface CategorySummary {
  totalFiles: number;
  totalViolations: number;
  topFiles: { path: string; count: number }[];
}

export interface DirectorySummary {
  path: string;
  totalFiles: number;
  filesWithViolations: number;
  totalViolations: number;
  coveragePercent: number;
  categories: Record<string, number>;
}

// ============================================
// ROADMAP TYPES
// ============================================

export interface RoadmapPhase {
  id: string;
  title: string;
  description: string;
  businessCase: string;
  filesCount: number;
  violationsCount: number;
  files: { path: string; count: number }[];
}

export interface Roadmap {
  phases: RoadmapPhase[];
  directories: DirectorySummary[];
  quickWins: { path: string; violations: number }[];
}

// ============================================
// COMPONENT API TYPES
// ============================================

export interface ComponentApiReport {
  path: string;
  name: string;
  location: string;
  usesCVA: boolean;
  usesRadix: boolean;
  hasClassName: boolean;
  hasAsChild: boolean;
  usesCompoundVariants: boolean;
  variantProps: string[];
  sizeValues: string[];
  variantValues: string[];
  issues: ComponentApiIssue[];
  complianceScore: number;
  tokenCoverage: TokenCoverage;
}

export interface ComponentApiIssue {
  type: string;
  severity: "error" | "warning";
  message: string;
}

export interface TokenCoverage {
  score: number;
  totalLines: number;
  violationLines: number;
  violations: Record<string, number>;
  totalViolations: number;
}

export interface ComponentApiSummary {
  totalComponents: number;
  byLocation: Record<string, number>;
  usesCVA: number;
  usesRadix: number;
  hasClassName: number;
  hasAsChild: number;
  usesCompoundVariants: number;
  correctApiNaming: number;
  correctSizeValues: number;
  avgComplianceScore: number;
  compliantCount: number;
  avgTokenScore: number;
  tokenCompliantCount: number;
}

// ============================================
// MIGRATION TYPES
// ============================================

export type MigrationComplexity = "simple" | "moderate" | "complex";

export interface MigrationMapping {
  /** Source component name (what's currently used) */
  source: string;
  /** Import path or pattern used to detect source usage */
  sourceImportPattern: string;
  /** Target component name (what to migrate to) */
  target: string;
  /** Target import path */
  targetImportPath: string;
  /** Migration difficulty */
  complexity: MigrationComplexity;
  /** Migration guidelines — step-by-step instructions */
  guidelines: string;
  /** Prop mapping notes (e.g. "variant → appearance, intent → hierarchy") */
  propMapping?: string;
  /** Breaking changes to watch for */
  breakingChanges?: string[];
  /** Estimated effort (e.g. "~30min", "~2h") */
  effort?: string;
}

export interface MigrationComponentReport {
  /** Source component name */
  source: string;
  /** Target component name */
  target: string;
  /** Target import path */
  targetImportPath: string;
  /** Complexity level */
  complexity: MigrationComplexity;
  /** Guidelines text */
  guidelines: string;
  /** Prop mapping notes */
  propMapping?: string;
  /** Breaking changes */
  breakingChanges: string[];
  /** Estimated effort */
  effort?: string;
  /** Number of total usages found (imports + JSX usage) */
  totalUsages: number;
  /** Number of files affected */
  filesAffected: number;
  /** Files with usage details */
  files: MigrationFileUsage[];
  /** True when no source usages remain (migration complete for this component) */
  migrated: boolean;
}

export interface MigrationFileUsage {
  path: string;
  /** Lines where import is found */
  importLines: number[];
  /** Lines where component is used (JSX/template) */
  usageLines: number[];
  /** Total occurrences in this file */
  totalOccurrences: number;
}

/** Per-element counts for legacy (native HTML) tracking */
export interface LegacyHtmlElementCount {
  usages: number;
  files: number;
}

/** Per-file breakdown of legacy HTML elements */
export interface LegacyHtmlFileDetail {
  path: string;
  byElement: Record<string, number>;
  total: number;
}

/** Summary of hardcoded HTML elements (e.g. <input>, <textarea>) to migrate to DS components */
export interface LegacyHtmlReport {
  /** Total number of legacy HTML element usages across all mapped tags */
  totalElements: number;
  /** Number of files containing at least one legacy element */
  totalFiles: number;
  /** Counts per element (tag name), only for mappings with sourceImportPattern "html-native" */
  byElement: Record<string, LegacyHtmlElementCount>;
  /** Per-file breakdown (path → element counts), sorted by total descending */
  fileDetails: LegacyHtmlFileDetail[];
}

export interface MigrationReport {
  /** Target design system name */
  targetDS: string;
  /** Legacy HTML elements (hardcoded tags) to migrate; present when mappings include html-native */
  legacyHtml: LegacyHtmlReport | null;
  /** Summary stats */
  summary: {
    /** Total mapping definitions (all components in config) */
    totalMappings: number;
    /** Components that still have source usages (to migrate) */
    totalToMigrate: number;
    /** Components with 0 source usages (migration complete) */
    totalMigrated: number;
    totalUsages: number;
    totalFilesAffected: number;
    /** Counts and usages only for components with usages > 0 (to migrate) */
    byComplexity: Record<MigrationComplexity, {
      count: number;
      usages: number;
      files: number;
    }>;
  };
  /** Component-level migration details */
  components: MigrationComponentReport[];
}

// ============================================
// REPORT TYPE
// ============================================

export interface Report {
  generatedAt: string;
  scanDir: string;
  summary: {
    totalFiles: number;
    totalFilesScanned: number;
    totalFilesWithViolations: number;
    totalViolations: number;
    totalFlags: number;
    coveragePercent: number;
    categories: Record<string, CategorySummary>;
    flags: {
      migrateSimple: number;
      migrateComplex: number;
      todo: number;
    };
  };
  roadmap: Roadmap;
  componentApi: {
    summary: ComponentApiSummary;
    components: ComponentApiReport[];
  };
  migration: MigrationReport | null;
  files: FileReport[];
}
