/**
 * DS Coverage — Import Boundary Analyzer
 *
 * AST-based analysis to detect UI components entangled with business logic
 * through import boundary violations.
 */

import * as ts from "typescript";
import { readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname, relative, extname } from "node:path";
import type { DsCoverageConfig, PurityConfig } from "./config.js";
import type { ImportBoundaryReport } from "./types.js";

// ============================================
// TYPESCRIPT PATH ALIAS RESOLUTION
// ============================================

interface TsConfigPaths {
  baseUrl?: string;
  paths?: Record<string, string[]>;
}

function loadTsConfig(projectRoot: string): TsConfigPaths {
  const tsConfigPath = join(projectRoot, "tsconfig.json");
  if (!existsSync(tsConfigPath)) {
    return {};
  }

  try {
    const configFile = ts.readConfigFile(tsConfigPath, (path) => readFileSync(path, "utf-8"));
    if (configFile.error) {
      return {};
    }

    const parsed = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      projectRoot,
    );

    return {
      baseUrl: parsed.options.baseUrl,
      paths: parsed.options.paths,
    };
  } catch {
    return {};
  }
}

function resolvePathAlias(
  importPath: string,
  tsConfig: TsConfigPaths,
  projectRoot: string,
  currentFileDir: string,
): string | null {
  // Handle path aliases (e.g., @/ -> project root)
  if (tsConfig.paths) {
    for (const [pattern, replacements] of Object.entries(tsConfig.paths)) {
      // Pattern like "@/*" -> ["*"]
      const regex = new RegExp("^" + pattern.replace(/\*/g, "(.+)") + "$");
      const match = importPath.match(regex);
      if (match) {
        const replacement = replacements[0];
        if (replacement) {
          const resolved = replacement.replace(/\*/g, match[1] || "");
          const base = tsConfig.baseUrl || projectRoot;
          return resolve(projectRoot, base, resolved);
        }
      }
    }
  }

  // Handle relative imports
  if (importPath.startsWith(".") || importPath.startsWith("/")) {
    if (importPath.startsWith("/")) {
      // Absolute path from project root
      return resolve(projectRoot, importPath.slice(1));
    }
    // Relative import
    return resolve(currentFileDir, importPath);
  }

  // External/node_modules - return null to indicate external
  return null;
}

// ============================================
// IMPORT EXTRACTION
// ============================================

interface ImportInfo {
  path: string;
  line: number;
  isDynamic: boolean;
  isRequire: boolean;
}

function extractImports(sourceFile: ts.SourceFile): ImportInfo[] {
  const imports: ImportInfo[] = [];

  function visit(node: ts.Node): void {
    // Static import: import ... from "path"
    if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      imports.push({
        path: node.moduleSpecifier.text,
        line,
        isDynamic: false,
        isRequire: false,
      });
    }

    // Dynamic import: import("path")
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const arg = node.arguments[0];
      if (arg && ts.isStringLiteral(arg)) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        imports.push({
          path: arg.text,
          line,
          isDynamic: true,
          isRequire: false,
        });
      }
    }

    // require("path")
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "require"
    ) {
      const arg = node.arguments[0];
      if (arg && ts.isStringLiteral(arg)) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        imports.push({
          path: arg.text,
          line,
          isDynamic: false,
          isRequire: true,
        });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return imports;
}

// ============================================
// PURITY CHECKING
// ============================================

function checkImportAgainstMatchers(
  importPath: string,
  matchers: string[],
): boolean {
  return matchers.some((matcher) => {
    // Handle patterns like "@/lib/" or "next/headers"
    if (matcher.endsWith("/")) {
      return importPath.startsWith(matcher);
    }
    // Exact match or starts with
    return importPath === matcher || importPath.startsWith(matcher + "/");
  });
}

function isBusinessDir(resolvedPath: string | null, businessDirMatchers: string[]): boolean {
  if (!resolvedPath) return false;
  // Check if resolved path matches any business directory pattern
  return businessDirMatchers.some((matcher) => {
    // Normalize paths for comparison
    const normalizedPath = resolvedPath.replace(/\\/g, "/");
    return normalizedPath.includes(matcher);
  });
}

// ============================================
// TRANSITIVE CHECKING
// ============================================

function checkTransitiveImports(
  filePath: string,
  fileContents: Map<string, string>,
  projectRoot: string,
  tsConfig: TsConfigPaths,
  purityConfig: PurityConfig,
  visited: Set<string>,
): Array<{ type: "transitive"; importPath: string; resolvedPath?: string; message: string }> {
  if (visited.has(filePath)) return [];
  visited.add(filePath);

  const content = fileContents.get(filePath);
  if (!content) return [];

  const reasons: Array<{ type: "transitive"; importPath: string; resolvedPath?: string; message: string }> = [];
  const currentFileDir = dirname(filePath);

  try {
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      extname(filePath) === ".tsx" || extname(filePath) === ".jsx" ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );

    const imports = extractImports(sourceFile);
    for (const imp of imports) {
      // Only check relative imports for transitive analysis
      if (!imp.path.startsWith(".")) continue;

      const resolved = resolvePathAlias(imp.path, tsConfig, projectRoot, currentFileDir);
      if (!resolved) continue;

      // Try different extensions
      const extensions = [".ts", ".tsx", ".js", ".jsx"];
      let foundFile: string | null = null;
      for (const ext of extensions) {
        const candidate = resolved.endsWith(ext) ? resolved : resolved + ext;
        if (existsSync(candidate) && fileContents.has(candidate)) {
          foundFile = candidate;
          break;
        }
      }

      if (!foundFile) continue;

      // Check if this imported file has forbidden imports
      const transitiveReasons = analyzeFileImports(
        foundFile,
        fileContents,
        projectRoot,
        tsConfig,
        purityConfig,
        visited,
      );

      if (transitiveReasons.length > 0) {
        reasons.push({
          type: "transitive",
          importPath: imp.path,
          resolvedPath: foundFile,
          message: `Transitive dependency via "${imp.path}" imports business logic`,
        });
      }
    }
  } catch {
    // Skip files that can't be parsed
  }

  return reasons;
}

