# Contributing to Design System Assistant

Thank you for considering contributing to Design System Assistant. This document explains how to propose changes, report issues, and work with the project.

## Code of conduct

Be respectful and constructive. We aim to keep the project welcoming and focused on design system tooling and AI-assisted workflows.

## How to contribute

### Reporting bugs

- Use the [GitHub Issues](https://github.com/mariealine/Design-System-Assistant/issues) for this repository.
- Describe the problem, your environment (Node version, OS), and steps to reproduce.
- If possible, include a minimal config or sample project that triggers the issue.

### Suggesting features or improvements

- Open an [issue](https://github.com/mariealine/Design-System-Assistant/issues) with a clear title and description.
- Explain the use case and why it would help you or others.

### Pull requests

1. **Fork** the repository and clone your fork.
2. **Create a branch** from `main` (e.g. `fix/scan-dir-edge-case` or `feat/new-preset`).
3. **Set up the project**:
   ```bash
   npm install
   npm run build
   npm test
   ```
4. **Make your changes** — keep the scope focused and the code consistent with the existing style (TypeScript, ESM).
5. **Run checks**:
   ```bash
   npm run typecheck
   npm test
   ```
6. **Commit** with clear messages (e.g. `fix: handle empty scanDir`, `feat: add preset for X`).
7. **Push** to your fork and open a **Pull Request** against `main`.
8. In the PR description, explain what changed and why; reference any related issues.

We’ll review as soon as we can. You may be asked to adjust something before merge.

### What we’re especially interested in

- Bug fixes and edge cases (scanner, config loading, dashboard).
- New violation presets or patterns for popular stacks (Tailwind, CSS-in-JS, etc.).
- Documentation improvements (README, comments, examples).
- Test coverage for new or fragile behavior.

### What to avoid

- Large refactors or new features without prior discussion in an issue.
- Changing the public API (exports, config shape) without a good reason and a note in the changelog.

## Development setup

- **Node.js** >= 20 (see `engines` in `package.json`).
- **Scripts**: `npm run build`, `npm run dev` (watch), `npm run typecheck`, `npm test`.
- **Config**: `design-system-assistant.config.example.js` and the wizard output describe the config shape.

## License

By contributing, you agree that your contributions will be licensed under the same [MIT License](LICENSE) that covers this project.
