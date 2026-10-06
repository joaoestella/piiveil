/**
 * Mensagens exibidas ao usuário e ao modelo, em inglês e português.
 *
 * O idioma vem da opção `language` da configuração; em "auto" (padrão), de
 * PIIVEIL_LANG ou das variáveis de localidade do sistema (LC_ALL, LC_MESSAGES,
 * LANG) e, por fim, da localidade do Node. Português quando começa com "pt",
 * inglês nos demais casos.
 */

export type Idioma = "en" | "pt-BR";

const pt = {
  // Cofre
  chaveTamanho: () => "a chave do cofre deve ter 32 bytes",
  cofreCorrompido: () => "arquivo do cofre inválido ou corrompido",
  modoDesconhecido: () => "modo de chave desconhecido no cofre",
  cofreComSenha: () => "o cofre foi criado com senha; defina PIIVEIL_PASSPHRASE",
  cofreComArquivo: () => "o cofre foi criado com arquivo de chave; remova PIIVEIL_PASSPHRASE ou limpe o cofre",
  cofreIlegivel: () => "não foi possível decifrar o cofre: chave ou senha incorreta, ou arquivo adulterado",
  chaveInvalida: (arquivo: string) => `arquivo de chave inválido: ${arquivo}`,
  versaoCofre: (v: string) => `versão de cofre não suportada: ${v}`,
  travaEsgotada: () => "tempo esgotado esperando a trava do cofre",
  erroInterno: (nome?: string) => (nome ? `erro interno (${nome})` : "erro interno"),

  // Configuração
  jsonInvalido: (arquivo: string) => `${arquivo}: JSON inválido, arquivo ignorado`,
  esperadoObjeto: (arquivo: string) => `${arquivo}: esperado um objeto JSON, arquivo ignorado`,
  opcaoDesconhecida: (arquivo: string, chave: string) => `${arquivo}: opção desconhecida "${chave}"`,
  esperadaLista: (arquivo: string, chave: string) => `${arquivo}: "${chave}" deve ser uma lista de textos`,
  tiposValidos: (arquivo: string, chave: string, tipos: string) => `${arquivo}: "${chave}" aceita apenas ${tipos}`,
  promptValido: (arquivo: string) => `${arquivo}: "prompt" deve ser "block", "warn" ou "off"`,
  booleanoValido: (arquivo: string, chave: string) => `${arquivo}: "${chave}" deve ser true ou false`,
  idiomaValido: (arquivo: string) => `${arquivo}: "language" deve ser "auto", "en" ou "pt-BR"`,

  // Hooks
  saidaOcultadaModelo: (erro: string) =>
    `[piiveil] Conteúdo ocultado: não foi possível pseudonimizá-lo com segurança (${erro}). ` +
    "Avise o usuário; não tente obter o conteúdo por outro caminho.",
  saidaOcultadaUsuario: (erro: string) => `piiveil: saída da ferramenta ocultada por segurança (${erro})`,
  falhaProcessar: (erro: string) => `piiveil: falha ao processar (${erro})`,
  sessaoInterrompida: (motivo: string) => `${motivo}. A sessão foi interrompida para proteger os dados.`,
  binarioBloqueado: () =>
    "piiveil: PDFs e imagens lidos pelo Read chegam ao modelo sem pseudonimização. " +
    "Extraia o texto pelo Bash (por exemplo, `pdftotext arquivo.pdf -`), cuja saída é mascarada, " +
    'ou peça ao usuário para desativar a opção "blockBinaryFiles".',
  cofreNaoAbriu: (erro: string) => `piiveil: não foi possível abrir o cofre para restaurar os dados reais (${erro}).`,
  valorPerigosoShell: (token: string) =>
    `piiveil: o valor de ${token} contém aspas ou caracteres especiais do shell e não pode ser inserido ` +
    "com segurança no comando. Grave o conteúdo com Write ou Edit em vez de passá-lo pela linha de comando.",
  tokensDesconhecidos: (tokens: string) => `piiveil: os tokens ${tokens} não existem no cofre e foram mantidos como texto literal.`,
  promptNaoVerificadoAviso: (erro: string) => `piiveil: não foi possível verificar o prompt (${erro})`,
  promptNaoVerificadoBloqueio: (erro: string) => `piiveil: não foi possível verificar o prompt (${erro}). Ele não foi enviado.`,
  promptComDados: (n: number) => `piiveil: o prompt contém ${n} dado(s) pessoal(is) e não foi enviado ao modelo.`,
  promptReescreva: () => "Reescreva usando os tokens abaixo:",
  promptUseToken: (valor: string, token: string) => `  • "${valor}" → use ${token}`,
  promptMais: (n: number) => `  • … e mais ${n}`,
  promptArquivo: () => "Para textos longos, salve o conteúdo num arquivo e peça para lê-lo: a leitura passa pelo mascaramento.",
  promptAvisado: (n: number) => `piiveil: atenção, o prompt contém ${n} dado(s) pessoal(is) e foi enviado ao modelo sem pseudonimização.`,
  problemasConfig: (avisos: string) => `piiveil: problemas na configuração:\n${avisos}`,

  // Linha de comando
  ajuda: (versao: string) => `piiveil ${versao}: pseudonimização reversível de dados pessoais para o Claude Code

Uso: node dist/piiveil.mjs <comando> [opções]

Comandos:
  status               mostra onde fica o cofre do projeto e quantos dados ele guarda
  clear                apaga os valores do cofre do projeto (os tokens antigos deixam de ter valor)
  init                 cria .piiveil/config.json no projeto, já protegido do git
  mask <arquivo>       imprime o arquivo com os dados pessoais trocados por tokens
  unmask <arquivo>     imprime o arquivo com os tokens trocados pelos valores reais
  hook <evento>        uso interno pelos hooks do Claude Code

Opções:
  --project <pasta>    pasta do projeto (padrão: CLAUDE_PROJECT_DIR ou a pasta atual)

Os comandos também aceitam os nomes em português: limpar, mascarar, desmascarar, --projeto.
`,
  hookDesconhecido: (evento: string) => `piiveil: hook desconhecido "${evento}"`,
  comandoDesconhecido: (comando: string) => `piiveil: comando desconhecido "${comando}"`,
  uso: (comando: string) => `uso: ${comando} <arquivo>`,
  statusProjeto: (p: string) => `projeto: ${p}`,
  statusCofre: (arquivo: string, existe: boolean) => `cofre: ${arquivo}${existe ? "" : " (ainda não criado)"}`,
  statusChave: (senha: boolean, arquivo: string) => `chave: ${senha ? "derivada de PIIVEIL_PASSPHRASE" : arquivo}`,
  statusAtivo: (ativo: boolean) => `ativo: ${ativo ? "sim" : "não"}`,
  statusIdioma: (idioma: string) => `idioma: ${idioma}`,
  statusConfig: (arquivos: string[]) => `configuração: ${arquivos.length ? arquivos.join(", ") : "padrão"}`,
  statusAviso: (a: string) => `aviso: ${a}`,
  statusDados: (total: number, resumo: string) => `dados no cofre: ${total}${resumo ? ` (${resumo})` : ""}`,
  limpo: () =>
    "piiveil: valores do cofre apagados. Tokens usados até aqui não serão mais traduzidos e seus números não serão reutilizados.",
  semCofre: () => "piiveil: este projeto não tinha cofre.",
  configExiste: (arquivo: string) => `piiveil: ${arquivo} já existe.`,
  configCriada: (arquivo: string) => `piiveil: criado ${arquivo}`,
};

