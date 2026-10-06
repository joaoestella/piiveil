# piiveil

[Português](README.pt-BR.md) · English

[![tests](https://github.com/joaoestella/piiveil/actions/workflows/test.yml/badge.svg)](https://github.com/joaoestella/piiveil/actions/workflows/test.yml)

**Reversible pseudonymization of personal data for [Claude Code](https://code.claude.com).** The model works with
tokens such as `[PERSON_1]`, `[SSN_1]` and `[COMPANY_1]`, while the files Claude Code writes contain the real
data.

piiveil is built for documents from **Brazil and the United States**: contracts, medical reports, court filings,
leases, spreadsheets. It validates identifiers the way the issuing agencies do (CPF and CNPJ check digits, CNJ
case numbers, SSN and ITIN ranges, EIN prefixes) instead of matching any string of digits. Everything runs
locally: piiveil sends nothing anywhere, and the token map lives in an encrypted vault on your machine.

> **Version 0.1 (MVP).** Read [Limitations](#limitations) before using it with real data. piiveil reduces what
> reaches the model; it is not an absolute guarantee and does not replace your organization's data protection
> measures (LGPD, HIPAA, GLBA, state privacy laws, contracts).

## How it works

```
 file on disk                         what the model sees              what gets written
 ─────────────────────                ───────────────────              ─────────────────────────────
 Jennifer Lynn Alvarez,    Read ──►   [PERSON_1],
 SSN 412-73-9058           (mask)     SSN [SSN_1]

                                      Write "[PERSON_1]" ──► (unmask) ──► file with "Jennifer Lynn Alvarez"
```

piiveil uses Claude Code hooks:

| Hook | What it does |
| :- | :- |
| `PostToolUse` (every tool) | Finds personal data in the output of Read, Grep, Glob, Bash, WebFetch, MCP tools and the rest, and replaces each item with a token before the model sees it. If anything fails, the content is hidden instead of passed through. |
| `PreToolUse` (Write, Edit, NotebookEdit, Bash, Grep, Glob, Read) | Replaces tokens with the real values in the tool input before it runs, so written files and commands use the real data. Also blocks Read on PDFs and images (see Limitations). |
| `MessageDisplay` | Optional and not registered by default: shows the real values on screen in place of the tokens. The model and the transcript keep only the tokens. See Limitations for how to turn it on. |
| `UserPromptSubmit` | If what you typed contains personal data, the prompt is blocked (it never reaches the model) and piiveil tells you which token to use instead. |
| `SessionStart` | Tells the model how to work with the tokens. |

The same person, SSN or company always gets the same token within a project, across sessions. Anything already in
the vault is recognized in any text, even outside the context where it was first detected.

## Installation

Requirements: Claude Code with plugin support and **Node.js 18 or newer** on your `PATH` (the hooks run with
`node`). Nothing else to install: the plugin ships a single prebuilt JavaScript file in `dist/`.

Inside Claude Code:

```
/plugin marketplace add joaoestella/piiveil
/plugin install piiveil@piiveil
```

To try a local copy without installing:

```bash
git clone https://github.com/joaoestella/piiveil
claude --plugin-dir ./piiveil
```

Run `/piiveil:vault-status` inside Claude Code to check that it is active.

## Usage

Work as usual. For example, in a folder with a lease:

```
> Read lease.txt and create parties.md with a table of the parties and their SSNs.
```

The model reads the lease already masked and writes `parties.md` with tokens, and the file is saved with the real
names and SSNs. On screen, the reply shows the tokens, which you can resolve with `unmask` or by opening the file.

This is what the model receives from [`examples/demand-letter.md`](examples/demand-letter.md):

```
[COMPANY_1]
Attn: Mr. [PERSON_1]
1200 Fictional Street, Suite 400
San Francisco, CA [ZIP_1]

Re: Security deposit of [PERSON_2] (SSN [SSN_1])

Dear Mr. [PERSON_3],
...
or contact me at [PHONE_1] or [EMAIL_1].
```

### When you type

The prompt hook can block what you type but cannot rewrite it. If you type
`what is the phone of SSN 412-73-9058?`, the prompt is stopped and piiveil replies:

```
piiveil: the prompt contains 1 piece(s) of personal data and was not sent to the model.
Rewrite it using the tokens below:
  • "412-73-9058" → use [SSN_1]
```

For long texts, save the content to a file and ask Claude Code to read it: reads go through masking.

### Commands

| Command | What it does |
| :- | :- |
| `/piiveil:vault-status` | Shows where the project vault is and how many items it holds, by type (never the values). |
| `/piiveil:vault-clear` | Erases the values in the project vault. Old tokens stop resolving, and their numbers are never reused. |

The same commands exist on the command line, plus a few that help check detection:

```bash
node dist/piiveil.mjs status
node dist/piiveil.mjs clear
node dist/piiveil.mjs init               # create .piiveil/config.json in the project
node dist/piiveil.mjs mask file.txt      # show how the model would see the file
node dist/piiveil.mjs unmask file.txt    # replace tokens with the real values
```

Use `--project <folder>` to point to another project.

The slash commands run that same `node` command. If Claude Code asks for permission, or auto mode cannot evaluate
it at the moment, approve it or run the command in a terminal.

## What is detected

**United States**

| Type | Token | How |
| :- | :- | :- |
| SSN | `[SSN_n]` | `123-45-6789` or `123 45 6789`; nine digits in a row only after "SSN" or "Social Security". Area 000, 666 and 900+, group 00, serial 0000 and numbers the SSA voided are rejected. |
| ITIN | `[ITIN_n]` | Same formats, starting with 9 and within the IRS group ranges. |
| EIN | `[EIN_n]` | `12-3456789` with a prefix assigned by the IRS; nine digits in a row only after "EIN" or "FEIN". |
| Phone | `[PHONE_n]` | NANP numbers with formatting or `+1`; area code and exchange starting with 2-9, no N11 codes. Ten digits in a row only after "phone", "cell" etc. |
| ZIP code | `[ZIP_n]` | ZIP+4 always; five digits only after a state abbreviation (`CA 94103`) or "ZIP". |

**Brazil**

| Type | Token | How |
| :- | :- | :- |
| CPF | `[CPF_n]` | With or without punctuation, with check digit validation. |
| CNPJ | `[CNPJ_n]` | Numeric, with or without punctuation, and the new alphanumeric format (punctuated), with check digit validation. |
| CEP | `[CEP_n]` | `00000-000` or `00.000-000`; eight digits in a row only after "CEP". |
| Case number | `[CASE_n]` | CNJ unified numbering, with check digit validation (mod 97). |
| OAB | `[OAB_n]` | Bar registration such as `OAB/SP 123.456`, `OAB-RJ nº 98765`, `OAB nº 45.678/MG`, with a valid state. |
| PIS/NIS | `[PIS_n]` | Punctuated, or in a row after PIS, PASEP, NIS or NIT; check digit validated. |
| RG | `[RG_n]` | `12.345.678-9`, or other formats after "RG". |
| Phone | `[PHONE_n]` | Landline or mobile with a valid area code (DDD); without one, only after a keyword (Tel., Cel., WhatsApp...). |

**Both**

| Type | Token | How |
| :- | :- | :- |
| E-mail | `[EMAIL_n]` | E-mail address format. |
| Card | `[CARD_n]` | 13 to 19 digits, plausible network prefix and Luhn check. |
| Person | `[PERSON_n]` | Heuristic: capitalized (or all-caps) words starting with a common Brazilian or American first name plus at least one surname; any capitalized name right after Mr., Mrs., Ms., Dr., Sr., Sra. and similar. |
| Company | `[COMPANY_n]` | Legal names ending in Inc., LLC, Corp., Ltd., LLP, L.P., Ltda, S.A., S/A, EIRELI, SLU, EPP or ME. |
| Term | `[TERM_n]` | Your own list of terms to always mask. |

## Configuration

Run `node dist/piiveil.mjs init` in the project folder, or create `.piiveil/config.json` by hand (see
[`examples/config.json`](examples/config.json)). A global configuration in `~/.piiveil/config.json` also works;
lists from both are combined, and simple values from the project win.

| Option | Default | Description |
| :- | :- | :- |
| `terms` | `[]` | Terms always masked as `[TERM_n]` (a codename, a client, a property...). |
| `names` | `[]` | Person names always masked, including those the heuristic misses. |
| `companies` | `[]` | Company names always masked, even without a legal suffix. |
| `firstNames` | `[]` | Extra first names for the name heuristic. |
| `ignore` | `[]` | Text that must never be masked (for example, an author you cite). |
| `disabledTypes` | `[]` | Types not to detect, such as `["PHONE", "ZIP"]`. |
| `prompt` | `"block"` | `"block"`, `"warn"` (let it through and warn) or `"off"`. |
| `blockBinaryFiles` | `true` | Blocks Read on PDFs and images. |
| `unmaskBash` | `true` | Replaces tokens with real values in Bash commands too. |
| `showRealValues` | `false` | Shows the real values on screen in place of the tokens; also requires registering the `MessageDisplay` hook (see Limitations). |
| `language` | `"auto"` | Language of piiveil's messages: `"auto"`, `"en"` or `"pt-BR"`. In auto, `PIIVEIL_LANG` or the system locale decides. |
| `enabled` | `true` | Turns piiveil on or off for the project. |

The Portuguese option names (`termos`, `nomes`, `ignorar`...) are accepted too.

The configuration may contain real names. **Do not commit the `.piiveil/` folder**: `init` already adds a
`.gitignore` inside it.

## Vault and key

- Each project's vault lives in `~/.piiveil/cofres/<id>.cofre`, **outside the project folder**, so it cannot be
  committed or copied along by accident. The `<id>` is derived from the project path.
- Contents are encrypted with AES-256-GCM, which also detects tampering. Writes are atomic and locked, since
  several hooks may run at once.
- The key is generated randomly the first time and stored in `~/.piiveil/chave` with `600` permissions.
  Alternatively, set `PIIVEIL_PASSPHRASE` to derive the key from a passphrase (scrypt); the key then never touches
  the disk, but the passphrase must be in the environment of every session.
- `PIIVEIL_HOME` changes the base folder (`~/.piiveil`).
- If the key is lost, tokens can no longer be resolved. Files already written are not affected: they contain the
  real data.

## Limitations

Some of these come from Claude Code itself and were confirmed by testing the plugin on version 2.1.289.

- **Files mentioned with `@` skip the hooks.** Their content goes straight to the model, unmasked. Ask Claude Code
  to read the file ("read lease.txt") instead of using `@`. For folders with sensitive data, add a read deny rule
  to the project's `.claude/settings.json`:

  ```json
  {
    "permissions": {
      "deny": ["Read(./sensitive-data/**)"]
    }
  }
  ```

  According to the documentation, Claude Code applies `Read` rules to `@` mentions on a best-effort basis. The rule
  also blocks Read in that folder; the content remains reachable through Bash (for example, `cat`), whose output is
  masked.
- **Edit with tokens in `old_string`.** Claude Code checks that `old_string` exists in the file before running
  `PreToolUse`, so text with tokens is never found. The session instructions ask the model for an `old_string`
  without tokens (`new_string` may have them) or, if there is no such text, to rewrite the file with Write. When
  the hook does run, the replacement works, and there is a test for it.
- **PDFs and images** read with Read reach the model as a document or image, with no text to mask. That is why
  piiveil blocks those reads by default; extract the text with Bash (`pdftotext file.pdf -`), whose output is
  masked.
- **Name detection is a heuristic.** Names that do not start with a listed first name (unless they follow Mr., Ms.,
  Dr. etc.), less common foreign names and lone first names may slip through. There are false positives too, such as
  streets named after people or Title Case headings that start with a first name. Street addresses, dates of
  birth, driver's license and passport numbers and other free-form data are not detected in the MVP; use `terms` and
  `names` for what matters. NER-based detection is planned for phase 2.
- **Different spellings become different tokens.** `JENNIFER ALVAREZ` and `Jennifer Alvarez` get separate tokens,
  because each token maps back to the exact original text.
- **Bash commands receive the real data.** A command such as `curl` with a token would send the real value out.
  Review commands before approving them, or set `unmaskBash: false`. Values with quotes or shell special characters
  are never inserted into commands: piiveil denies the call.
- **If the hook cannot even start** (for example, no `node` on the `PATH`), Claude Code treats it as a non-blocking
  error and the original output goes to the model. When the hook runs and something goes wrong, it fails closed:
  the content is hidden or the session is stopped.
- **Real values on screen are off by default.** A `MessageDisplay` hook can swap tokens for real values while the
  reply streams, but on Claude Code 2.1.291 the terminal output came out scrambled when it was registered (words
  disappeared and table borders broke), so the plugin does not register it. The files and what the model sees are not
  affected. To try it anyway, set `"showRealValues": true` in `.piiveil/config.json` and add the hook to
  `~/.claude/settings.json`, pointing to your copy of the plugin:

  ```json
  {
    "hooks": {
      "MessageDisplay": [
        { "hooks": [{ "type": "command", "command": "node", "args": ["/path/to/piiveil/dist/piiveil.mjs", "hook", "message-display"], "timeout": 5 }] }
      ]
    }
  }
  ```

  Even then, a token split across two streamed chunks shows up as a token.
- **Text that already looks like a token** (a literal `[PERSON_1]` in the original document) would be replaced when
  unmasking.
- **Differences from the hooks documentation**, found by testing with Claude Code: the tool output arrives in
  `tool_response` (an object shaped like each tool's result), not `tool_output` (a string), and `updatedToolOutput`
  must keep that shape or it is ignored; `MessageDisplay` receives the text in `delta`; `UserPromptSubmit` has no
  `suppressOriginalPrompt`, but a blocked prompt is discarded without reaching the model anyway. piiveil accepts both
  forms wherever they differ.

### About privacy laws

Pseudonymized data is still personal data under the LGPD (Brazil), the GDPR and most US state privacy laws, and
piiveil does not meet HIPAA's de-identification standards (it does not remove dates, addresses and other
identifiers listed there). Brazil's LGPD (art. 13, § 4) defines pseudonymization as
processing after which data can no longer be linked to an individual except through additional information kept
separately in a controlled and secure environment; that is what piiveil does with respect to the model, with the
vault as the additional information kept only on your machine. Using piiveil does not remove other obligations
(legal basis, vendor agreements, records of processing, guidance from your privacy officer). This project is not
legal advice.

## Development

```bash
npm install
npm test          # compiles with tsc and runs the tests (node:test); requires Node.js 22 or newer
npm run bundle    # builds dist/piiveil.mjs with esbuild
```

`dist/piiveil.mjs` is committed because plugin installation runs no build step; a test fails if it is out of date
with `src/`. The source code and comments are in Portuguese; contributions in English or Portuguese are welcome.

```
.claude-plugin/   plugin.json and marketplace.json
hooks/hooks.json  hook registration
skills/           /piiveil:vault-status and /piiveil:vault-clear
src/detectors/    detectors, check digit validation and first-name lists (Brazil and US)
src/vault/        encryption and vault
src/hooks/        one file per hook
src/i18n.ts       messages in English and Portuguese
src/cli.ts        command line and hook entry point
tests/            tests; tests/fixtures/ holds synthetic documents
examples/         example documents and configuration, all fictitious
```

All test and example documents are synthetic. CPF, CNPJ, PIS, SSN, EIN and card numbers were generated to satisfy
the validation rules only so the detectors can be exercised; any match with real documents is accidental.

Changes between versions are listed in [CHANGELOG.md](CHANGELOG.md). To report a security problem, see
[SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
