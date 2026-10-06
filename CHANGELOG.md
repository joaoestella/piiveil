# Changelog

All notable changes to piiveil are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [0.1.3] - 2026-10-06

### Fixed

- The `MessageDisplay` hook is no longer registered by default. Even when it changed nothing, Claude Code waited for
  it on every streamed chunk, and on Windows the reply came out scrambled in the terminal. The README explains how to
  register it separately together with `showRealValues`.

## [0.1.2] - 2026-10-06

### Changed

- Showing real values on screen in place of tokens is now optional (`showRealValues`, off by default). On Claude
  Code 2.1.291, replacing streamed text with text of a different length cut parts of the reply on screen. The model
  instructions and the blocked-prompt message were adjusted accordingly.

### Fixed

- `config.json` files saved as UTF-8 with BOM (common with Notepad and PowerShell on Windows) were ignored as invalid
  JSON.

## [0.1.1] - 2026-10-06

### Fixed

- The plugin commands were named `status` and `clear`, colliding with Claude Code's built-in `/status` and `/clear`.
  They are now `/piiveil:vault-status` and `/piiveil:vault-clear`, and a test rejects names of built-in commands.

## [0.1.0] - 2026-10-05

First release.

### Added

- Detection with validation of Brazilian identifiers (CPF, CNPJ including the alphanumeric format, CNJ case numbers,
  OAB, PIS/NIS, RG, CEP, phone numbers) and US identifiers (SSN, ITIN, EIN, NANP phone numbers, ZIP codes), plus
  e-mail addresses, payment cards (Luhn), person names, company names and user-defined terms.
- Per-project vault encrypted with AES-256-GCM, stored outside the project folder, with a random key file or a key
  derived from `PIIVEIL_PASSPHRASE`; consistent tokens across sessions.
- Claude Code hooks: `PostToolUse` masks tool output keeping each tool's response shape, `PreToolUse` restores real
  values in Write, Edit, NotebookEdit, Bash, Grep, Glob and Read inputs and blocks Read on PDFs and images,
  `UserPromptSubmit` blocks prompts containing personal data, `SessionStart` instructs the model.
- Command line (`status`, `clear`, `init`, `mask`, `unmask`), configuration in English or Portuguese, and messages
  in English and Portuguese.

[0.1.3]: https://github.com/joaoestella/piiveil/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/joaoestella/piiveil/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/joaoestella/piiveil/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/joaoestella/piiveil/releases/tag/v0.1.0