type Mensagens = typeof pt;

const en: Mensagens = {
  chaveTamanho: () => "the vault key must be 32 bytes long",
  cofreCorrompido: () => "invalid or corrupted vault file",
  modoDesconhecido: () => "unknown key mode in vault",
  cofreComSenha: () => "the vault was created with a passphrase; set PIIVEIL_PASSPHRASE",
  cofreComArquivo: () => "the vault was created with a key file; unset PIIVEIL_PASSPHRASE or clear the vault",
  cofreIlegivel: () => "could not decrypt the vault: wrong key or passphrase, or the file was tampered with",
  chaveInvalida: (arquivo) => `invalid key file: ${arquivo}`,
  versaoCofre: (v) => `unsupported vault version: ${v}`,
  travaEsgotada: () => "timed out waiting for the vault lock",
  erroInterno: (nome) => (nome ? `internal error (${nome})` : "internal error"),

  jsonInvalido: (arquivo) => `${arquivo}: invalid JSON, file ignored`,
  esperadoObjeto: (arquivo) => `${arquivo}: expected a JSON object, file ignored`,
  opcaoDesconhecida: (arquivo, chave) => `${arquivo}: unknown option "${chave}"`,
  esperadaLista: (arquivo, chave) => `${arquivo}: "${chave}" must be a list of strings`,
  tiposValidos: (arquivo, chave, tipos) => `${arquivo}: "${chave}" only accepts ${tipos}`,
  promptValido: (arquivo) => `${arquivo}: "prompt" must be "block", "warn" or "off"`,
  booleanoValido: (arquivo, chave) => `${arquivo}: "${chave}" must be true or false`,
  idiomaValido: (arquivo) => `${arquivo}: "language" must be "auto", "en" or "pt-BR"`,

  saidaOcultadaModelo: (erro) =>
    `[piiveil] Content hidden: it could not be pseudonymized safely (${erro}). ` +
    "Tell the user; do not try to obtain the content another way.",
  saidaOcultadaUsuario: (erro) => `piiveil: tool output hidden for safety (${erro})`,
  falhaProcessar: (erro) => `piiveil: processing failed (${erro})`,
  sessaoInterrompida: (motivo) => `${motivo}. The session was stopped to protect the data.`,
  binarioBloqueado: () =>
    "piiveil: PDFs and images read with Read reach the model without pseudonymization. " +
    "Extract the text with Bash (for example, `pdftotext file.pdf -`), whose output is masked, " +
    'or ask the user to turn off the "blockBinaryFiles" option.',
  cofreNaoAbriu: (erro) => `piiveil: could not open the vault to restore the real values (${erro}).`,
  valorPerigosoShell: (token) =>
    `piiveil: the value of ${token} contains quotes or shell special characters and cannot be inserted ` +
    "safely into the command. Write the content with Write or Edit instead of passing it on the command line.",
  tokensDesconhecidos: (tokens) => `piiveil: the tokens ${tokens} do not exist in the vault and were kept as literal text.`,
  promptNaoVerificadoAviso: (erro) => `piiveil: could not check the prompt (${erro})`,
  promptNaoVerificadoBloqueio: (erro) => `piiveil: could not check the prompt (${erro}). It was not sent.`,
  promptComDados: (n) => `piiveil: the prompt contains ${n} piece(s) of personal data and was not sent to the model.`,
  promptReescreva: () => "Rewrite it using the tokens below:",
  promptUseToken: (valor, token) => `  • "${valor}" → use ${token}`,
  promptMais: (n) => `  • … and ${n} more`,
  promptArquivo: () => "For long texts, save the content to a file and ask for it to be read: reads go through masking.",
  promptAvisado: (n) => `piiveil: warning, the prompt contains ${n} piece(s) of personal data and was sent to the model unmasked.`,
  problemasConfig: (avisos) => `piiveil: configuration problems:\n${avisos}`,

  ajuda: (versao) => `piiveil ${versao}: reversible pseudonymization of personal data for Claude Code

Usage: node dist/piiveil.mjs <command> [options]

Commands:
  status               show where the project vault is and how much data it holds
  clear                erase the values in the project vault (old tokens stop resolving)
  init                 create .piiveil/config.json in the project, already ignored by git
  mask <file>          print the file with personal data replaced by tokens
  unmask <file>        print the file with tokens replaced by the real values
  hook <event>         internal use by the Claude Code hooks

Options:
  --project <folder>   project folder (default: CLAUDE_PROJECT_DIR or the current folder)
`,
  hookDesconhecido: (evento) => `piiveil: unknown hook "${evento}"`,
  comandoDesconhecido: (comando) => `piiveil: unknown command "${comando}"`,
  uso: (comando) => `usage: ${comando} <file>`,
  statusProjeto: (p) => `project: ${p}`,
  statusCofre: (arquivo, existe) => `vault: ${arquivo}${existe ? "" : " (not created yet)"}`,
  statusChave: (senha, arquivo) => `key: ${senha ? "derived from PIIVEIL_PASSPHRASE" : arquivo}`,
  statusAtivo: (ativo) => `enabled: ${ativo ? "yes" : "no"}`,
  statusIdioma: (idioma) => `language: ${idioma}`,
  statusConfig: (arquivos) => `configuration: ${arquivos.length ? arquivos.join(", ") : "default"}`,
  statusAviso: (a) => `warning: ${a}`,
  statusDados: (total, resumo) => `items in vault: ${total}${resumo ? ` (${resumo})` : ""}`,
  limpo: () => "piiveil: vault values erased. Tokens used so far will no longer resolve, and their numbers will not be reused.",
  semCofre: () => "piiveil: this project had no vault.",
  configExiste: (arquivo) => `piiveil: ${arquivo} already exists.`,
  configCriada: (arquivo) => `piiveil: created ${arquivo}`,
};

