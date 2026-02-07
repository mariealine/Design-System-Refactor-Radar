/**
 * DS Coverage — Stack Presets
 *
 * Pre-built violation patterns and component conventions for common CSS stacks.
 * Each preset provides sensible defaults that the wizard uses as a starting point.
 * Users can customize everything after generation.
 */

import type { DsCoverageConfig, ViolationCategoryConfig } from "./config.js";

// ============================================
// TYPES
// ============================================

export type PresetId =
  | "tailwind"
  | "css-modules"
  | "css-in-js"
  | "vanilla-css"
  | "utility-custom"
  | "none";

export interface PresetInfo {
  label: string;
  description: string;
}

export interface Preset {
  violations: Record<string, ViolationCategoryConfig>;
  componentAnalysis?: {
    api?: {
      expectedProps?: string[];
      expectedSizes?: string[];
    };
  };
}

// ============================================
// PRESETS INFO (for display)
// ============================================

export const PRESETS_INFO: Record<PresetId, PresetInfo> = {
  tailwind: {
    label: "Tailwind CSS",
    description: "Utility-first CSS framework with configurable design tokens",
  },
  "css-modules": {
    label: "CSS Modules",
    description: "Scoped CSS with class composition",
  },
  "css-in-js": {
    label: "CSS-in-JS",
    description: "Runtime styling (styled-components, Emotion, etc.)",
  },
  "vanilla-css": {
    label: "CSS / SCSS / LESS",
    description: "Traditional stylesheet approach with semantic classes",
  },
  "utility-custom": {
    label: "Utility-first (custom)",
    description: "Custom utility classes similar to Tailwind",
  },
  none: {
    label: "None / Other",
    description: "Manual pattern configuration",
  },
};

// ============================================
// TAILWIND PRESET
// ============================================

const TAILWIND_COLOR_NAMES = [
  "gray", "slate", "zinc", "neutral", "stone",
  "red", "orange", "amber", "yellow", "lime",
  "green", "emerald", "teal", "cyan", "sky",
  "blue", "indigo", "violet", "purple", "fuchsia",
  "pink", "rose",
];

const TAILWIND_COLOR_PATTERN =
  `(?:bg|text|border|ring|outline|shadow|accent|fill|stroke|from|via|to)-(?:${TAILWIND_COLOR_NAMES.join("|")})-(?:\\d{2,3}(?:/\\d+)?)` +
  `|(?:bg|text|border|ring)-(?:white|black)(?![a-z-])`;

const tailwindPreset: Preset = {
  violations: {
    colors: {
      enabled: true,
      label: "Colors",
      icon: "🎨",
      color: "oklch(0.637 0.237 25.331)",
      pattern: TAILWIND_COLOR_PATTERN,
    },
    typography: {
      enabled: true,
      label: "Typography",
      icon: "🔤",
      color: "oklch(0.723 0.22 70.08)",
      pattern:
        "\\btext-(?:xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)\\b|\\bfont-(?:thin|light|normal|medium|semibold|bold|extrabold|black)\\b",
      deduplicateByLine: true,
    },
    spacing: {
      enabled: true,
      label: "Spacing",
      icon: "📏",
      color: "oklch(0.623 0.214 259.815)",
      pattern:
        "\\b(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|space-x|space-y|w|h|min-w|min-h|max-w|max-h)-\\[\\d+[a-z%]*\\]",
    },
    radius: {
      enabled: true,
      label: "Radius",
      icon: "⬜",
      color: "oklch(0.8 0.25 102.212)",
      pattern: "\\brounded-\\[\\d+[a-z%]*\\]",
    },
    shadows: {
      enabled: true,
      label: "Shadows",
      icon: "🌫️",
      color: "oklch(0.723 0.219 149.579)",
      pattern: "\\bshadow-(?:sm|md|lg|xl|2xl|inner)\\b",
    },
    darkMode: {
      enabled: true,
      label: "Dark Mode",
      icon: "🌙",
      color: "oklch(0.623 0.214 264.376)",
      pattern: "\\bdark:",
    },
  },
  componentAnalysis: {
    api: {
      expectedProps: ["variant", "size"],
      expectedSizes: ["small", "medium", "large"],
    },
  },
};

