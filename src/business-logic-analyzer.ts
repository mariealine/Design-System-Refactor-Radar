/**
 * DS Coverage — Business Logic Analyzer
 *
 * Detects business logic entanglement and native HTML elements
 * to help categorize refactoring risk (Safe/Careful/Page-level).
 */

import { relative } from "node:path";
import type { DsCoverageConfig, BusinessLogicAnalysisConfig } from "./config.js";
import type { BusinessLogicReport, FileReport } from "./types.js";

type NativeHtmlCounts = BusinessLogicReport["nativeHtmlElements"];

// ============================================
// NATIVE HTML ELEMENT DETECTION
// ============================================

function detectNativeHtmlElements(
  content: string,
  elements: string[],
): NativeHtmlCounts {
  const counts: Record<string, number> = {};
  for (const element of elements) {
    // Match JSX/TSX: <element, <element>, </element>, <element/>, <element />
    // Also match in template strings and comments (but less strict)
    const pattern = new RegExp(`<${element}(?:[\\s/>]|$)`, "g");
    const matches = content.match(pattern);
    counts[element] = matches ? matches.length : 0;
  }
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  return { ...counts, total } as NativeHtmlCounts;
}

// ============================================
// BUSINESS LOGIC SIGNAL DETECTION
// ============================================

