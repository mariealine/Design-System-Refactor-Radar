# Design System Assistant

**Keep your frontend aligned with your design system.** Scan for hardcoded tokens, audit component APIs, plan migrations, and generate Cursor rules — from a single config file. Zero runtime dependencies.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)  
**Repository:** [github.com/mariealine/Design-System-Assistant](https://github.com/mariealine/Design-System-Assistant) · **Issues:** [Report a bug or ask for a feature](https://github.com/mariealine/Design-System-Assistant/issues)

---

## Why Design System Assistant?

- **One config, one command** — Define what to scan and which patterns to enforce; the tool generates a coverage report and an interactive dashboard.
- **AI that follows your rules** — The `init` wizard scaffolds Cursor rules and skills so your AI assistant enforces the same conventions the scanner checks.
- **Stack-agnostic** — Works with Tailwind, CSS Modules, CSS-in-JS, or any stack; you supply regex patterns or use the built-in presets.
- **No runtime cost** — Dev dependency only; runs at build or on demand. No impact on your app bundle.

---

## Quick start

```bash
npm install --save-dev design-system-assistant
npx design-system-assistant init    # interactive setup
npx design-system-assistant --open  # scan and open dashboard
```

You can also use the shorthand: **`npx dsa`**.

---

## What it does

| Feature | Description |
|--------|--------------|
| **Scan** | Finds hardcoded colors, typography, spacing, radius, shadows via configurable patterns. |
| **Dashboard** | Generates a self-contained HTML file with metrics, violation tables, and filters. |
| **Component audit** | Checks prop naming, size values, and CVA/Radix usage in your UI components. |
| **Migration plan** | Tracks component migrations (source → target) with complexity and guidelines. |
| **Roadmap** | Prioritized refactoring phases, directory heatmap, and quick wins. |
| **Cursor / AI** | Generates `.cursor/rules` and `.cursor/skills` (and Claude/Agents skills) so the AI enforces your design system. |

---

## Commands

| Command | Description |
|--------|-------------|
| `npx dsa` or `npx design-system-assistant` | Scan and generate report + dashboard. |
| `npx dsa --open` | Scan and open the dashboard in the browser. |
| `npx dsa init` | Interactive wizard: config + Cursor rules and skills. |
| `npx dsa init --force` | Regenerate rules (overwrites existing generated files). |
| `npx dsa doctor` | Validate config and run basic diagnostics. |

Options: `--dry-run`, `--silent`, `--dir <path>`, `--config <path>`.

---

## Config

One file drives everything: `design-system-assistant.config.js` or `.mjs`. Create it with `npx dsa init` or copy [design-system-assistant.config.example.js](design-system-assistant.config.example.js).

```js
/** @type {import('design-system-assistant/config').DsCoverageConfig} */
export default {
  scanDir: "src",
  extensions: [".tsx", ".jsx"],
  exclude: ["node_modules/", "dist/"],
  violations: {
    colors: { enabled: true, label: "Colors", pattern: "…" },
    typography: { enabled: true, label: "Typography", pattern: "…" },
  },
  componentAnalysis: { enabled: true, directories: ["components/ui/"] },
  migration: { enabled: false, mappings: [] },
};
```

The example file and the wizard cover all options (violations, component analysis, migration, roadmap, purity).

---

## Dashboard

After a scan you get:

- **Metrics — App** — Coverage and violations by category.
- **Metrics — Design System** — Per-component token compliance (if component analysis is on).
- **Components — API Redesign** — Audit of props and sizes (if enabled).
- **Migration Plan** — Component mappings and status (if migration is on).
- **Refactoring Roadmap** — Phases and quick wins (if roadmap is on).

---

## AI guidelines (Cursor / Claude / Agents)

Running `npx dsa init` creates:

- **`.cursor/skills/design-system-compliance/SKILL.md`** — Main skill the AI uses; customize it for your tokens and conventions.
- **`.cursor/rules/design-system-compliance.mdc`** — Full compliance protocol.
- **`.cursor/rules/ui-component-creation.mdc`** — Component creation standards.

Same idea for `.claude/skills/` and `.agents/skills/`. After changing your config, run `npx dsa init --force` to regenerate (back up custom edits to the skill first).

---

## Programmatic API

```js
import { run, init } from "design-system-assistant";

const { report, dashboardPath } = await run({
  projectRoot: process.cwd(),
  config: { scanDir: "src" },
});

await init({
  projectRoot: process.cwd(),
  targets: ["cursor"],
  force: true,
});
```

Config types: `import type { DsCoverageConfig } from "design-system-assistant/config"`.

---

## Requirements

- **Node.js** >= 20  
- **Zero runtime dependencies** (only devDependencies for build)

---

## Links

- **Source & docs:** [github.com/mariealine/Design-System-Assistant](https://github.com/mariealine/Design-System-Assistant)
- **Issues & bugs:** [github.com/mariealine/Design-System-Assistant/issues](https://github.com/mariealine/Design-System-Assistant/issues)
- **Changelog:** [CHANGELOG.md](CHANGELOG.md)
- **Contributing:** [CONTRIBUTING.md](CONTRIBUTING.md)
- **Security:** [SECURITY.md](SECURITY.md)

---

## License

[MIT](LICENSE)
