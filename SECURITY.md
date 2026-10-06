# Security policy

[Português](#política-de-segurança) · English

piiveil exists to keep personal data away from the model, so any way around that is treated as a security issue.

## Supported versions

Only the latest release receives fixes. While the project is in 0.x, update to the newest version before reporting.

## What to report

- Personal data reaching the model despite piiveil being enabled (a tool output, file name, error message or
  command that is not masked).
- Real values leaking into places they should not go: the transcript, logs, error messages, the vault file in
  plain text.
- Weaknesses in the vault encryption or key handling (`src/vault/`).
- Ways to make piiveil write wrong data into files, or to inject commands through restored values in Bash.

A detector that misses a name or number format is usually a detection gap, not a vulnerability. Open a regular
issue for it, **using only fictitious data**.

## How to report

Use GitHub's private vulnerability reporting: open the **Security** tab of the repository and click
**Report a vulnerability**. Do not open a public issue for security problems.

Please include the piiveil and Claude Code versions, your operating system, and the smallest steps that reproduce
the problem. **Never send real personal data**: build the example with fictitious names and numbers (the
`examples/` and `tests/fixtures/` folders show how).

You should get a first response within 7 days. Once a fix is released, the report is credited in the release notes
unless you prefer otherwise.

---

# Política de segurança

O piiveil existe para manter dados pessoais longe do modelo, então qualquer forma de contornar isso é tratada como
problema de segurança.

## Versões com suporte

Só a versão mais recente recebe correções. Enquanto o projeto estiver na 0.x, atualize para a última versão antes de
reportar.

## O que reportar

- Dados pessoais chegando ao modelo com o piiveil ativo (saída de ferramenta, nome de arquivo, mensagem de erro ou
  comando que não é mascarado).
- Valores reais vazando para onde não deveriam: transcrição, logs, mensagens de erro, arquivo do cofre em texto
  aberto.
- Fragilidades na criptografia do cofre ou no tratamento da chave (`src/vault/`).
- Formas de fazer o piiveil gravar dados errados nos arquivos ou de injetar comandos no Bash pelos valores
  restaurados.

Um detector que não reconhece um formato de nome ou número costuma ser uma lacuna de detecção, não uma
vulnerabilidade. Abra uma issue normal, **usando apenas dados fictícios**.

## Como reportar

Use o reporte privado de vulnerabilidades do GitHub: abra a aba **Security** do repositório e clique em
**Report a vulnerability**. Não abra issue pública para problemas de segurança.

Informe as versões do piiveil e do Claude Code, o sistema operacional e os passos mínimos para reproduzir o
problema. **Nunca envie dados pessoais reais**: monte o exemplo com nomes e números fictícios (as pastas
`examples/` e `tests/fixtures/` mostram como).

A primeira resposta deve chegar em até 7 dias. Depois que a correção for publicada, o reporte é creditado nas notas
da versão, a menos que você prefira o contrário.
