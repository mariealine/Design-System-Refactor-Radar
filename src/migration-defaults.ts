/**
 * DS Coverage — Default Migration Mappings
 *
 * Provides auto-discovery of components in the codebase and default mappings
 * for target design systems (e.g. shadcn/ui). When migration is enabled but
 * no mappings are configured, we discover components and suggest a migration plan.
 */

import { relative } from "node:path";
import type { DsCoverageConfig } from "./config.js";
import type { ComponentApiReport } from "./types.js";

// ============================================
// SHADCN/UI DEFAULT MAPPINGS
// ============================================

/** Target info for shadcn/ui components (PascalCase name → details) */
const SHADCN_COMPONENT_MAP: Record<
  string,
  { complexity: "simple" | "moderate" | "complex"; guidelines: string; effort?: string }
> = {
  Alert: {
    complexity: "simple",
    guidelines: "1. Add shadcn Alert: npx shadcn@latest add alert\n2. Replace import and usage\n3. Adapt children to AlertTitle + AlertDescription",
    effort: "~15min",
  },
  Badge: {
    complexity: "simple",
    guidelines: "1. Add shadcn Badge: npx shadcn@latest add badge\n2. Replace import\n3. Map variant prop if needed",
    effort: "~10min",
  },
  Button: {
    complexity: "simple",
    guidelines: "1. Add shadcn Button: npx shadcn@latest add button\n2. Replace import\n3. Map variant/size props",
    effort: "~15min",
  },
  Card: {
    complexity: "simple",
    guidelines: "1. Add shadcn Card: npx shadcn@latest add card\n2. Replace Card with CardHeader, CardContent, CardFooter structure",
    effort: "~20min",
  },
  Dialog: {
    complexity: "moderate",
    guidelines: "1. Add shadcn Dialog: npx shadcn@latest add dialog\n2. Replace with Dialog, DialogTrigger, DialogContent, DialogHeader\n3. Adapt open/onOpenChange pattern",
    effort: "~30min",
  },
  Input: {
    complexity: "simple",
    guidelines: "1. Add shadcn Input: npx shadcn@latest add input\n2. Replace native <input> or old component\n3. Preserve className and ref forwarding",
    effort: "~10min",
  },
  Label: {
    complexity: "simple",
    guidelines: "1. Add shadcn Label: npx shadcn@latest add label\n2. Replace import\n3. Ensure htmlFor links to form control id",
    effort: "~10min",
  },
  Select: {
    complexity: "moderate",
    guidelines: "1. Add shadcn Select: npx shadcn@latest add select\n2. Replace with Select, SelectTrigger, SelectContent, SelectItem\n3. Adapt value/onValueChange pattern",
    effort: "~30min",
  },
  Separator: {
    complexity: "simple",
    guidelines: "1. Add shadcn Separator: npx shadcn@latest add separator\n2. Replace <hr> or custom divider",
    effort: "~5min",
  },
  Tabs: {
    complexity: "moderate",
    guidelines: "1. Add shadcn Tabs: npx shadcn@latest add tabs\n2. Replace with Tabs, TabsList, TabsTrigger, TabsContent",
    effort: "~25min",
  },
  Table: {
    complexity: "moderate",
    guidelines: "1. Add shadcn Table: npx shadcn@latest add table\n2. Replace Table, TableHeader, TableBody, TableRow, TableCell\n3. Use compound components pattern",
    effort: "~25min",
  },
  Textarea: {
    complexity: "simple",
    guidelines: "1. Add shadcn Textarea: npx shadcn@latest add textarea\n2. Replace native <textarea> or old component\n3. Preserve className and ref",
    effort: "~10min",
  },
  Toast: {
    complexity: "moderate",
    guidelines: "1. Add shadcn Sonner or Toast: npx shadcn@latest add sonner\n2. Replace toast calls with toast() from sonner\n3. Add Toaster provider at root",
    effort: "~30min",
  },
  Progress: {
    complexity: "simple",
    guidelines: "1. Add shadcn Progress: npx shadcn@latest add progress\n2. Replace import\n3. Map value prop (0-100)",
    effort: "~10min",
  },
  Skeleton: {
    complexity: "simple",
    guidelines: "1. Add shadcn Skeleton: npx shadcn@latest add skeleton\n2. Replace loading placeholders",
    effort: "~10min",
  },
  Anchor: {
    complexity: "simple",
    guidelines: "1. Use shadcn Link or keep anchor with consistent styling\n2. Or add custom anchor component to components/ui",
    effort: "~10min",
  },
};

/** Native HTML elements that map to shadcn components */
const LEGACY_HTML_TO_SHADCN: Record<
  string,
  { target: string; targetImportPath: string; complexity: "simple" | "moderate" | "complex"; guidelines: string }
> = {
  input: {
    target: "Input",
    targetImportPath: "@/components/ui/input",
    complexity: "simple",
    guidelines: "1. Add shadcn Input: npx shadcn@latest add input\n2. Replace <input> with <Input>\n3. Preserve type, placeholder, value, onChange, className",
  },
  textarea: {
    target: "Textarea",
    targetImportPath: "@/components/ui/textarea",
    complexity: "simple",
    guidelines: "1. Add shadcn Textarea: npx shadcn@latest add textarea\n2. Replace <textarea> with <Textarea>\n3. Preserve value, onChange, rows, className",
  },
  select: {
    target: "Select",
    targetImportPath: "@/components/ui/select",
    complexity: "moderate",
    guidelines: "1. Add shadcn Select: npx shadcn@latest add select\n2. Replace <select> with Select, SelectTrigger, SelectContent, SelectItem\n3. Map options to SelectItem components",
  },
  button: {
    target: "Button",
    targetImportPath: "@/components/ui/button",
    complexity: "simple",
    guidelines: "1. Add shadcn Button: npx shadcn@latest add button\n2. Replace <button> with <Button>\n3. Map type and variant",
  },
};

