---
name: status
description: Shows where the piiveil vault for this project is stored and how many personal data items it holds, by type.
disable-model-invocation: true
allowed-tools: Bash(node *)
---

Output of the piiveil status command:

!`node "${CLAUDE_PLUGIN_ROOT}/dist/piiveil.mjs" status`

Summarize this output for the user, in the user's language. Do not try to read the vault file or the key.
