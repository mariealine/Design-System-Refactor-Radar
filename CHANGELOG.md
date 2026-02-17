# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Nothing yet.

## [0.1.0] - 2025-02-17

### Added

- **Design System Assistant** — First release under the new name (renamed from Design System Refactor Radar).
- **CLI** — `npx design-system-assistant` and shorthand `npx dsa` for scan, init, and doctor.
- **Scanner** — Detect hardcoded design tokens (colors, typography, spacing, radius, shadows) via configurable regex patterns.
- **Dashboard** — Self-contained HTML report with metrics, violation tables, and filters.
- **Component API audit** — Compliance checks for prop naming, size values, and CVA/Radix usage.
- **Migration planning** — Source → target component mappings with complexity and guidelines.
- **Refactoring roadmap** — Prioritized phases, directory heatmap, and quick wins.
- **Import boundary / purity analysis** — Detect UI components entangled with business logic (forbidden imports, Next.js server APIs, transitive coupling).
- **Business logic analysis** — Risk levels (safe / careful / page-level) and native HTML element detection.
- **Cursor integration** — Wizard generates `.cursor/rules` and `.cursor/skills` (and `.claude/skills`, `.agents/skills`) aligned with your config.
- **Config** — Single file (`design-system-assistant.config.js` or `.mjs`) with backward compatibility for `design-system-refactor-radar.config.*` and `ds-coverage.config.*`.
- **Programmatic API** — `run()`, `init()`, `doctor()`, `analyzeImportBoundaries`, etc. via `import from "design-system-assistant"` and `"design-system-assistant/config"`.
- **Zero runtime dependencies** — Only devDependencies for build and tests.

### Changed

- Project and package renamed to **Design System Assistant** (`design-system-assistant`, bin `dsa`).
- Config and output file names use `design-system-assistant` prefix (with backward compatibility for old names).

### Fixed

- TypeScript: `BusinessLogicReport.nativeHtmlElements` now correctly requires `total` (business-logic-analyzer).
- ESM build: replaced `__dirname` with `import.meta.url` in dashboard-builder so the ESM bundle loads in Node.
- ESM bundle: `typescript` is externalized so the published ESM package no longer triggers "Dynamic require of 'fs'".
- Tests: use package imports (`design-system-assistant`, `design-system-assistant/config`) for reliable resolution.
- Tests: import-boundary report keys use path relative to project root; added missing fixtures (`helper.ts`, `components/helper.ts`).
- Export of `analyzeImportBoundaries` from the main package for programmatic use.

[Unreleased]: https://github.com/mariealine/Design-System-Assistant/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/mariealine/Design-System-Assistant/releases/tag/v0.1.0
