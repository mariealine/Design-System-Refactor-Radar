/**
 * Wizard copy — all user-facing strings in English.
 * Kept in one place so questions and explanations can be tuned for clarity.
 */

export const COPY = {
  intro: {
    title: "DS Coverage — Configuration Wizard",
    line1: "✨ This tool will help you set up design system checks for your project.",
    line2: "📄 It generates a config file and Cursor rules so your code stays consistent with your design decisions.",
    line3: "💡 You can change any answer later in the config file, or by re-running this wizard.",
    line4: "⬅️  Enter = next question · type 'b' = go back",
  },

  sections: {
    techStack: {
      title: "🛠️  Tech stack",
      hint: "We'll adapt the rules to how you write CSS and which framework you use.",
    },
    projectStructure: {
      title: "📁  Project structure",
      hint: "We need to know where your source code and UI components live so we can analyze them.",
    },
    designTokens: {
      title: "🎨  Design tokens",
      hint: "We can check that colors, spacing, typography, etc. come from your design tokens instead of hard-coded values.",
    },
    migration: {
      title: "🚀  Migration (optional)",
      hint: "If you plan to switch to another component library (e.g. shadcn/ui, Radix), we can help track that migration.",
    },
  },

  steps: {
    cssMethodology: {
      question: "How do you write your CSS?",
      hint: "This determines which patterns we'll check for (e.g. utility classes vs. CSS Modules).",
      options: [
        { key: "tailwind", label: "Tailwind CSS (utility classes)" },
        { key: "css-modules", label: "CSS Modules (one .css file per component)" },
        { key: "css-in-js", label: "CSS-in-JS (styled-components, Emotion, etc.)" },
        { key: "vanilla-css", label: "Classic CSS / SCSS / LESS" },
        { key: "utility-custom", label: "Custom utility-first (Tailwind-like)" },
        { key: "none", label: "Not sure yet / Other" },
      ],
    },
    framework: {
      question: "Which frontend framework do you use?",
      options: [
        { key: "react", label: "React (JSX / TSX)" },
        { key: "vue", label: "Vue (SFC)" },
        { key: "svelte", label: "Svelte" },
        { key: "vanilla", label: "Vanilla JavaScript or TypeScript" },
        { key: "other", label: "Other" },
      ],
    },
    dsStatus: {
      question: "Where are you with your design system?",
      hint: "“Design system” means your shared colors, typography, spacing, and component patterns.",
      options: [
        { key: "existing", label: "I already have one (guidelines, tokens, or a component library)" },
        { key: "from-scratch", label: "I'm starting from scratch or building it step by step" },
      ],
    },
    scanDir: {
      question: "Which folder contains the code we should analyze?",
      hint: "Path relative to your project root. Use 'src' for a typical app, or '.' to scan the whole repo. No leading slash (e.g. src, app, .).",
      default: "src",
    },
    extensions: {
      question: "Which file types should we include?",
      hint: "Type one or more extensions with a dot, separated by commas. Examples: .tsx, .jsx, .css  or  .vue, .ts, .css  or  .tsx only. Press Enter to use the default for your framework.",
    },
    componentDir: {
      question: "Where are your reusable UI components (buttons, cards, inputs, etc.)?",
      hint: "Relative path from project root (no leading/trailing slash). Examples: components/ui  or  src/components  or  app/components/ui. Press Enter for the default.",
      default: "components/ui",
    },
    componentArchitecture: {
      question: "How do you handle component variants (size, theme, state)?",
      hint: "This affects how we check that your components follow a consistent API.",
      optionsCva: "CVA (Class Variance Authority) — common with Tailwind, variants via a small helper",
      optionsStyled: "Styled Components / Emotion — variants via props",
      optionsCssModules: "CSS Modules — variants via conditional classNames",
      optionsVanilla: "Classic CSS — BEM or your own conventions",
      optionsOther: "Other / I'll decide later",
    },
    tokenCategories: {
      question: "Which checks do you want to enable?",
      hint: "We'll flag code that doesn't use your design tokens. You can change this later in the config.",
      optionLabels: [
        { key: "colors", label: "Colors" },
        { key: "typography", label: "Typography" },
        { key: "spacing", label: "Spacing (margin, padding, gap)" },
        { key: "radius", label: "Border radius" },
        { key: "shadows", label: "Shadows" },
        { key: "darkMode", label: "Dark mode (semantic colors)" },
      ],
    },
    migrationPlan: {
      question: "Do you plan to migrate to another component library?",
      hint: "e.g. moving to shadcn/ui or Radix. Choose No if you're not sure.",
      options: [
        { key: "no", label: "No, not for now" },
        { key: "yes", label: "Yes, I want to plan a migration" },
      ],
    },
    migrationTarget: {
      question: "What is the target design system or library?",
      hint: "Pick one below, or choose 'Other' to type a custom name.",
      options: [
        { key: "shadcn/ui", label: "shadcn/ui" },
        { key: "Radix UI", label: "Radix UI" },
        { key: "Chakra UI", label: "Chakra UI" },
        { key: "MUI (Material UI)", label: "MUI (Material UI)" },
        { key: "Ant Design", label: "Ant Design" },
        { key: "Mantine", label: "Mantine" },
        { key: "Other", label: "Other (I'll type the name)" },
      ],
      otherPrompt: "Enter the target design system or library name:",
      default: "shadcn/ui",
    },
    apiRedesignPlanned: {
      question: "Do you plan to redesign your component APIs (props, variants, CVA, etc.)?",
      hint: "If yes, the dashboard will show the 'Components — API Redesign' tab with an audit of your components. If no, that tab will be hidden.",
      options: [
        { key: "yes", label: "Yes, I plan to redesign or standardize component APIs" },
        { key: "no", label: "No, skip the API Redesign tab in the dashboard" },
      ],
    },
  },

  navigation: {
    nextOrBack: "  ⏎ Enter = next   ·   b = back   → ",
    choicePrompt: (min: number, max: number, defaultNum: number) =>
      `  Your choice (${min}-${max}) [${defaultNum}] → `,
    multiPrompt: (defaultNums: string) =>
      `  Numbers (comma-separated) or 'all' [${defaultNums}] → `,
    textPrompt: (defaultValue: string) => `  [${defaultValue}] → `,
  },

  summary: {
    title: "📋  Summary",
    intro: "Here is what we'll generate. You can edit any step below if something looks wrong.",
    labels: {
      css: "How you write CSS",
      framework: "Framework",
      dsStatus: "Design system",
      scanDir: "Source folder",
      extensions: "File types",
      componentDir: "Components folder",
      componentArchitecture: "Component variants",
      tokenCategories: "Checks enabled",
      migration: "Migration target",
      apiRedesignPlanned: "API Redesign tab",
    },
    confirm: "  ✅ Confirm and generate? (Y/n) → ",
    whichStepEdit: "  ✏️  Which step do you want to edit?",
    stepEditPrompt: (max: number) =>
      `  Step (1-${max}) or Enter to cancel → `,
    cancelled: "\n  👋 Cancelled. Re-run `npx ds-coverage init` to start over.\n",
  },
} as const;

/** Step labels for the "edit which step" list (1-based list). */
export const WIZARD_STEP_LABELS = [
  COPY.steps.cssMethodology.question,
  COPY.steps.framework.question,
  COPY.steps.dsStatus.question,
  COPY.steps.scanDir.question,
  COPY.steps.extensions.question,
  COPY.steps.componentDir.question,
  COPY.steps.componentArchitecture.question,
  COPY.steps.tokenCategories.question,
  "Migration",
  COPY.steps.apiRedesignPlanned.question,
] as const;