// ============================================
// DISCOVERY
// ============================================

/** Extract JSX element names from file content (both <ComponentName and <element) */
function discoverJsxElements(content: string): Set<string> {
  const found = new Set<string>();
  // Match <Name or </Name (opening/closing tags)
  const regex = /<\/?([A-Za-z][A-Za-z0-9]*)(?:[\s/>]|$)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(content)) !== null) {
    const name = m[1];
    if (name && !["Fragment", "React", "children"].includes(name)) {
      found.add(name);
    }
  }
  return found;
}

/** Check if a tag name is a native HTML element (lowercase, known list) */
function isNativeHtml(tag: string): boolean {
  const native = [
    "input",
    "textarea",
    "select",
    "button",
    "form",
    "label",
    "a",
    "div",
    "span",
    "p",
    "ul",
    "ol",
    "li",
    "table",
    "tr",
    "td",
    "th",
    "thead",
    "tbody",
  ];
  return native.includes(tag.toLowerCase());
}

/** Get shadcn target for a component name (PascalCase) */
function getShadcnTarget(componentName: string): typeof SHADCN_COMPONENT_MAP[string] | null {
  const key = componentName.charAt(0).toUpperCase() + componentName.slice(1);
  return SHADCN_COMPONENT_MAP[key] || null;
}

export interface DiscoveredMapping {
  source: string;
  sourceImportPattern: string;
  target: string;
  targetImportPath: string;
  complexity: "simple" | "moderate" | "complex";
  guidelines: string;
  effort?: string;
}

/**
 * Discover migration mappings from the codebase when config has migration enabled
 * but no mappings are defined. For shadcn/ui, we auto-generate based on:
 * - Components in component directories (from component analysis)
 * - Native HTML elements used in JSX (input, textarea, select, button)
 */
export function discoverMigrationMappings(
  fileContents: Map<string, string>,
  componentApi: { components: ComponentApiReport[] },
  scanDir: string,
  config: DsCoverageConfig,
): DiscoveredMapping[] {
  const migrationConfig = config.migration;
  if (!migrationConfig.enabled || migrationConfig.mappings.length > 0) {
    return [];
  }

  const targetDS = (migrationConfig.targetDS || "").toLowerCase();
  if (!targetDS.includes("shadcn")) {
    return [];
  }

  const mappings: DiscoveredMapping[] = [];
  const seen = new Set<string>();

  // 1. Components from component analysis
  const primaryDir = (config.componentAnalysis?.primaryDirectory || "components/ui/").replace(/\/$/, "");
  const importPattern = primaryDir.split("/")[0] === "components" ? "components" : primaryDir;

  for (const comp of componentApi.components) {
    const name = comp.name;
    if (seen.has(name)) continue;

    const shadcn = getShadcnTarget(name);
    if (shadcn) {
      seen.add(name);
      mappings.push({
        source: name,
        sourceImportPattern: importPattern,
        target: name,
        targetImportPath: `@/components/ui/${name.charAt(0).toLowerCase() + name.slice(1)}`,
        complexity: shadcn.complexity,
        guidelines: shadcn.guidelines,
        effort: shadcn.effort,
      });
    }
  }

  // 2. Native HTML elements used in scanned files
  const nativeUsed = new Set<string>();
  for (const [, content] of fileContents) {
    const elements = discoverJsxElements(content);
    for (const tag of elements) {
      const lower = tag.toLowerCase();
      if (LEGACY_HTML_TO_SHADCN[lower] && !seen.has(`html:${lower}`)) {
        nativeUsed.add(lower);
      }
    }
  }

  for (const tag of nativeUsed) {
    const def = LEGACY_HTML_TO_SHADCN[tag];
    if (def && !mappings.some((m) => m.source === tag && m.sourceImportPattern === "html-native")) {
      mappings.push({
        source: tag,
        sourceImportPattern: "html-native",
        target: def.target,
        targetImportPath: def.targetImportPath,
        complexity: def.complexity,
        guidelines: def.guidelines,
      });
    }
  }

  // 3. Additional JSX components used in app/pages (not in component dir)
  for (const [filePath, content] of fileContents) {
    const relPath = relative(scanDir, filePath);
    if (config.componentAnalysis?.directories.some((d) => relPath.startsWith(d))) continue;

    const elements = discoverJsxElements(content);
    for (const name of elements) {
      if (isNativeHtml(name)) continue;
      if (seen.has(name)) continue;

      const shadcn = getShadcnTarget(name);
      if (shadcn) {
        seen.add(name);
        mappings.push({
          source: name,
          sourceImportPattern: importPattern,
          target: name,
          targetImportPath: `@/components/ui/${name.charAt(0).toLowerCase() + name.slice(1)}`,
          complexity: shadcn.complexity,
          guidelines: shadcn.guidelines,
          effort: shadcn.effort,
        });
      }
    }
  }

  return mappings;
}
