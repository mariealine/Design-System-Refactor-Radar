# Security Policy

## Supported versions

We release patches for the latest minor version. Security-related fixes are prioritized for the current release line.

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a vulnerability

If you believe you have found a security vulnerability in Design System Assistant, please report it responsibly.

1. **Do not** open a public GitHub issue for the vulnerability.
2. Send a private report to the maintainers. You can:
   - Use [GitHub Security Advisories](https://github.com/mariealine/Design-System-Assistant/security/advisories/new) for this repository, or
   - Contact the maintainer (see the [author field](https://github.com/mariealine/Design-System-Assistant/blob/main/package.json) and GitHub profile) with a clear description of the issue, steps to reproduce, and impact if possible.
3. Allow a reasonable time for a fix before disclosing the issue publicly.

We will acknowledge receipt and work on a fix. We may ask for more details. Once a fix is released, we can coordinate on disclosure and credit if you wish.

## Scope

Design System Assistant runs as a dev/build-time tool: it scans source code and generates reports and config. It does not execute user code from the scanned project; it only reads files and applies regex/AST analysis. Sensitive data in your repo (secrets, tokens) should not be passed to the tool except via the files it is configured to scan — ensure your config excludes sensitive paths and that you do not commit secrets. If you find a case where the tool could expose or misuse data in an unexpected way, we treat that as in scope for this policy.

Thank you for helping keep the project safe.