function detectBusinessLogicSignals(content: string): {
  apiCalls: number;
  useStateCount: number;
  useEffectCount: number;
  fileUploads: boolean;
  authFlows: boolean;
  formHandling: boolean;
} {
  // API calls
  const apiPatterns = [
    /\bfetch\s*\(/g,
    /\bsupabase\./g,
    /\baxios\./g,
    /\bapi\./g,
    /\.get\(|\.post\(|\.put\(|\.delete\(/g,
  ];
  let apiCalls = 0;
  for (const pattern of apiPatterns) {
    const matches = content.match(pattern);
    if (matches) apiCalls += matches.length;
  }

  // React hooks
  const useStateMatches = content.match(/\buseState\s*\(/g);
  const useStateCount = useStateMatches ? useStateMatches.length : 0;

  const useEffectMatches = content.match(/\buseEffect\s*\(/g);
  const useEffectCount = useEffectMatches ? useEffectMatches.length : 0;

  // File uploads
  const fileUploadPatterns = [
    /\bFileReader\b/g,
    /\bFormData\b/g,
    /type=["']file["']/g,
    /\.upload\s*\(/g,
    /input\s+type=["']file["']/g,
  ];
  const fileUploads = fileUploadPatterns.some((pattern) => pattern.test(content));

  // Auth flows
  const authPatterns = [
    /\bsignIn\s*\(/g,
    /\bsignUp\s*\(/g,
    /\bsignOut\s*\(/g,
    /\bgetUser\s*\(/g,
    /\bgetSession\s*\(/g,
    /\bauth\./g,
  ];
  const authFlows = authPatterns.some((pattern) => pattern.test(content));

  // Form handling
  const formPatterns = [
    /\bonSubmit\s*=/g,
    /\bhandleSubmit\s*\(/g,
    /\bvalidate\s*\(/g,
    /<form/g,
  ];
  const formHandling = formPatterns.some((pattern) => pattern.test(content));

  return {
    apiCalls,
    useStateCount,
    useEffectCount,
    fileUploads,
    authFlows,
    formHandling,
  };
}

// ============================================
// RISK ASSESSMENT
// ============================================

function assessRisk(
  signals: ReturnType<typeof detectBusinessLogicSignals>,
  nativeHtmlCount: number,
  fileLines: number,
  thresholds: BusinessLogicAnalysisConfig["riskThresholds"],
): {
  riskLevel: "safe" | "careful" | "page-level";
  score: number;
  signals: string[];
} {
  const detectedSignals: string[] = [];
  let score = 0;

  // Count risk factors
  if (signals.apiCalls > 0) {
    detectedSignals.push(`${signals.apiCalls} API call${signals.apiCalls > 1 ? "s" : ""}`);
    score += signals.apiCalls * 15; // 15 points per API call
  }
  if (signals.useStateCount > 0) {
    detectedSignals.push(`${signals.useStateCount} useState hook${signals.useStateCount > 1 ? "s" : ""}`);
    score += signals.useStateCount * 5; // 5 points per useState
  }
  if (signals.useEffectCount > 0) {
    detectedSignals.push(`${signals.useEffectCount} useEffect hook${signals.useEffectCount > 1 ? "s" : ""}`);
    score += signals.useEffectCount * 10; // 10 points per useEffect
  }
  if (signals.fileUploads) {
    detectedSignals.push("File uploads");
    score += 25;
  }
  if (signals.authFlows) {
    detectedSignals.push("Auth flows");
    score += 30;
  }
  if (signals.formHandling) {
    detectedSignals.push("Form handling");
    score += 10;
  }
  if (nativeHtmlCount > 0) {
    detectedSignals.push(`${nativeHtmlCount} native HTML element${nativeHtmlCount > 1 ? "s" : ""}`);
    score += nativeHtmlCount * 2; // 2 points per native element
  }
  if (fileLines > 300) {
    detectedSignals.push(`Large file (${fileLines} lines)`);
    score += 10;
  }

  // Determine risk level
  let riskLevel: "safe" | "careful" | "page-level" = "safe";

  if (
    signals.apiCalls > thresholds.careful.maxApiCalls ||
    signals.useStateCount > thresholds.careful.maxStateHooks ||
    signals.useEffectCount > thresholds.careful.maxEffects ||
    signals.fileUploads ||
    signals.authFlows ||
    score >= 50
  ) {
    riskLevel = "page-level";
  } else if (
    signals.apiCalls > thresholds.safe.maxApiCalls ||
    signals.useStateCount > thresholds.safe.maxStateHooks ||
    signals.useEffectCount > thresholds.safe.maxEffects ||
    nativeHtmlCount > 0 ||
    score >= 20
  ) {
    riskLevel = "careful";
  }

  return {
    riskLevel,
    score: Math.min(100, score),
    signals: detectedSignals,
  };
}

// ============================================
// FILE ANALYSIS
// ============================================

function analyzeFile(
  content: string,
  relativePath: string,
  config: BusinessLogicAnalysisConfig,
): BusinessLogicReport | null {
  // Check if file should be excluded
  const shouldExclude = config.excludeDirectories.some((dir) =>
    relativePath.startsWith(dir),
  );
  if (shouldExclude) return null;

  // Detect native HTML elements
  const nativeHtmlElements = config.nativeHtmlElements.enabled
    ? detectNativeHtmlElements(content, config.nativeHtmlElements.elements)
    : { total: 0 };

  // Detect business logic signals
  const businessLogicSignals = detectBusinessLogicSignals(content);

  // Calculate file size
  const fileLines = content.split("\n").length;

  // Assess risk
  const complexity = assessRisk(
    businessLogicSignals,
    nativeHtmlElements.total,
    fileLines,
    config.riskThresholds,
  );

  // Generate suggested refactor actions
  const suggestedActions: string[] = [];
  if (complexity.riskLevel === "safe") {
    suggestedActions.push("Direct UI swap — replace native elements with design system components");
  } else if (complexity.riskLevel === "careful") {
    suggestedActions.push("Extract business logic to custom hook/service first");
    suggestedActions.push("Then replace UI elements incrementally");
    suggestedActions.push("Test thoroughly after each step");
  } else {
    suggestedActions.push("Extract business logic to hooks (one hook per feature)");
    suggestedActions.push("Replace form elements incrementally (one section at a time)");
    suggestedActions.push("Test after each section");
    suggestedActions.push("Consider splitting into sub-components");
    suggestedActions.push("Propose plan first, never auto-apply");
  }

  const rationale =
    complexity.riskLevel === "safe"
      ? "Pure presentational component with minimal logic"
      : complexity.riskLevel === "careful"
        ? "Contains API calls or state management that needs careful extraction"
        : "Complex flows with multiple APIs, critical business logic, or high complexity";

  return {
    path: relativePath,
    nativeHtmlElements,
    businessLogicSignals,
    complexity,
    suggestedRefactor: {
      category: complexity.riskLevel,
      rationale,
      suggestedActions,
    },
  };
}

// ============================================
// PUBLIC API
// ============================================

export function analyzeBusinessLogic(
  fileReports: FileReport[],
  fileContents: Map<string, string>,
  scanDir: string,
  config: DsCoverageConfig,
): Record<string, BusinessLogicReport> {
  if (!config.businessLogicAnalysis.enabled) {
    return {};
  }

  const reports: Record<string, BusinessLogicReport> = {};

  for (const [filePath, content] of fileContents) {
    const relativePath = relative(scanDir, filePath);
    const report = analyzeFile(content, relativePath, config.businessLogicAnalysis);
    if (report) {
      reports[relativePath] = report;
    }
  }

  return reports;
}