// ============================================
// CSS MODULES PRESET
// ============================================

const cssModulesPreset: Preset = {
  violations: {
    colors: {
      enabled: true,
      label: "Colors",
      icon: "🎨",
      color: "oklch(0.637 0.237 25.331)",
      pattern: "#[0-9a-fA-F]{3,8}\\b|\\brgba?\\s*\\(|\\bhsla?\\s*\\(",
    },
    typography: {
      enabled: true,
      label: "Typography",
      icon: "🔤",
      color: "oklch(0.723 0.22 70.08)",
      pattern: "font-size\\s*:\\s*\\d+px|font-weight\\s*:\\s*\\d{3}",
      deduplicateByLine: true,
    },
    spacing: {
      enabled: true,
      label: "Spacing",
      icon: "📏",
      color: "oklch(0.623 0.214 259.815)",
      pattern: "(?:margin|padding|gap)\\s*:\\s*\\d+px",
    },
    radius: {
      enabled: true,
      label: "Radius",
      icon: "⬜",
      color: "oklch(0.8 0.25 102.212)",
      pattern: "border-radius\\s*:\\s*\\d+px",
    },
    shadows: {
      enabled: true,
      label: "Shadows",
      icon: "🌫️",
      color: "oklch(0.723 0.219 149.579)",
      pattern: "box-shadow\\s*:",
    },
    darkMode: {
      enabled: true,
      label: "Dark Mode",
      icon: "🌙",
      color: "oklch(0.623 0.214 264.376)",
      pattern: "prefers-color-scheme\\s*:\\s*dark",
    },
  },
  componentAnalysis: {
    api: {
      expectedProps: ["variant", "size"],
      expectedSizes: ["small", "medium", "large"],
    },
  },
};

// ============================================
// CSS-IN-JS PRESET
// ============================================

const cssInJsPreset: Preset = {
  violations: {
    colors: {
      enabled: true,
      label: "Colors",
      icon: "🎨",
      color: "oklch(0.637 0.237 25.331)",
      pattern: "['\"]#[0-9a-fA-F]{3,8}['\"]|color:\\s*['\"]#|background(?:Color)?:\\s*['\"]#",
    },
    typography: {
      enabled: true,
      label: "Typography",
      icon: "🔤",
      color: "oklch(0.723 0.22 70.08)",
      pattern: "fontSize\\s*:\\s*['\"]?\\d+|fontWeight\\s*:\\s*['\"]?\\d{3}",
      deduplicateByLine: true,
    },
    spacing: {
      enabled: true,
      label: "Spacing",
      icon: "📏",
      color: "oklch(0.623 0.214 259.815)",
      pattern: "(?:margin|padding|gap)\\s*:\\s*['\"]?\\d+",
    },
    radius: {
      enabled: true,
      label: "Radius",
      icon: "⬜",
      color: "oklch(0.8 0.25 102.212)",
      pattern: "borderRadius\\s*:\\s*['\"]?\\d+",
    },
    shadows: {
      enabled: true,
      label: "Shadows",
      icon: "🌫️",
      color: "oklch(0.723 0.219 149.579)",
      pattern: "boxShadow\\s*:",
    },
    darkMode: {
      enabled: true,
      label: "Dark Mode",
      icon: "🌙",
      color: "oklch(0.623 0.214 264.376)",
      pattern: "prefers-color-scheme.*dark",
    },
  },
  componentAnalysis: {
    api: {
      expectedProps: ["variant", "size"],
      expectedSizes: ["small", "medium", "large"],
    },
  },
};

// ============================================
// VANILLA CSS PRESET
// ============================================

