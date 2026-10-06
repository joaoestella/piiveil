---
name: status
description: Mostra onde fica o cofre do piiveil neste projeto e quantos dados pessoais ele guarda, por tipo.
disable-model-invocation: true
allowed-tools: Bash(node *)
---

Resultado do comando de status do piiveil:

!`node "${CLAUDE_PLUGIN_ROOT}/dist/piiveil.mjs" status`

Apresente esse resultado ao usuário de forma resumida, em português. Não tente ler o arquivo do cofre nem a chave.