function analyzeFileImports(
  filePath: string,
  fileContents: Map<string, string>,
  projectRoot: string,
  tsConfig: TsConfigPaths,
  purityConfig: PurityConfig,
  visited: Set<string>,
): Array<{ type: "forbidden-import" | "server-api" | "transitive" | "data-fetching"; importPath: string; resolvedPath?: string; line?: number; message: string }> {
  const content = fileContents.get(filePath);
  if (!content) return [];

  const reasons: Array<{ type: "forbidden-import" | "server-api" | "transitive" | "data-fetching"; importPath: string; resolvedPath?: string; line?: number; message: string }> = [];
  const currentFileDir = dirname(filePath);

  try {
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      extname(filePath) === ".tsx" || extname(filePath) === ".jsx" ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );

    const imports = extractImports(sourceFile);

    for (const imp of imports) {
      // Check against forbidden import matchers
      if (checkImportAgainstMatchers(imp.path, purityConfig.forbiddenImportMatchers)) {
        const resolved = resolvePathAlias(imp.path, tsConfig, projectRoot, currentFileDir);
        reasons.push({
          type: "forbidden-import",
          importPath: imp.path,
          resolvedPath: resolved || undefined,
          line: imp.line,
          message: `Forbidden import: "${imp.path}"`,
        });
        continue;
      }

      // Check Next.js server APIs
      if (checkImportAgainstMatchers(imp.path, purityConfig.nextServerImportMatchers)) {
        reasons.push({
          type: "server-api",
          importPath: imp.path,
          line: imp.line,
          message: `Next.js server API: "${imp.path}"`,
        });
        continue;
      }

      // Check if resolved path is in business directory
      const resolved = resolvePathAlias(imp.path, tsConfig, projectRoot, currentFileDir);
      if (isBusinessDir(resolved, purityConfig.businessDirMatchers)) {
        reasons.push({
          type: "forbidden-import",
          importPath: imp.path,
          resolvedPath: resolved || undefined,
          line: imp.line,
          message: `Business logic zone import: "${imp.path}"`,
        });
      }
    }
  } catch {
    // Skip files that can't be parsed
  }

  return reasons;
}

// ============================================
// FILE ANALYSIS
// ============================================

function analyzeFile(
  filePath: string,
  relativePath: string,
  fileContents: Map<string, string>,
  projectRoot: string,
  tsConfig: TsConfigPaths,
  purityConfig: PurityConfig,
): ImportBoundaryReport | null {
  // Check if file is a UI candidate
  const isUiCandidate = purityConfig.uiCandidateDirs.some((dir) =>
    relativePath.startsWith(dir) || relativePath.startsWith(dir + "/"),
  );

  if (!isUiCandidate) {
    return null; // Only analyze UI candidates
  }

  const content = fileContents.get(filePath);
  if (!content) return null;

  const reasons: Array<{
    type: "forbidden-import" | "server-api" | "transitive" | "data-fetching";
    importPath: string;
    resolvedPath?: string;
    line?: number;
    message: string;
  }> = [];

  const visited = new Set<string>();
  const directReasons = analyzeFileImports(filePath, fileContents, projectRoot, tsConfig, purityConfig, visited);
  reasons.push(...directReasons);

  // One-hop transitive check
  const transitiveReasons = checkTransitiveImports(
    filePath,
    fileContents,
    projectRoot,
    tsConfig,
    purityConfig,
    visited,
  );
  reasons.push(...transitiveReasons);

  // Check for data fetching patterns (secondary signal)
  const dataFetchingPatterns = [/\bfetch\s*\(/g, /\baxios\./g];
  for (const pattern of dataFetchingPatterns) {
    if (pattern.test(content)) {
      reasons.push({
        type: "data-fetching",
        importPath: "",
        message: "Data fetching detected (fetch/axios)",
      });
      break;
    }
  }

  // Calculate purity score
  let score = 0;
  for (const reason of reasons) {
    switch (reason.type) {
      case "forbidden-import":
        score += 30;
        break;
      case "server-api":
        score += 25;
        break;
      case "transitive":
        score += 15;
        break;
      case "data-fetching":
        score += 10;
        break;
    }
  }
  score = Math.min(100, score);

  const purity: "pure" | "impure" = score > 0 ? "impure" : "pure";

  return {
    path: relativePath,
    isUiCandidate: true,
    purity,
    score,
    reasons,
  };
}

// ============================================
// PUBLIC API
// ============================================

export async function analyzeImportBoundaries(
  fileContents: Map<string, string>,
  projectRoot: string,
  config: DsCoverageConfig,
): Promise<Record<string, ImportBoundaryReport>> {
  if (!config.purity.enabled) {
    return {};
  }

  const tsConfig = loadTsConfig(projectRoot);
  const reports: Record<string, ImportBoundaryReport> = {};

  for (const [filePath, content] of fileContents) {
    // Relative path from project root (used as report key and for uiCandidate check)
    const relativePath = relative(projectRoot, filePath);

    const report = analyzeFile(
      filePath,
      relativePath,
      fileContents,
      projectRoot,
      tsConfig,
      config.purity,
    );

    if (report) {
      reports[relativePath] = report;
    }
  }

  return reports;
}
