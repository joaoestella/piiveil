---
name: clear
description: Erases the values in the piiveil vault for this project. Tokens used so far stop resolving to the real values.
disable-model-invocation: true
allowed-tools: Bash(node *)
---

The user asked to erase the piiveil vault for this project. Result:

!`node "${CLAUDE_PLUGIN_ROOT}/dist/piiveil.mjs" clear`

Report the result to the user in one or two sentences, in the user's language. From now on, old tokens such as
[PERSON_1] that are still in this conversation no longer map to any value: do not use them to write files.