const vanillaCssPreset: Preset = {
  violations: {
    colors: {
      enabled: true,
      label: "Colors",
      icon: "🎨",
      color: "oklch(0.637 0.237 25.331)",
      pattern: "#[0-9a-fA-F]{3,8}\\b|\\brgba?\\s*\\(|\\bhsla?\\s*\\(",
    },
    typography: {
      enabled: true,
      label: "Typography",
      icon: "🔤",
      color: "oklch(0.723 0.22 70.08)",
      pattern: "font-size\\s*:\\s*\\d+px|font-weight\\s*:\\s*\\d{3}",
      deduplicateByLine: true,
    },
    spacing: {
      enabled: true,
      label: "Spacing",
      icon: "📏",
      color: "oklch(0.623 0.214 259.815)",
      pattern: "(?:margin|padding|gap)\\s*:\\s*\\d+px",
    },
    radius: {
      enabled: true,
      label: "Radius",
      icon: "⬜",
      color: "oklch(0.8 0.25 102.212)",
      pattern: "border-radius\\s*:\\s*\\d+px",
    },
    shadows: {
      enabled: true,
      label: "Shadows",
      icon: "🌫️",
      color: "oklch(0.723 0.219 149.579)",
      pattern: "box-shadow\\s*:",
    },
    darkMode: {
      enabled: true,
      label: "Dark Mode",
      icon: "🌙",
      color: "oklch(0.623 0.214 264.376)",
      pattern: "prefers-color-scheme\\s*:\\s*dark",
    },
  },
  componentAnalysis: {
    api: {
      expectedProps: ["variant", "size"],
      expectedSizes: ["small", "medium", "large"],
    },
  },
};

// ============================================
// EMPTY PRESET (for "none" / custom)
// ============================================

const emptyPreset: Preset = {
  violations: {
    colors: {
      enabled: true,
      label: "Colors",
      icon: "🎨",
      color: "oklch(0.637 0.237 25.331)",
      pattern: "TODO_COLOR_PATTERN",
    },
    typography: {
      enabled: true,
      label: "Typography",
      icon: "🔤",
      color: "oklch(0.723 0.22 70.08)",
      pattern: "TODO_TYPOGRAPHY_PATTERN",
      deduplicateByLine: true,
    },
    spacing: {
      enabled: true,
      label: "Spacing",
      icon: "📏",
      color: "oklch(0.623 0.214 259.815)",
      pattern: "TODO_SPACING_PATTERN",
    },
    radius: {
      enabled: true,
      label: "Radius",
      icon: "⬜",
      color: "oklch(0.8 0.25 102.212)",
      pattern: "TODO_RADIUS_PATTERN",
    },
    shadows: {
      enabled: true,
      label: "Shadows",
      icon: "🌫️",
      color: "oklch(0.723 0.219 149.579)",
      pattern: "TODO_SHADOW_PATTERN",
    },
    darkMode: {
      enabled: true,
      label: "Dark Mode",
      icon: "🌙",
      color: "oklch(0.623 0.214 264.376)",
      pattern: "TODO_DARK_MODE_PATTERN",
    },
  },
  componentAnalysis: {
    api: {
      expectedProps: ["variant", "size"],
      expectedSizes: ["small", "medium", "large"],
    },
  },
};

// ============================================
// PRESET REGISTRY
// ============================================

const PRESETS: Record<PresetId, Preset> = {
  tailwind: tailwindPreset,
  "css-modules": cssModulesPreset,
  "css-in-js": cssInJsPreset,
  "vanilla-css": vanillaCssPreset,
  "utility-custom": tailwindPreset, // Similar patterns, user customizes
  none: emptyPreset,
};

export function getPreset(id: PresetId): Preset {
  return PRESETS[id] || emptyPreset;
}

export function getAvailablePresets(): { id: PresetId; info: PresetInfo }[] {
  return Object.entries(PRESETS_INFO).map(([id, info]) => ({
    id: id as PresetId,
    info,
  }));
}