const CATALOGO: Record<Idioma, Mensagens> = { en, "pt-BR": pt };

let atual: Idioma | undefined;

/** Normaliza um código de localidade ("pt_BR.UTF-8", "pt", "en-US") para um idioma suportado. */
export function normalizarIdioma(valor: string | undefined): Idioma | undefined {
  if (!valor) return undefined;
  const v = valor.trim().toLowerCase().split(/[.@]/)[0] ?? "";
  if (v === "" || v === "auto" || v === "c" || v === "posix") return undefined;
  return v.startsWith("pt") ? "pt-BR" : "en";
}

export function detectarIdioma(env: NodeJS.ProcessEnv = process.env): Idioma {
  for (const variavel of ["PIIVEIL_LANG", "LC_ALL", "LC_MESSAGES", "LANG"]) {
    const idioma = normalizarIdioma(env[variavel]);
    if (idioma) return idioma;
  }
  try {
    return normalizarIdioma(Intl.DateTimeFormat().resolvedOptions().locale) ?? "en";
  } catch {
    return "en";
  }
}

/** Define o idioma; `undefined` ou "auto" voltam para a detecção automática. */
export function definirIdioma(idioma: Idioma | "auto" | undefined): void {
  atual = idioma === "auto" ? undefined : idioma;
}

export function idioma(): Idioma {
  return atual ?? detectarIdioma();
}

export function msg(): Mensagens {
  return CATALOGO[idioma()];
}
