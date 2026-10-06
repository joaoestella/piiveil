---
name: clear
description: Apaga o cofre do piiveil deste projeto. Os tokens usados até agora deixam de ser traduzidos para os valores reais.
disable-model-invocation: true
allowed-tools: Bash(node *)
---

O usuário pediu para apagar o cofre do piiveil deste projeto. Resultado:

!`node "${CLAUDE_PLUGIN_ROOT}/dist/piiveil.mjs" limpar`

Informe o resultado ao usuário em uma ou duas frases. A partir de agora, tokens antigos como [PERSON_1] que ainda
estejam nesta conversa não correspondem mais a nenhum valor: não os use para escrever arquivos.
