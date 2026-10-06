// src/cli.ts
import { existsSync as existsSync4, mkdirSync as mkdirSync2, readFileSync as readFileSync3, writeFileSync as writeFileSync2 } from "node:fs";
import { join as join3 } from "node:path";

// src/vault/cofre.ts
import { createHash, randomBytes as randomBytes2 } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  rmdirSync,
  statSync,
  writeFileSync
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

// src/vault/cripto.ts
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

// src/i18n.ts
var pt = {
  // Cofre
  chaveTamanho: () => "a chave do cofre deve ter 32 bytes",
  cofreCorrompido: () => "arquivo do cofre inv\xE1lido ou corrompido",
  modoDesconhecido: () => "modo de chave desconhecido no cofre",
  cofreComSenha: () => "o cofre foi criado com senha; defina PIIVEIL_PASSPHRASE",
  cofreComArquivo: () => "o cofre foi criado com arquivo de chave; remova PIIVEIL_PASSPHRASE ou limpe o cofre",
  cofreIlegivel: () => "n\xE3o foi poss\xEDvel decifrar o cofre: chave ou senha incorreta, ou arquivo adulterado",
  chaveInvalida: (arquivo) => `arquivo de chave inv\xE1lido: ${arquivo}`,
  versaoCofre: (v) => `vers\xE3o de cofre n\xE3o suportada: ${v}`,
  travaEsgotada: () => "tempo esgotado esperando a trava do cofre",
  erroInterno: (nome) => nome ? `erro interno (${nome})` : "erro interno",
  // Configuração
  jsonInvalido: (arquivo) => `${arquivo}: JSON inv\xE1lido, arquivo ignorado`,
  esperadoObjeto: (arquivo) => `${arquivo}: esperado um objeto JSON, arquivo ignorado`,
  opcaoDesconhecida: (arquivo, chave) => `${arquivo}: op\xE7\xE3o desconhecida "${chave}"`,
  esperadaLista: (arquivo, chave) => `${arquivo}: "${chave}" deve ser uma lista de textos`,
  tiposValidos: (arquivo, chave, tipos) => `${arquivo}: "${chave}" aceita apenas ${tipos}`,
  promptValido: (arquivo) => `${arquivo}: "prompt" deve ser "block", "warn" ou "off"`,
  booleanoValido: (arquivo, chave) => `${arquivo}: "${chave}" deve ser true ou false`,
  idiomaValido: (arquivo) => `${arquivo}: "language" deve ser "auto", "en" ou "pt-BR"`,
  // Hooks
  saidaOcultadaModelo: (erro) => `[piiveil] Conte\xFAdo ocultado: n\xE3o foi poss\xEDvel pseudonimiz\xE1-lo com seguran\xE7a (${erro}). Avise o usu\xE1rio; n\xE3o tente obter o conte\xFAdo por outro caminho.`,
  saidaOcultadaUsuario: (erro) => `piiveil: sa\xEDda da ferramenta ocultada por seguran\xE7a (${erro})`,
  falhaProcessar: (erro) => `piiveil: falha ao processar (${erro})`,
  sessaoInterrompida: (motivo) => `${motivo}. A sess\xE3o foi interrompida para proteger os dados.`,
  binarioBloqueado: () => 'piiveil: PDFs e imagens lidos pelo Read chegam ao modelo sem pseudonimiza\xE7\xE3o. Extraia o texto pelo Bash (por exemplo, `pdftotext arquivo.pdf -`), cuja sa\xEDda \xE9 mascarada, ou pe\xE7a ao usu\xE1rio para desativar a op\xE7\xE3o "blockBinaryFiles".',
  cofreNaoAbriu: (erro) => `piiveil: n\xE3o foi poss\xEDvel abrir o cofre para restaurar os dados reais (${erro}).`,
  valorPerigosoShell: (token) => `piiveil: o valor de ${token} cont\xE9m aspas ou caracteres especiais do shell e n\xE3o pode ser inserido com seguran\xE7a no comando. Grave o conte\xFAdo com Write ou Edit em vez de pass\xE1-lo pela linha de comando.`,
  tokensDesconhecidos: (tokens) => `piiveil: os tokens ${tokens} n\xE3o existem no cofre e foram mantidos como texto literal.`,
  promptNaoVerificadoAviso: (erro) => `piiveil: n\xE3o foi poss\xEDvel verificar o prompt (${erro})`,
  promptNaoVerificadoBloqueio: (erro) => `piiveil: n\xE3o foi poss\xEDvel verificar o prompt (${erro}). Ele n\xE3o foi enviado.`,
  promptComDados: (n) => `piiveil: o prompt cont\xE9m ${n} dado(s) pessoal(is) e n\xE3o foi enviado ao modelo.`,
  promptReescreva: () => "Reescreva usando os tokens abaixo (a resposta mostrar\xE1 os valores reais na tela):",
  promptUseToken: (valor, token) => `  \u2022 "${valor}" \u2192 use ${token}`,
  promptMais: (n) => `  \u2022 \u2026 e mais ${n}`,
  promptArquivo: () => "Para textos longos, salve o conte\xFAdo num arquivo e pe\xE7a para l\xEA-lo: a leitura passa pelo mascaramento.",
  promptAvisado: (n) => `piiveil: aten\xE7\xE3o, o prompt cont\xE9m ${n} dado(s) pessoal(is) e foi enviado ao modelo sem pseudonimiza\xE7\xE3o.`,
  problemasConfig: (avisos) => `piiveil: problemas na configura\xE7\xE3o:
${avisos}`,
  // Linha de comando
  ajuda: (versao) => `piiveil ${versao}: pseudonimiza\xE7\xE3o revers\xEDvel de dados pessoais para o Claude Code

Uso: node dist/piiveil.mjs <comando> [op\xE7\xF5es]

Comandos:
  status               mostra onde fica o cofre do projeto e quantos dados ele guarda
  clear                apaga os valores do cofre do projeto (os tokens antigos deixam de ter valor)
  init                 cria .piiveil/config.json no projeto, j\xE1 protegido do git
  mask <arquivo>       imprime o arquivo com os dados pessoais trocados por tokens
  unmask <arquivo>     imprime o arquivo com os tokens trocados pelos valores reais
  hook <evento>        uso interno pelos hooks do Claude Code

Op\xE7\xF5es:
  --project <pasta>    pasta do projeto (padr\xE3o: CLAUDE_PROJECT_DIR ou a pasta atual)

Os comandos tamb\xE9m aceitam os nomes em portugu\xEAs: limpar, mascarar, desmascarar, --projeto.
`,
  hookDesconhecido: (evento) => `piiveil: hook desconhecido "${evento}"`,
  comandoDesconhecido: (comando) => `piiveil: comando desconhecido "${comando}"`,
  uso: (comando) => `uso: ${comando} <arquivo>`,
  statusProjeto: (p) => `projeto: ${p}`,
  statusCofre: (arquivo, existe) => `cofre: ${arquivo}${existe ? "" : " (ainda n\xE3o criado)"}`,
  statusChave: (senha, arquivo) => `chave: ${senha ? "derivada de PIIVEIL_PASSPHRASE" : arquivo}`,
  statusAtivo: (ativo) => `ativo: ${ativo ? "sim" : "n\xE3o"}`,
  statusIdioma: (idioma2) => `idioma: ${idioma2}`,
  statusConfig: (arquivos) => `configura\xE7\xE3o: ${arquivos.length ? arquivos.join(", ") : "padr\xE3o"}`,
  statusAviso: (a) => `aviso: ${a}`,
  statusDados: (total, resumo) => `dados no cofre: ${total}${resumo ? ` (${resumo})` : ""}`,
  limpo: () => "piiveil: valores do cofre apagados. Tokens usados at\xE9 aqui n\xE3o ser\xE3o mais traduzidos e seus n\xFAmeros n\xE3o ser\xE3o reutilizados.",
  semCofre: () => "piiveil: este projeto n\xE3o tinha cofre.",
  configExiste: (arquivo) => `piiveil: ${arquivo} j\xE1 existe.`,
  configCriada: (arquivo) => `piiveil: criado ${arquivo}`
};
var en = {
  chaveTamanho: () => "the vault key must be 32 bytes long",
  cofreCorrompido: () => "invalid or corrupted vault file",
  modoDesconhecido: () => "unknown key mode in vault",
  cofreComSenha: () => "the vault was created with a passphrase; set PIIVEIL_PASSPHRASE",
  cofreComArquivo: () => "the vault was created with a key file; unset PIIVEIL_PASSPHRASE or clear the vault",
  cofreIlegivel: () => "could not decrypt the vault: wrong key or passphrase, or the file was tampered with",
  chaveInvalida: (arquivo) => `invalid key file: ${arquivo}`,
  versaoCofre: (v) => `unsupported vault version: ${v}`,
  travaEsgotada: () => "timed out waiting for the vault lock",
  erroInterno: (nome) => nome ? `internal error (${nome})` : "internal error",
  jsonInvalido: (arquivo) => `${arquivo}: invalid JSON, file ignored`,
  esperadoObjeto: (arquivo) => `${arquivo}: expected a JSON object, file ignored`,
  opcaoDesconhecida: (arquivo, chave) => `${arquivo}: unknown option "${chave}"`,
  esperadaLista: (arquivo, chave) => `${arquivo}: "${chave}" must be a list of strings`,
  tiposValidos: (arquivo, chave, tipos) => `${arquivo}: "${chave}" only accepts ${tipos}`,
  promptValido: (arquivo) => `${arquivo}: "prompt" must be "block", "warn" or "off"`,
  booleanoValido: (arquivo, chave) => `${arquivo}: "${chave}" must be true or false`,
  idiomaValido: (arquivo) => `${arquivo}: "language" must be "auto", "en" or "pt-BR"`,
  saidaOcultadaModelo: (erro) => `[piiveil] Content hidden: it could not be pseudonymized safely (${erro}). Tell the user; do not try to obtain the content another way.`,
  saidaOcultadaUsuario: (erro) => `piiveil: tool output hidden for safety (${erro})`,
  falhaProcessar: (erro) => `piiveil: processing failed (${erro})`,
  sessaoInterrompida: (motivo) => `${motivo}. The session was stopped to protect the data.`,
  binarioBloqueado: () => 'piiveil: PDFs and images read with Read reach the model without pseudonymization. Extract the text with Bash (for example, `pdftotext file.pdf -`), whose output is masked, or ask the user to turn off the "blockBinaryFiles" option.',
  cofreNaoAbriu: (erro) => `piiveil: could not open the vault to restore the real values (${erro}).`,
  valorPerigosoShell: (token) => `piiveil: the value of ${token} contains quotes or shell special characters and cannot be inserted safely into the command. Write the content with Write or Edit instead of passing it on the command line.`,
  tokensDesconhecidos: (tokens) => `piiveil: the tokens ${tokens} do not exist in the vault and were kept as literal text.`,
  promptNaoVerificadoAviso: (erro) => `piiveil: could not check the prompt (${erro})`,
  promptNaoVerificadoBloqueio: (erro) => `piiveil: could not check the prompt (${erro}). It was not sent.`,
  promptComDados: (n) => `piiveil: the prompt contains ${n} piece(s) of personal data and was not sent to the model.`,
  promptReescreva: () => "Rewrite it using the tokens below (the reply will show the real values on screen):",
  promptUseToken: (valor, token) => `  \u2022 "${valor}" \u2192 use ${token}`,
  promptMais: (n) => `  \u2022 \u2026 and ${n} more`,
  promptArquivo: () => "For long texts, save the content to a file and ask for it to be read: reads go through masking.",
  promptAvisado: (n) => `piiveil: warning, the prompt contains ${n} piece(s) of personal data and was sent to the model unmasked.`,
  problemasConfig: (avisos) => `piiveil: configuration problems:
${avisos}`,
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
  statusIdioma: (idioma2) => `language: ${idioma2}`,
  statusConfig: (arquivos) => `configuration: ${arquivos.length ? arquivos.join(", ") : "default"}`,
  statusAviso: (a) => `warning: ${a}`,
  statusDados: (total, resumo) => `items in vault: ${total}${resumo ? ` (${resumo})` : ""}`,
  limpo: () => "piiveil: vault values erased. Tokens used so far will no longer resolve, and their numbers will not be reused.",
  semCofre: () => "piiveil: this project had no vault.",
  configExiste: (arquivo) => `piiveil: ${arquivo} already exists.`,
  configCriada: (arquivo) => `piiveil: created ${arquivo}`
};
var CATALOGO = { en, "pt-BR": pt };
var atual;
function normalizarIdioma(valor) {
  if (!valor) return void 0;
  const v = valor.trim().toLowerCase().split(/[.@]/)[0] ?? "";
  if (v === "" || v === "auto" || v === "c" || v === "posix") return void 0;
  return v.startsWith("pt") ? "pt-BR" : "en";
}
function detectarIdioma(env = process.env) {
  for (const variavel of ["PIIVEIL_LANG", "LC_ALL", "LC_MESSAGES", "LANG"]) {
    const idioma2 = normalizarIdioma(env[variavel]);
    if (idioma2) return idioma2;
  }
  try {
    return normalizarIdioma(Intl.DateTimeFormat().resolvedOptions().locale) ?? "en";
  } catch {
    return "en";
  }
}
function definirIdioma(idioma2) {
  atual = idioma2 === "auto" ? void 0 : idioma2;
}
function idioma() {
  return atual ?? detectarIdioma();
}
function msg() {
  return CATALOGO[idioma()];
}

// src/vault/cripto.ts
var MAGICO = Buffer.from("PIV1", "ascii");
var TAM_CABECALHO = 4 + 1 + 16 + 12;
var TAM_TAG = 16;
var ErroCofre = class extends Error {
  name = "ErroCofre";
};
function derivar(material, sal) {
  if (material.modo === 0) {
    if (material.segredo.length !== 32) throw new ErroCofre(msg().chaveTamanho());
    return material.segredo;
  }
  return scryptSync(material.segredo, sal, 32, { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
}
function cifrar(claro, material) {
  const sal = material.modo === 1 ? randomBytes(16) : Buffer.alloc(16);
  const iv = randomBytes(12);
  const cabecalho = Buffer.concat([MAGICO, Buffer.from([material.modo]), sal, iv]);
  const cifra = createCipheriv("aes-256-gcm", derivar(material, sal), iv);
  cifra.setAAD(cabecalho);
  const corpo = Buffer.concat([cifra.update(claro), cifra.final()]);
  return Buffer.concat([cabecalho, cifra.getAuthTag(), corpo]);
}
function lerModo(dados) {
  if (dados.length < TAM_CABECALHO + TAM_TAG || !dados.subarray(0, 4).equals(MAGICO)) {
    throw new ErroCofre(msg().cofreCorrompido());
  }
  const modo = dados[4];
  if (modo !== 0 && modo !== 1) throw new ErroCofre(msg().modoDesconhecido());
  return modo;
}
function decifrar(dados, material) {
  const modo = lerModo(dados);
  if (modo !== material.modo) {
    throw new ErroCofre(
      modo === 1 ? msg().cofreComSenha() : msg().cofreComArquivo()
    );
  }
  const cabecalho = dados.subarray(0, TAM_CABECALHO);
  const sal = dados.subarray(5, 21);
  const iv = dados.subarray(21, 33);
  const tag = dados.subarray(TAM_CABECALHO, TAM_CABECALHO + TAM_TAG);
  const corpo = dados.subarray(TAM_CABECALHO + TAM_TAG);
  const decifra = createDecipheriv("aes-256-gcm", derivar(material, sal), iv);
  decifra.setAAD(cabecalho);
  decifra.setAuthTag(tag);
  try {
    return Buffer.concat([decifra.update(corpo), decifra.final()]);
  } catch {
    throw new ErroCofre(msg().cofreIlegivel());
  }
}

// src/detectors/tipos.ts
var TIPOS = [
  "PERSON",
  "COMPANY",
  "CPF",
  "CNPJ",
  "EMAIL",
  "PHONE",
  "CEP",
  "CARD",
  "CASE",
  "OAB",
  "PIS",
  "RG",
  "TERM"
];
var PRIORIDADE = {
  TERM: 100,
  EMAIL: 95,
  CASE: 90,
  CNPJ: 85,
  CPF: 80,
  CARD: 75,
  PIS: 70,
  OAB: 65,
  RG: 60,
  CEP: 55,
  PHONE: 50,
  COMPANY: 40,
  PERSON: 30
};

// src/vault/cofre.ts
function diretorioBase() {
  return process.env.PIIVEIL_HOME ? resolve(process.env.PIIVEIL_HOME) : join(homedir(), ".piiveil");
}
function garantirDiretorio(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 448 });
}
function obterMaterialChave() {
  const senha = process.env.PIIVEIL_PASSPHRASE;
  if (senha && senha.length > 0) return { modo: 1, segredo: Buffer.from(senha, "utf8") };
  const base = diretorioBase();
  const arquivo = join(base, "chave");
  if (existsSync(arquivo)) {
    const chave2 = Buffer.from(readFileSync(arquivo, "utf8").trim(), "base64");
    if (chave2.length !== 32) throw new ErroCofre(msg().chaveInvalida(arquivo));
    return { modo: 0, segredo: chave2 };
  }
  garantirDiretorio(base);
  const chave = randomBytes2(32);
  try {
    writeFileSync(arquivo, chave.toString("base64") + "\n", { mode: 384, flag: "wx" });
  } catch (e) {
    if (e.code === "EEXIST") return obterMaterialChave();
    throw e;
  }
  return { modo: 0, segredo: chave };
}
function caminhoDoCofre(projeto) {
  const id = createHash("sha256").update(resolve(projeto)).digest("hex").slice(0, 24);
  return join(diretorioBase(), "cofres", `${id}.cofre`);
}
var RE_TOKEN = new RegExp(String.raw`^\[(${TIPOS.join("|")})_(\d+)\]$`);
var Cofre = class _Cofre {
  constructor(projeto, arquivo) {
    this.projeto = projeto;
    this.arquivo = arquivo;
  }
  projeto;
  arquivo;
  porToken = /* @__PURE__ */ new Map();
  porValor = /* @__PURE__ */ new Map();
  contadores = {};
  alterado = false;
  criadoEm = (/* @__PURE__ */ new Date()).toISOString();
  /** Abre o cofre do projeto; se não existir, começa vazio (só grava ao salvar). */
  static abrir(projeto, arquivo = caminhoDoCofre(projeto)) {
    const cofre = new _Cofre(resolve(projeto), arquivo);
    if (existsSync(arquivo)) {
      const claro = decifrar(readFileSync(arquivo), obterMaterialChave());
      cofre.carregar(JSON.parse(claro.toString("utf8")));
    }
    return cofre;
  }
  /**
   * Abre o cofre com trava exclusiva, executa `fn` e salva se houve mudança.
   * Evita perder tokens quando vários hooks rodam em paralelo.
   */
  static async comTrava(projeto, fn, arquivo = caminhoDoCofre(projeto)) {
    const liberar = await travar(arquivo);
    try {
      const cofre = _Cofre.abrir(projeto, arquivo);
      const resultado = await fn(cofre);
      if (cofre.alterado) cofre.salvar();
      return resultado;
    } finally {
      liberar();
    }
  }
  /**
   * Apaga todos os valores do cofre do projeto. Devolve true se havia um.
   *
   * Os contadores são mantidos para que um token novo nunca reaproveite o
   * número de um token antigo que ainda esteja na conversa: depois de limpar,
   * [PERSON_1] antigo fica sem valor em vez de passar a apontar para outra pessoa.
   * Se o cofre não puder ser decifrado (chave perdida), o arquivo é removido.
   */
  static async limpar(projeto, arquivo = caminhoDoCofre(projeto)) {
    if (!existsSync(arquivo)) return false;
    const liberar = await travar(arquivo);
    try {
      let contadores = null;
      try {
        contadores = _Cofre.abrir(projeto, arquivo).contadores;
      } catch {
        contadores = null;
      }
      if (contadores === null) {
        rmSync(arquivo, { force: true });
      } else {
        const vazio = new _Cofre(resolve(projeto), arquivo);
        vazio.contadores = { ...contadores };
        vazio.salvar();
      }
      return true;
    } finally {
      liberar();
    }
  }
  carregar(c) {
    if (c.versao !== 1) throw new ErroCofre(msg().versaoCofre(String(c.versao)));
    this.criadoEm = c.criadoEm;
    this.contadores = { ...c.contadores };
    for (const [token, entrada] of Object.entries(c.entradas)) {
      this.porToken.set(token, entrada);
      this.porValor.set(chaveValor(entrada.tipo, entrada.valor), token);
    }
  }
  get tamanho() {
    return this.porToken.size;
  }
  get modificado() {
    return this.alterado;
  }
  /** Token já atribuído a um valor, ou um novo token. */
  tokenPara(valor, tipo) {
    const chave = chaveValor(tipo, valor);
    const existente = this.porValor.get(chave);
    if (existente) return existente;
    const n = (this.contadores[tipo] ?? 0) + 1;
    this.contadores[tipo] = n;
    const token = `[${tipo}_${n}]`;
    this.porToken.set(token, { valor, tipo });
    this.porValor.set(chave, token);
    this.alterado = true;
    return token;
  }
  valorDe(token) {
    return this.porToken.get(token)?.valor;
  }
  tokenExistente(valor, tipo) {
    return this.porValor.get(chaveValor(tipo, valor));
  }
  /** Valores conhecidos, para a detecção literal em textos futuros. */
  conhecidos() {
    return [...this.porToken.values()].map((e) => ({ valor: e.valor, tipo: e.tipo }));
  }
  /** Contagem de entradas por tipo (sem expor valores). */
  resumo() {
    const r = {};
    for (const e of this.porToken.values()) r[e.tipo] = (r[e.tipo] ?? 0) + 1;
    return r;
  }
  static ehToken(texto) {
    return RE_TOKEN.test(texto);
  }
  salvar() {
    const conteudo = {
      versao: 1,
      projeto: this.projeto,
      criadoEm: this.criadoEm,
      contadores: this.contadores,
      entradas: Object.fromEntries(this.porToken)
    };
    const dados = cifrar(Buffer.from(JSON.stringify(conteudo), "utf8"), obterMaterialChave());
    garantirDiretorio(dirname(this.arquivo));
    const temporario = `${this.arquivo}.${process.pid}.${randomBytes2(4).toString("hex")}.tmp`;
    writeFileSync(temporario, dados, { mode: 384 });
    renameSync(temporario, this.arquivo);
    try {
      chmodSync(this.arquivo, 384);
    } catch {
    }
    this.alterado = false;
  }
};
function chaveValor(tipo, valor) {
  return `${tipo}\0${valor}`;
}
var ESPERA_MAXIMA_MS = 8e3;
var TRAVA_VENCIDA_MS = 15e3;
async function travar(arquivo) {
  const dir = `${arquivo}.trava`;
  garantirDiretorio(dirname(arquivo));
  const inicio = Date.now();
  for (; ; ) {
    try {
      mkdirSync(dir);
      return () => {
        try {
          rmdirSync(dir);
        } catch {
        }
      };
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      try {
        if (Date.now() - statSync(dir).mtimeMs > TRAVA_VENCIDA_MS) {
          rmdirSync(dir);
          continue;
        }
      } catch {
        continue;
      }
      if (Date.now() - inicio > ESPERA_MAXIMA_MS) throw new ErroCofre(msg().travaEsgotada());
      await new Promise((r) => setTimeout(r, 15 + Math.random() * 35));
    }
  }
}

// src/config.ts
import { existsSync as existsSync2, readFileSync as readFileSync2 } from "node:fs";
import { join as join2, resolve as resolve2 } from "node:path";
var CONFIG_PADRAO = {
  ativo: true,
  termos: [],
  nomes: [],
  empresas: [],
  prenomes: [],
  ignorar: [],
  tiposDesativados: [],
  prompt: "bloquear",
  bloquearArquivosBinarios: true,
  desmascararBash: true,
  idioma: "auto"
};
function arquivosDeConfig(projeto) {
  return [join2(diretorioBase(), "config.json"), join2(resolve2(projeto), ".piiveil", "config.json")];
}
var CHAVES = {
  enabled: "ativo",
  ativo: "ativo",
  terms: "termos",
  termos: "termos",
  names: "nomes",
  nomes: "nomes",
  companies: "empresas",
  empresas: "empresas",
  firstNames: "prenomes",
  prenomes: "prenomes",
  ignore: "ignorar",
  ignorar: "ignorar",
  disabledTypes: "tiposDesativados",
  tiposDesativados: "tiposDesativados",
  prompt: "prompt",
  blockBinaryFiles: "bloquearArquivosBinarios",
  bloquearArquivosBinarios: "bloquearArquivosBinarios",
  unmaskBash: "desmascararBash",
  desmascararBash: "desmascararBash",
  language: "idioma",
  idioma: "idioma"
};
var LISTAS = /* @__PURE__ */ new Set(["termos", "nomes", "empresas", "prenomes", "ignorar"]);
var BOOLEANOS = /* @__PURE__ */ new Set(["ativo", "bloquearArquivosBinarios", "desmascararBash"]);
var COMENTARIOS = /* @__PURE__ */ new Set(["$comment", "$comentario", "$schema"]);
var MODOS_PROMPT = {
  block: "bloquear",
  bloquear: "bloquear",
  warn: "avisar",
  avisar: "avisar",
  off: "desligado",
  desligado: "desligado"
};
var TIPOS_ANTIGOS = {
  PESSOA: "PERSON",
  EMPRESA: "COMPANY",
  TELEFONE: "PHONE",
  CARTAO: "CARD",
  PROCESSO: "CASE",
  TERMO: "TERM"
};
function carregarConfig(projeto) {
  const config = structuredClone(CONFIG_PADRAO);
  const avisos = [];
  const lidos = [];
  const objetos = [];
  const problemas = [];
  for (const arquivo of arquivosDeConfig(projeto)) {
    if (!existsSync2(arquivo)) continue;
    let bruto;
    try {
      bruto = JSON.parse(readFileSync2(arquivo, "utf8"));
    } catch {
      problemas.push([arquivo, "json"]);
      continue;
    }
    if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) {
      problemas.push([arquivo, "objeto"]);
      continue;
    }
    objetos.push([arquivo, bruto]);
  }
  let idiomaEscolhido = "auto";
  for (const [, o] of objetos) {
    const v = idiomaDaConfig(o.language ?? o.idioma);
    if (v) idiomaEscolhido = v;
  }
  definirIdioma(idiomaEscolhido);
  for (const [arquivo, tipo] of problemas) avisos.push(tipo === "json" ? msg().jsonInvalido(arquivo) : msg().esperadoObjeto(arquivo));
  for (const [arquivo, o] of objetos) {
    lidos.push(arquivo);
    aplicar(config, o, arquivo, avisos);
  }
  config.idioma = idiomaEscolhido;
  return { config, avisos, arquivos: lidos };
}
function aplicar(config, bruto, arquivo, avisos) {
  for (const [chave, valor] of Object.entries(bruto)) {
    if (COMENTARIOS.has(chave)) continue;
    const campo = CHAVES[chave];
    if (!campo) {
      avisos.push(msg().opcaoDesconhecida(arquivo, chave));
    } else if (LISTAS.has(campo)) {
      if (Array.isArray(valor) && valor.every((v) => typeof v === "string")) {
        config[campo].push(...valor);
      } else avisos.push(msg().esperadaLista(arquivo, chave));
    } else if (campo === "tiposDesativados") {
      const tipos = Array.isArray(valor) ? valor.map((v) => typeof v === "string" ? TIPOS_ANTIGOS[v] ?? v : v) : null;
      if (tipos && tipos.every((v) => TIPOS.includes(v))) {
        config.tiposDesativados.push(...tipos);
      } else avisos.push(msg().tiposValidos(arquivo, chave, TIPOS.join(", ")));
    } else if (campo === "prompt") {
      const modo = typeof valor === "string" ? MODOS_PROMPT[valor] : void 0;
      if (modo) config.prompt = modo;
      else avisos.push(msg().promptValido(arquivo));
    } else if (BOOLEANOS.has(campo)) {
      if (typeof valor === "boolean") config[campo] = valor;
      else avisos.push(msg().booleanoValido(arquivo, chave));
    } else if (campo === "idioma") {
      if (!idiomaDaConfig(valor)) avisos.push(msg().idiomaValido(arquivo));
    }
  }
}
function idiomaDaConfig(v) {
  if (typeof v !== "string") return void 0;
  if (v.trim().toLowerCase() === "auto") return "auto";
  return /^(en|pt)([-_].*)?$/i.test(v.trim()) ? normalizarIdioma(v) : void 0;
}
function opcoesDeteccao(config) {
  return {
    termos: config.termos,
    nomes: config.nomes,
    empresas: config.empresas,
    prenomes: config.prenomes,
    ignorar: config.ignorar,
    tiposDesativados: config.tiposDesativados
  };
}
function pastaDoProjeto(cwd) {
  return resolve2(process.env.CLAUDE_PROJECT_DIR || cwd || process.cwd());
}

// src/detectors/validacao.ts
function somenteDigitos(valor) {
  return valor.replace(/\D/g, "");
}
function todosIguais(valor) {
  return /^(.)\1*$/.test(valor);
}
function validarCPF(valor) {
  const d = somenteDigitos(valor);
  if (d.length !== 11 || todosIguais(d)) return false;
  const calc = (base, pesoInicial) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (pesoInicial - i);
    const resto = soma * 10 % 11;
    return resto === 10 ? 0 : resto;
  };
  const dv1 = calc(d.slice(0, 9), 10);
  const dv2 = calc(d.slice(0, 10), 11);
  return dv1 === Number(d[9]) && dv2 === Number(d[10]);
}
function valorCaractereCNPJ(c) {
  return c.charCodeAt(0) - 48;
}
function validarCNPJ(valor) {
  const c = valor.toUpperCase().replace(/[.\/\-\s]/g, "");
  if (!/^[0-9A-Z]{12}\d{2}$/.test(c) || todosIguais(c)) return false;
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const dv = (base, pesos) => {
    let soma = 0;
    for (let i = 0; i < pesos.length; i++) soma += valorCaractereCNPJ(base[i]) * pesos[i];
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const dv1 = dv(c.slice(0, 12), pesos1);
  const dv2 = dv(c.slice(0, 12) + String(dv1), pesos2);
  return dv1 === Number(c[12]) && dv2 === Number(c[13]);
}
function validarLuhn(valor) {
  const d = somenteDigitos(valor);
  if (d.length < 12 || todosIguais(d)) return false;
  let soma = 0;
  let dobrar = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i]);
    if (dobrar) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    soma += n;
    dobrar = !dobrar;
  }
  return soma % 10 === 0;
}
function validarCartao(valor) {
  const d = somenteDigitos(valor);
  if (d.length < 13 || d.length > 19) return false;
  if (!/^[2-6]/.test(d)) return false;
  return validarLuhn(d);
}
function validarProcessoCNJ(valor) {
  const d = somenteDigitos(valor);
  if (d.length !== 20) return false;
  const n = d.slice(0, 7);
  const dv = d.slice(7, 9);
  const resto = d.slice(9);
  const justica = Number(d[13]);
  if (justica < 1 || justica > 9) return false;
  return BigInt(n + resto + dv) % 97n === 1n;
}
function validarPIS(valor) {
  const d = somenteDigitos(valor);
  if (d.length !== 11 || todosIguais(d)) return false;
  const pesos = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let soma = 0;
  for (let i = 0; i < 10; i++) soma += Number(d[i]) * pesos[i];
  const r = 11 - soma % 11;
  const dv = r >= 10 ? 0 : r;
  return dv === Number(d[10]);
}
function validarCEP(valor) {
  const d = somenteDigitos(valor);
  return d.length === 8 && !/^0{8}$/.test(d);
}
var UFS = /* @__PURE__ */ new Set([
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO"
]);
var DDDS = /* @__PURE__ */ new Set([
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  21,
  22,
  24,
  27,
  28,
  31,
  32,
  33,
  34,
  35,
  37,
  38,
  41,
  42,
  43,
  44,
  45,
  46,
  47,
  48,
  49,
  51,
  53,
  54,
  55,
  61,
  62,
  63,
  64,
  65,
  66,
  67,
  68,
  69,
  71,
  73,
  74,
  75,
  77,
  79,
  81,
  82,
  83,
  84,
  85,
  86,
  87,
  88,
  89,
  91,
  92,
  93,
  94,
  95,
  96,
  97,
  98,
  99
]);
function validarTelefone(ddd, local) {
  const l = somenteDigitos(local);
  if (ddd !== void 0 && !DDDS.has(Number(ddd))) return false;
  if (l.length === 9) return l[0] === "9" && !todosIguais(l.slice(1));
  if (l.length === 8) return /^[2-5]/.test(l) && !todosIguais(l);
  return false;
}

// src/detectors/documentos.ts
var ANTES = String.raw`(?<![\p{L}\p{N}])(?<![\p{N}][.\/-])`;
var DEPOIS = String.raw`(?![\p{L}\p{N}])(?![.\/-][\p{N}])`;
function re(corpo, flags = "gu") {
  return new RegExp(ANTES + corpo + DEPOIS, flags);
}
function coletar(texto, expressao, tipo, validar, grupo = 0) {
  const achados = [];
  const rx = new RegExp(expressao.source, expressao.flags.includes("d") ? expressao.flags : expressao.flags + "d");
  for (const m of texto.matchAll(rx)) {
    if (!validar(m)) continue;
    const indices = m.indices?.[grupo];
    if (!indices) continue;
    const [inicio, fim] = indices;
    achados.push({ tipo, inicio, fim, valor: texto.slice(inicio, fim) });
  }
  return achados;
}
function detectarCPF(texto) {
  return coletar(texto, re(String.raw`\d{3}\.?\d{3}\.?\d{3}[-.]?\d{2}`), "CPF", (m) => validarCPF(m[0]));
}
function detectarCNPJ(texto) {
  const numerico = re(String.raw`\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}`);
  const alfanumerico = re(String.raw`[0-9A-Z]{2}\.[0-9A-Z]{3}\.[0-9A-Z]{3}\/[0-9A-Z]{4}-\d{2}`);
  return [
    ...coletar(texto, numerico, "CNPJ", (m) => validarCNPJ(m[0])),
    ...coletar(texto, alfanumerico, "CNPJ", (m) => /[A-Z]/.test(m[0]) && validarCNPJ(m[0]))
  ];
}
function detectarEmail(texto) {
  const rx = new RegExp("(?<![\\p{L}\\p{N}._%+-])[\\p{L}\\p{N}._%+-]+@[\\p{L}\\p{N}-]+(?:\\.[\\p{L}\\p{N}-]+)*\\.\\p{L}{2,}(?![\\p{L}\\p{N}])", "gu");
  return coletar(texto, rx, "EMAIL", (m) => !m[0].startsWith(".") && !m[0].includes(".."));
}
var PALAVRA_TELEFONE = /(?:tel(?:efone)?|fone|cel(?:ular)?|whats(?:app)?|contato|fax)\.?\s*[:\-]?\s*$/iu;
function detectarTelefone(texto) {
  const rx = re(
    String.raw`(?<int>\+\s?55[\s.-]?)?(?:(?:\((?<ddd1>0?\d{2})\)|(?<ddd2>0?\d{2}))(?<sep1>[\s.-]?))?(?<a>(?:9[\s.]?)?\d{4})(?<sep2>[\s.-]?)(?<b>\d{4})`
  );
  return coletar(texto, rx, "PHONE", (m) => {
    const g = m.groups ?? {};
    const dddBruto = g.ddd1 ?? g.ddd2;
    const ddd = dddBruto ? dddBruto.replace(/^0/, "") : void 0;
    const local = (g.a ?? "") + (g.b ?? "");
    if (!validarTelefone(ddd, local)) return false;
    const temParenteses = g.ddd1 !== void 0;
    const temSeparador = (g.sep2 ?? "") !== "" || /[\s.]/.test(g.a ?? "");
    const temInternacional = g.int !== void 0;
    if (ddd === void 0) {
      const antes = texto.slice(Math.max(0, m.index - 25), m.index);
      return temSeparador && PALAVRA_TELEFONE.test(antes);
    }
    if (temParenteses || temInternacional || temSeparador) return true;
    return local.replace(/\D/g, "").length === 9 && (g.sep1 ?? "") === "";
  });
}
function detectarCEP(texto) {
  const formatado = re(String.raw`(?:\d{5}-\d{3}|\d{2}\.\d{3}-\d{3})`);
  const comPalavra = /(?<![\p{L}])CEP\s*(?:n[º°o.]*\s*)?[:\-]?\s*(\d{8})(?![\p{N}])/giu;
  return [
    ...coletar(texto, formatado, "CEP", (m) => validarCEP(m[0])),
    ...coletar(texto, comPalavra, "CEP", (m) => validarCEP(m[1] ?? ""), 1)
  ];
}
function detectarCartao(texto) {
  const agrupado = re(String.raw`\d{4}(?<s>[ -]?)\d{4}\k<s>\d{4}\k<s>\d{4}(?:\k<s>\d{1,3})?`);
  const amex = re(String.raw`\d{4}(?<s>[ -])\d{6}\k<s>\d{4,5}`);
  const corrido = re(String.raw`\d{13,19}`);
  return [
    ...coletar(texto, agrupado, "CARD", (m) => validarCartao(m[0])),
    ...coletar(texto, amex, "CARD", (m) => validarCartao(m[0])),
    ...coletar(texto, corrido, "CARD", (m) => validarCartao(m[0]))
  ];
}
function detectarProcessoCNJ(texto) {
  const formatado = re(String.raw`\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}`);
  const corrido = re(String.raw`\d{20}`);
  return [
    ...coletar(texto, formatado, "CASE", (m) => validarProcessoCNJ(m[0])),
    ...coletar(texto, corrido, "CASE", (m) => validarProcessoCNJ(m[0]))
  ];
}
function detectarOAB(texto) {
  const numero = String.raw`\d{1,3}\.\d{3}|\d{2,6}`;
  const ufAntes = new RegExp(
    String.raw`(?<![\p{L}])OAB\s*[\/\-–]?\s*(?<uf>[A-Z]{2})\s*(?:n[º°o.]*\s*)?[:\-]?\s*(?:${numero})(?:-?[A-Z])?(?![\p{L}\p{N}])`,
    "gu"
  );
  const ufDepois = new RegExp(
    String.raw`(?<![\p{L}])OAB\s*(?:n[º°o.]*\s*)?[:\-]?\s*(?:${numero})(?:-?[A-Z])?\s*[\/\-–]\s*(?<uf>[A-Z]{2})(?![\p{L}\p{N}])`,
    "gu"
  );
  const ufValida = (m) => UFS.has(m.groups?.uf ?? "");
  return [...coletar(texto, ufAntes, "OAB", ufValida), ...coletar(texto, ufDepois, "OAB", ufValida)];
}
function detectarPIS(texto) {
  const formatado = re(String.raw`\d{3}\.\d{5}\.\d{2}-\d`);
  const comPalavra = /(?<![\p{L}])(?:PIS|PASEP|NIS|NIT)(?:\s*\/\s*PASEP)?\s*(?:n[º°o.]*\s*)?[:\-]?\s*(\d{3}\.?\d{5}\.?\d{2}-?\d)(?![\p{N}])/gu;
  return [
    ...coletar(texto, formatado, "PIS", (m) => validarPIS(m[0])),
    ...coletar(texto, comPalavra, "PIS", (m) => validarPIS(m[1] ?? ""), 1)
  ];
}
function detectarRG(texto) {
  const formatado = re(String.raw`\d{1,2}\.\d{3}\.\d{3}-[\dXx]`);
  const comPalavra = /(?<![\p{L}])(?:RG|R\.G\.|Registro Geral|C[ée]dula de Identidade)\s*(?:n[º°o.]*\s*)?[:\-]?\s*(\d[\d.\-]{3,12}[\dXx])(?![\p{L}\p{N}])/giu;
  return [
    ...coletar(texto, formatado, "RG", () => true),
    ...coletar(texto, comPalavra, "RG", (m) => (m[1] ?? "").replace(/\D/g, "").length >= 5, 1)
  ];
}

// src/detectors/dados/prenomes.ts
var PRENOMES = [
  // Femininos
  "maria",
  "ana",
  "francisca",
  "antonia",
  "adriana",
  "juliana",
  "marcia",
  "fernanda",
  "patricia",
  "aline",
  "sandra",
  "camila",
  "amanda",
  "bruna",
  "jessica",
  "leticia",
  "julia",
  "luciana",
  "vanessa",
  "mariana",
  "gabriela",
  "vera",
  "vitoria",
  "larissa",
  "claudia",
  "beatriz",
  "rita",
  "luana",
  "sonia",
  "renata",
  "eliane",
  "josefa",
  "simone",
  "natalia",
  "cristiane",
  "carla",
  "debora",
  "rosangela",
  "jaqueline",
  "rosa",
  "daniela",
  "aparecida",
  "marlene",
  "terezinha",
  "raimunda",
  "andreia",
  "fabiana",
  "lucia",
  "raquel",
  "angela",
  "rafaela",
  "joana",
  "luzia",
  "elaine",
  "daniele",
  "regina",
  "sabrina",
  "silvia",
  "tatiane",
  "michele",
  "isabela",
  "isabel",
  "priscila",
  "carolina",
  "bianca",
  "alessandra",
  "kelly",
  "cristina",
  "tais",
  "thais",
  "monica",
  "denise",
  "helena",
  "alice",
  "laura",
  "valentina",
  "sophia",
  "sofia",
  "manuela",
  "heloisa",
  "lorena",
  "livia",
  "giovanna",
  "giovana",
  "yasmin",
  "lara",
  "cecilia",
  "eduarda",
  "clara",
  "lais",
  "marina",
  "nicole",
  "rebeca",
  "esther",
  "ester",
  "agatha",
  "isadora",
  "melissa",
  "emanuelly",
  "pietra",
  "milena",
  "elisa",
  "antonella",
  "catarina",
  "olivia",
  "luiza",
  "luisa",
  "lavinia",
  "stella",
  "estela",
  "eloa",
  "aurora",
  "allana",
  "ayla",
  "liz",
  "malu",
  "mirella",
  "barbara",
  "carina",
  "cintia",
  "edna",
  "elisangela",
  "edilene",
  "fatima",
  "gisele",
  "graziela",
  "ingrid",
  "ivone",
  "jussara",
  "karina",
  "katia",
  "lilian",
  "lucimara",
  "madalena",
  "marta",
  "neide",
  "noemi",
  "odete",
  "paula",
  "roberta",
  "rosana",
  "rosilene",
  "selma",
  "solange",
  "suelen",
  "tania",
  "tereza",
  "teresa",
  "valeria",
  "viviane",
  "zilda",
  "irene",
  "iracema",
  "glaucia",
  "gloria",
  "graca",
  "conceicao",
  "dalva",
  "dulce",
  "elza",
  "fabiola",
  "flavia",
  "jordana",
  "kamila",
  "keila",
  "marcela",
  "micaela",
  "nadia",
  "nathalia",
  "neusa",
  "nilza",
  "olga",
  "pamela",
  "poliana",
  "rosemary",
  "sara",
  "sarah",
  "silvana",
  "susana",
  "suzana",
  "talita",
  "thaynara",
  "veronica",
  "vilma",
  "yara",
  "zuleica",
  "ariane",
  "aurea",
  "benedita",
  "celia",
  "cleide",
  "creusa",
  "dayane",
  "diana",
  "elen",
  "ellen",
  "emilia",
  "erica",
  "erika",
  "eva",
  "geovana",
  "helen",
  "hellen",
  "ilda",
  "ines",
  "jaine",
  "jamile",
  "jenifer",
  "joyce",
  "juliane",
  "kaline",
  "lidia",
  "lucilene",
  "mayara",
  "nayara",
  "rayane",
  "samara",
  "tamires",
  "tatiana",
  "thalita",
  // Masculinos
  "jose",
  "joao",
  "antonio",
  "francisco",
  "carlos",
  "paulo",
  "pedro",
  "lucas",
  "luiz",
  "luis",
  "marcos",
  "gabriel",
  "rafael",
  "daniel",
  "marcelo",
  "bruno",
  "eduardo",
  "felipe",
  "raimundo",
  "rodrigo",
  "manoel",
  "manuel",
  "mateus",
  "matheus",
  "andre",
  "fernando",
  "fabio",
  "leonardo",
  "gustavo",
  "guilherme",
  "leandro",
  "tiago",
  "thiago",
  "anderson",
  "ricardo",
  "marcio",
  "jorge",
  "sebastiao",
  "alexandre",
  "roberto",
  "edson",
  "diego",
  "vitor",
  "victor",
  "sergio",
  "claudio",
  "joaquim",
  "renato",
  "vinicius",
  "geraldo",
  "adriano",
  "luciano",
  "julio",
  "renan",
  "alex",
  "vagner",
  "wagner",
  "jefferson",
  "flavio",
  "cicero",
  "miguel",
  "arthur",
  "artur",
  "heitor",
  "bernardo",
  "davi",
  "david",
  "theo",
  "lorenzo",
  "samuel",
  "enzo",
  "benjamin",
  "nicolas",
  "henrique",
  "isaac",
  "murilo",
  "lorenzo",
  "joaquim",
  "caua",
  "vicente",
  "caio",
  "otavio",
  "bento",
  "antony",
  "emanuel",
  "benicio",
  "ravi",
  "noah",
  "anthony",
  "levi",
  "augusto",
  "benedito",
  "caetano",
  "cesar",
  "cristiano",
  "denis",
  "domingos",
  "edgar",
  "elias",
  "emerson",
  "evandro",
  "everton",
  "fabricio",
  "gilberto",
  "gilmar",
  "givaldo",
  "hugo",
  "igor",
  "ivan",
  "jair",
  "jairo",
  "jeferson",
  "joel",
  "jonas",
  "jonathan",
  "josue",
  "juliano",
  "junior",
  "kleber",
  "leonel",
  "lourenco",
  "marcelino",
  "mario",
  "mauricio",
  "mauro",
  "milton",
  "moises",
  "nelson",
  "nilton",
  "orlando",
  "osvaldo",
  "oswaldo",
  "patrick",
  "rafael",
  "reginaldo",
  "reinaldo",
  "ronaldo",
  "rogerio",
  "ruan",
  "rubens",
  "silvio",
  "valdir",
  "valter",
  "walter",
  "washington",
  "wellington",
  "wesley",
  "willian",
  "william",
  "wilson",
  "yuri",
  "alan",
  "allan",
  "alberto",
  "alfredo",
  "alisson",
  "almir",
  "aloisio",
  "amaro",
  "anselmo",
  "aurelio",
  "baltazar",
  "benedicto",
  "bruno",
  "camilo",
  "celso",
  "clayton",
  "cleber",
  "cristian",
  "danilo",
  "decio",
  "dirceu",
  "edivaldo",
  "edmilson",
  "eduardo",
  "eliseu",
  "erick",
  "erico",
  "ernesto",
  "fagner",
  "fausto",
  "felix",
  "frederico",
  "genival",
  "gerson",
  "gileno",
  "glauber",
  "heitor",
  "helio",
  "hamilton",
  "iago",
  "ismael",
  "jadson",
  "jailson",
  "jaime",
  "jean",
  "joaquim",
  "jonatas",
  "josias",
  "kaique",
  "kauan",
  "kevin",
  "lauro",
  "lazaro",
  "luan",
  "marcus",
  "mariano",
  "max",
  "nathan",
  "natan",
  "nivaldo",
  "otavio",
  "pablo",
  "raul",
  "ricardo",
  "robson",
  "romulo",
  "sandro",
  "saulo",
  "severino",
  "tarcisio",
  "teodoro",
  "tomas",
  "thomas",
  "ubirajara",
  "ulisses",
  "vanderlei",
  "wanderley",
  "zacarias",
  "zeca"
];

// src/detectors/normalizar.ts
function normalizarPalavra(palavra) {
  return palavra.normalize("NFD").replace(new RegExp("\\p{M}", "gu"), "").toLowerCase();
}
function escaparRegex(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&");
}

// src/detectors/nomes.ts
var TITULO = String.raw`\p{Lu}\p{Ll}+(?:-\p{Lu}\p{Ll}+)*`;
var CAIXA_ALTA = String.raw`\p{Lu}{2,}(?:-\p{Lu}{2,})*`;
var PALAVRA = `(?:${TITULO}|${CAIXA_ALTA})`;
var PARTICULA = String.raw`(?:d[aeo]s?|D[AEO]S?|di|du|del|della|van|von|der)`;
var SEQUENCIA = new RegExp(
  String.raw`(?<![\p{L}\p{N}_])${PALAVRA}(?:[ \u00A0](?:${PARTICULA}[ \u00A0])?${PALAVRA})*(?![\p{L}\p{N}_])`,
  "gu"
);
var PALAVRA_SOLTA = new RegExp(`${PALAVRA}|${PARTICULA}`, "gu");
var RE_PARTICULA = new RegExp(`^${PARTICULA}$`, "u");
var CORTE = new Set(
  [
    "cpf",
    "rg",
    "cnpj",
    "oab",
    "cep",
    "pis",
    "nis",
    "ctps",
    "cnh",
    "ltda",
    "eireli",
    "epp",
    "mei",
    "brasileiro",
    "brasileira",
    "estrangeiro",
    "estrangeira",
    "solteiro",
    "solteira",
    "casado",
    "casada",
    "divorciado",
    "divorciada",
    "viuvo",
    "viuva",
    "separado",
    "separada",
    "portador",
    "portadora",
    "inscrito",
    "inscrita",
    "residente",
    "domiciliado",
    "domiciliada",
    "nascido",
    "nascida",
    "maior",
    "menor",
    "contratante",
    "contratantes",
    "contratada",
    "contratado",
    "contratadas",
    "autor",
    "autora",
    "autores",
    "reu",
    "re",
    "reus",
    "requerente",
    "requerido",
    "requerida",
    "exequente",
    "executado",
    "executada",
    "impetrante",
    "impetrado",
    "reclamante",
    "reclamada",
    "reclamado",
    "apelante",
    "apelado",
    "apelada",
    "agravante",
    "agravado",
    "agravada",
    "embargante",
    "embargado",
    "embargada",
    "interessado",
    "interessada",
    "advogado",
    "advogada",
    "procurador",
    "procuradora",
    "doutor",
    "doutora",
    "dr",
    "dra",
    "sr",
    "sra",
    "srta",
    "senhor",
    "senhora",
    "dona",
    "dom",
    "prof",
    "profa",
    "professor",
    "professora",
    "eng",
    "engenheiro",
    "engenheira",
    "testemunha",
    "testemunhas",
    "paciente",
    "medico",
    "medica",
    "enfermeiro",
    "enfermeira",
    "cliente",
    "locador",
    "locadora",
    "locatario",
    "locataria",
    "fiador",
    "fiadora",
    "vendedor",
    "vendedora",
    "comprador",
    "compradora",
    "outorgante",
    "outorgado",
    "outorgada",
    "credor",
    "credora",
    "devedor",
    "devedora",
    "responsavel",
    "representante",
    "socio",
    "socia",
    "administrador",
    "administradora",
    "diretor",
    "diretora",
    "gerente",
    "presidente",
    "assinatura",
    "nome",
    "filiacao",
    "pai",
    "mae",
    "conjuge",
    "esposa",
    "esposo",
    "janeiro",
    "fevereiro",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
    "segunda",
    "terca",
    "quarta",
    "quinta",
    "sexta",
    "sabado",
    "domingo",
    "clausula",
    "artigo",
    "art",
    "paragrafo",
    "inciso",
    "capitulo",
    "secao",
    "anexo",
    "item",
    "contrato",
    "termo",
    "laudo",
    "parecer",
    "relatorio",
    "atestado",
    "procuracao",
    "declaracao",
    "certidao",
    "pessoa",
    "empresa",
    "termo",
    "processo",
    "telefone",
    "email"
  ].map(normalizarPalavra)
);
var LUGAR = new Set(
  [
    "sao",
    "santa",
    "santo",
    "rua",
    "r",
    "avenida",
    "av",
    "travessa",
    "alameda",
    "praca",
    "rodovia",
    "estrada",
    "largo",
    "bairro",
    "vila",
    "jardim",
    "parque",
    "cidade",
    "edificio",
    "condominio",
    "conjunto",
    "residencial",
    "loteamento",
    "hospital",
    "clinica",
    "escola",
    "colegio",
    "universidade",
    "faculdade",
    "fazenda",
    "sitio",
    "chacara",
    "lei",
    "decreto",
    "banco",
    "instituto",
    "fundacao",
    "associacao",
    "igreja",
    "paroquia",
    "capela",
    "ponte",
    "porto",
    "rio",
    "lago",
    "monte",
    "serra",
    "ilha",
    "estado",
    "municipio",
    "comarca",
    "vara",
    "tribunal",
    "forum",
    "cartorio",
    "tabelionato",
    "camara",
    "senado",
    "ministerio",
    "secretaria",
    "prefeitura",
    "governo",
    "delegacia",
    "aeroporto",
    "estadio",
    "shopping",
    "teatro",
    "museu",
    "biblioteca",
    "ginasio",
    "centro",
    "nucleo",
    "unidade",
    "posto",
    "terminal",
    "estacao",
    "rodoviaria"
  ].map(normalizarPalavra)
);
var TRATAMENTO = /(?:^|[^\p{L}])(?:Sr|Sra|Srta|Dr|Dra|Dom|Dona|Prof|Profa|Exmo|Exma|Ilmo|Ilma|Sr\(a\))\.?[ \u00A0]$/u;
function criarDetectorNomes(opcoes = {}) {
  const prenomes = new Set(PRENOMES);
  for (const p of opcoes.prenomesExtras ?? []) prenomes.add(normalizarPalavra(p.trim()));
  return function detectarNomes(texto) {
    const achados = [];
    for (const m of texto.matchAll(SEQUENCIA)) {
      const base = m.index;
      const palavras = [];
      for (const p of m[0].matchAll(PALAVRA_SOLTA)) {
        palavras.push({
          texto: p[0],
          inicio: base + p.index,
          fim: base + p.index + p[0].length,
          particula: RE_PARTICULA.test(p[0])
        });
      }
      for (const trecho of dividirEmTrechos(palavras)) {
        const achado = extrairNome(texto, trecho, prenomes);
        if (achado) achados.push(achado);
      }
    }
    return achados;
  };
}
function dividirEmTrechos(palavras) {
  const trechos = [];
  let atual2 = [];
  let ignorandoLugar = false;
  for (const p of palavras) {
    const n = normalizarPalavra(p.texto);
    if (!p.particula && LUGAR.has(n)) {
      if (atual2.length) trechos.push(atual2);
      atual2 = [];
      ignorandoLugar = true;
      continue;
    }
    if (!p.particula && CORTE.has(n)) {
      if (atual2.length) trechos.push(atual2);
      atual2 = [];
      ignorandoLugar = false;
      continue;
    }
    if (ignorandoLugar) continue;
    atual2.push(p);
  }
  if (atual2.length) trechos.push(atual2);
  return trechos;
}
function extrairNome(texto, trecho, prenomes) {
  const inicio = trecho.findIndex((p) => !p.particula && prenomes.has(normalizarPalavra(p.texto)));
  if (inicio < 0) return null;
  let fim = trecho.length - 1;
  while (fim > inicio && trecho[fim]?.particula) fim--;
  const partes = trecho.slice(inicio, fim + 1).filter((p) => !p.particula);
  const primeira = trecho[inicio];
  const ultima = trecho[fim];
  if (partes.length < 2) {
    const antes = texto.slice(Math.max(0, primeira.inicio - 12), primeira.inicio);
    if (!TRATAMENTO.test(antes)) return null;
  }
  return {
    tipo: "PERSON",
    inicio: primeira.inicio,
    fim: ultima.fim,
    valor: texto.slice(primeira.inicio, ultima.fim)
  };
}

// src/detectors/empresas.ts
var PALAVRA2 = String.raw`[\p{Lu}\p{N}][\p{L}\p{N}&'’]*(?:-[\p{L}\p{N}]+)*`;
var LIGACAO = String.raw`(?:de|da|do|das|dos|e|&|DE|DA|DO|DAS|DOS|E|em|EM)`;
var SUFIXO_FORTE = String.raw`Ltda\.?|LTDA\.?|S\.\s?A\.?|S\/A|EIRELI|Eireli|SLU|S\.?L\.?U\.?`;
var SUFIXO_FRACO = String.raw`SA|ME|EPP`;
var RAZAO = new RegExp(
  String.raw`(?<![\p{L}\p{N}])(?<nome>${PALAVRA2}(?:[ \u00A0](?:${LIGACAO}[ \u00A0])?${PALAVRA2}){0,8})(?:[ \u00A0]?[-–,][ \u00A0]?|[ \u00A0])(?<sufixo>${SUFIXO_FORTE}|${SUFIXO_FRACO})(?![\p{L}\p{N}])`,
  "gud"
);
var INICIAIS_IGNORADAS = new Set(
  [
    "a",
    "o",
    "as",
    "os",
    "\xE0",
    "ao",
    "entre",
    "pela",
    "pelo",
    "com",
    "para",
    "de",
    "da",
    "do",
    "e",
    "que",
    "empresa",
    "sociedade",
    "contratante",
    "contratada",
    "contratado",
    "locador",
    "locadora",
    "locatario",
    "locataria",
    "vendedora",
    "vendedor",
    "compradora",
    "comprador",
    "cliente",
    "fornecedor",
    "fornecedora",
    "cedente",
    "cessionaria",
    "re",
    "reu",
    "autora",
    "autor",
    "requerida",
    "requerente",
    "reclamada",
    "executada",
    "exequente",
    "devedora",
    "credora",
    "fiadora",
    "outorgante",
    "outorgada",
    "denominada",
    "doravante",
    "razao",
    "social",
    "nome",
    "empresarial"
  ].map(normalizarPalavra)
);
function detectarEmpresas(texto) {
  const achados = [];
  for (const m of texto.matchAll(RAZAO)) {
    const nome = m.groups?.nome ?? "";
    const sufixo = m.groups?.sufixo ?? "";
    const idxNome = m.indices?.groups?.nome;
    const idxSufixo = m.indices?.groups?.sufixo;
    if (!idxNome || !idxSufixo) continue;
    const palavras = [...nome.matchAll(/\S+/gu)];
    let pular = 0;
    while (pular < palavras.length && INICIAIS_IGNORADAS.has(normalizarPalavra(palavras[pular]?.[0] ?? ""))) pular++;
    const restantes = palavras.slice(pular);
    if (restantes.length === 0) continue;
    if (/^(SA|ME|EPP)$/.test(sufixo) && restantes.length < 2) continue;
    if (!restantes.some((p) => new RegExp("\\p{L}{2,}", "u").test(p[0]))) continue;
    const inicio = idxNome[0] + (restantes[0]?.index ?? 0);
    const fim = idxSufixo[1];
    achados.push({ tipo: "COMPANY", inicio, fim, valor: texto.slice(inicio, fim) });
  }
  return achados;
}

// src/detectors/termos.ts
function criarDetectorTermos(termos, tipo) {
  const limpos = [...new Set(termos.map((t) => t.trim()).filter((t) => t.length > 0))];
  if (limpos.length === 0) return (_texto) => [];
  limpos.sort((a, b) => b.length - a.length);
  const rx = new RegExp(
    String.raw`(?<![\p{L}\p{N}])(?:${limpos.map(escaparRegex).join("|")})(?![\p{L}\p{N}])`,
    "giu"
  );
  return (texto) => [...texto.matchAll(rx)].map((m) => ({
    tipo,
    inicio: m.index,
    fim: m.index + m[0].length,
    valor: m[0]
  }));
}

// src/detectors/index.ts
var IGNORAR_PADRAO = ["Maria da Penha", "Claude Code"];
var PADRAO_TOKEN = new RegExp(String.raw`\[(?:${TIPOS.join("|")})_\d+\]`, "g");
function criarDetector(opcoes = {}) {
  const desativados = new Set(opcoes.tiposDesativados ?? []);
  const detectores = [
    ["CPF", detectarCPF],
    ["CNPJ", detectarCNPJ],
    ["EMAIL", detectarEmail],
    ["PHONE", detectarTelefone],
    ["CEP", detectarCEP],
    ["CARD", detectarCartao],
    ["CASE", detectarProcessoCNJ],
    ["OAB", detectarOAB],
    ["PIS", detectarPIS],
    ["RG", detectarRG],
    ["COMPANY", detectarEmpresas],
    ["PERSON", criarDetectorNomes({ prenomesExtras: opcoes.prenomes })]
  ];
  const listas = [
    criarDetectorTermos(opcoes.termos ?? [], "TERM"),
    criarDetectorTermos(opcoes.nomes ?? [], "PERSON"),
    criarDetectorTermos(opcoes.empresas ?? [], "COMPANY")
  ];
  const ignorar = new Set([...IGNORAR_PADRAO, ...opcoes.ignorar ?? []].map((t) => normalizarPalavra(t.trim())));
  const conhecidos = [...opcoes.conhecidos ?? []].filter((c) => c.valor.length > 0);
  conhecidos.sort((a, b) => b.valor.length - a.valor.length);
  return (texto) => {
    const candidatos = [];
    for (const [tipo, detector] of detectores) {
      if (desativados.has(tipo)) continue;
      candidatos.push(...detector(texto));
    }
    for (const detector of listas) candidatos.push(...detector(texto));
    for (const c of conhecidos) candidatos.push(...buscarLiteral(texto, c.valor, c.tipo));
    const tokens = [...texto.matchAll(PADRAO_TOKEN)].map((m) => [m.index, m.index + m[0].length]);
    const validos = candidatos.filter(
      (a) => !ignorar.has(normalizarPalavra(a.valor)) && !tokens.some(([i, f]) => a.inicio < f && i < a.fim)
    );
    return resolverSobreposicoes(validos);
  };
}
function buscarLiteral(texto, valor, tipo) {
  const achados = [];
  const primeiroEhPalavra = /[\p{L}\p{N}]/u.test(valor[0] ?? "");
  const ultimoEhPalavra = /[\p{L}\p{N}]/u.test(valor[valor.length - 1] ?? "");
  let pos = texto.indexOf(valor);
  while (pos >= 0) {
    const antes = texto[pos - 1] ?? "";
    const depois = texto[pos + valor.length] ?? "";
    const fronteiraAntes = !primeiroEhPalavra || !/[\p{L}\p{N}]/u.test(antes);
    const fronteiraDepois = !ultimoEhPalavra || !/[\p{L}\p{N}]/u.test(depois);
    if (fronteiraAntes && fronteiraDepois) {
      achados.push({ tipo, inicio: pos, fim: pos + valor.length, valor });
    }
    pos = texto.indexOf(valor, pos + 1);
  }
  return achados;
}
function resolverSobreposicoes(achados) {
  const ordenados = [...achados].sort((a, b) => {
    const p = PRIORIDADE[b.tipo] - PRIORIDADE[a.tipo];
    if (p !== 0) return p;
    const t = b.fim - b.inicio - (a.fim - a.inicio);
    if (t !== 0) return t;
    return a.inicio - b.inicio;
  });
  const aceitos = [];
  for (const a of ordenados) {
    if (aceitos.some((b) => a.inicio < b.fim && b.inicio < a.fim)) continue;
    aceitos.push(a);
  }
  return aceitos.sort((a, b) => a.inicio - b.inicio);
}

// src/pseudonimizar.ts
function mascarar(texto, cofre, opcoes = {}) {
  const detector = criarDetector({ ...opcoes, conhecidos: [...opcoes.conhecidos ?? [], ...cofre.conhecidos()] });
  const achados = detector(texto);
  const partes = [];
  const substituicoes = [];
  let pos = 0;
  for (const a of achados) {
    const token = cofre.tokenPara(a.valor, a.tipo);
    partes.push(texto.slice(pos, a.inicio), token);
    substituicoes.push({ token, achado: a });
    pos = a.fim;
  }
  partes.push(texto.slice(pos));
  return { texto: partes.join(""), achados, substituicoes };
}
function desmascarar(texto, cofre) {
  return texto.replace(PADRAO_TOKEN, (token) => cofre.valorDe(token) ?? token);
}
function tokensDesconhecidos(texto, cofre) {
  const r = /* @__PURE__ */ new Set();
  for (const m of texto.matchAll(PADRAO_TOKEN)) if (cofre.valorDe(m[0]) === void 0) r.add(m[0]);
  return [...r];
}
function desmascararProfundo(valor, cofre, transformar) {
  const f = transformar ?? ((s) => desmascarar(s, cofre));
  const visitar = (v) => {
    if (typeof v === "string") return f(v);
    if (Array.isArray(v)) return v.map(visitar);
    if (v && typeof v === "object") {
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, visitar(x)]));
    }
    return v;
  };
  return visitar(valor);
}

// src/versao.ts
var VERSAO = "0.1.0";

// src/hooks/comum.ts
function contexto(entrada) {
  const projeto = pastaDoProjeto(typeof entrada.cwd === "string" ? entrada.cwd : void 0);
  const { config, avisos } = carregarConfig(projeto);
  return { projeto, config, avisos };
}
function descreverErro(e) {
  if (e instanceof ErroCofre) return e.message;
  if (e instanceof Error) return msg().erroInterno(e.name);
  return msg().erroInterno();
}

// src/hooks/post-tool-use.ts
async function postToolUse(entrada) {
  const bruto = entrada.tool_response !== void 0 ? entrada.tool_response : entrada.tool_output;
  if (bruto === void 0 || bruto === null) return null;
  try {
    const ctx = contexto(entrada);
    if (!ctx.config.ativo) return null;
    const opcoes = opcoesDeteccao(ctx.config);
    const { valor, alterado } = await Cofre.comTrava(
      ctx.projeto,
      (cofre) => transformarTextos(bruto, (texto) => mascarar(texto, cofre, opcoes).texto)
    );
    if (!alterado) return null;
    return { hookSpecificOutput: { hookEventName: "PostToolUse", updatedToolOutput: valor } };
  } catch (e) {
    const aviso = msg().saidaOcultadaModelo(descreverErro(e));
    return {
      systemMessage: msg().saidaOcultadaUsuario(descreverErro(e)),
      hookSpecificOutput: { hookEventName: "PostToolUse", updatedToolOutput: ocultarTextos(bruto, aviso) }
    };
  }
}
function transformarTextos(valor, f) {
  let alterado = false;
  const visitar = (v) => {
    if (typeof v === "string") {
      if (v.length === 0) return v;
      const novo = f(v);
      if (novo !== v) alterado = true;
      return novo;
    }
    if (Array.isArray(v)) return v.map(visitar);
    if (v && typeof v === "object") {
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, visitar(x)]));
    }
    return v;
  };
  return { valor: visitar(valor), alterado };
}
var CAMPOS_PRESERVADOS = /* @__PURE__ */ new Set(["filePath", "file_path", "path", "notebook_path", "type", "mode", "url", "id"]);
function ocultarTextos(valor, aviso) {
  let avisou = false;
  const visitar = (v, chave) => {
    if (typeof v === "string") {
      if (chave !== void 0 && CAMPOS_PRESERVADOS.has(chave)) return v;
      if (/^[a-z_]{1,20}$/.test(v) || v.length === 0) return v;
      if (!avisou) {
        avisou = true;
        return aviso;
      }
      return "[piiveil: ocultado]";
    }
    if (Array.isArray(v)) return v.map((x) => visitar(x));
    if (v && typeof v === "object") {
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, visitar(x, k)]));
    }
    return v;
  };
  return visitar(valor);
}

// src/hooks/pre-tool-use.ts
import { extname } from "node:path";
var EXTENSOES_BINARIAS = /* @__PURE__ */ new Set([".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".tif", ".tiff", ".heic"]);
var PERIGOSOS_NO_SHELL = /[`$\\"'\n\r]/;
function negar(motivo) {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: motivo
    }
  };
}
async function preToolUse(entrada) {
  const ctx = contexto(entrada);
  if (!ctx.config.ativo) return null;
  const ferramenta = String(entrada.tool_name ?? "");
  const input = entrada.tool_input ?? {};
  const bloquearRead = (caminho) => ferramenta === "Read" && ctx.config.bloquearArquivosBinarios && EXTENSOES_BINARIAS.has(extname(caminho).toLowerCase()) ? negar(msg().binarioBloqueado()) : null;
  if (ferramenta === "Bash" && !ctx.config.desmascararBash) return null;
  const serializado = JSON.stringify(input);
  PADRAO_TOKEN.lastIndex = 0;
  const temToken = PADRAO_TOKEN.test(serializado);
  PADRAO_TOKEN.lastIndex = 0;
  if (!temToken) return bloquearRead(String(input.file_path ?? ""));
  let cofre;
  try {
    cofre = Cofre.abrir(ctx.projeto);
  } catch (e) {
    return negar(msg().cofreNaoAbriu(descreverErro(e)));
  }
  let novo;
  if (ferramenta === "Grep") {
    novo = { ...input };
    for (const [campo, valor] of Object.entries(input)) {
      if (typeof valor !== "string") continue;
      novo[campo] = campo === "pattern" ? valor.replace(PADRAO_TOKEN, (t) => {
        const real = cofre.valorDe(t);
        return real === void 0 ? t : escaparRegex(real);
      }) : desmascarar(valor, cofre);
    }
  } else if (ferramenta === "Bash") {
    const comando = String(input.command ?? "");
    for (const m of comando.matchAll(PADRAO_TOKEN)) {
      const real = cofre.valorDe(m[0]);
      if (real !== void 0 && PERIGOSOS_NO_SHELL.test(real)) {
        return negar(msg().valorPerigosoShell(m[0]));
      }
    }
    novo = desmascararProfundo(input, cofre);
  } else {
    novo = desmascararProfundo(input, cofre);
  }
  const bloqueio = bloquearRead(String(novo.file_path ?? ""));
  if (bloqueio) return bloqueio;
  if (JSON.stringify(novo) === serializado) return null;
  const desconhecidos = tokensDesconhecidos(serializado, cofre);
  const saida = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      updatedInput: novo,
      ...desconhecidos.length ? {
        additionalContext: msg().tokensDesconhecidos(desconhecidos.join(", "))
      } : {}
    }
  };
  return saida;
}

// src/hooks/message-display.ts
import { existsSync as existsSync3 } from "node:fs";
async function messageDisplay(entrada) {
  const texto = [entrada.delta, entrada.message_text, entrada.text].find((v) => typeof v === "string");
  if (!texto) return null;
  PADRAO_TOKEN.lastIndex = 0;
  if (!PADRAO_TOKEN.test(texto)) return null;
  PADRAO_TOKEN.lastIndex = 0;
  const ctx = contexto(entrada);
  if (!ctx.config.ativo || !existsSync3(caminhoDoCofre(ctx.projeto))) return null;
  try {
    const cofre = Cofre.abrir(ctx.projeto);
    const exibido = desmascarar(texto, cofre);
    if (exibido === texto) return null;
    return { hookSpecificOutput: { hookEventName: "MessageDisplay", displayContent: exibido } };
  } catch {
    return null;
  }
}

// src/hooks/user-prompt-submit.ts
var MAX_EXEMPLOS = 8;
async function userPromptSubmit(entrada) {
  const ctx = contexto(entrada);
  if (!ctx.config.ativo || ctx.config.prompt === "desligado") return null;
  const prompt = typeof entrada.prompt === "string" ? entrada.prompt : typeof entrada.prompt_text === "string" ? entrada.prompt_text : "";
  if (!prompt.trim() || prompt.trimStart().startsWith("/")) return null;
  let substituicoes;
  try {
    substituicoes = await Cofre.comTrava(
      ctx.projeto,
      (cofre) => mascarar(prompt, cofre, opcoesDeteccao(ctx.config)).substituicoes.map((s) => ({
        token: s.token,
        valor: s.achado.valor,
        tipo: s.achado.tipo
      }))
    );
  } catch (e) {
    if (ctx.config.prompt === "avisar") return { systemMessage: msg().promptNaoVerificadoAviso(descreverErro(e)) };
    return { decision: "block", reason: msg().promptNaoVerificadoBloqueio(descreverErro(e)) };
  }
  if (substituicoes.length === 0) return null;
  const unicos = [...new Map(substituicoes.map((s) => [s.token, s])).values()];
  const linhas = unicos.slice(0, MAX_EXEMPLOS).map((s) => msg().promptUseToken(s.valor, s.token));
  if (unicos.length > MAX_EXEMPLOS) linhas.push(msg().promptMais(unicos.length - MAX_EXEMPLOS));
  if (ctx.config.prompt === "avisar") {
    return { systemMessage: msg().promptAvisado(unicos.length) };
  }
  const motivo = [
    msg().promptComDados(unicos.length),
    msg().promptReescreva(),
    ...linhas,
    msg().promptArquivo()
  ].join("\n");
  return { decision: "block", reason: motivo };
}

// src/hooks/session-start.ts
var INSTRUCOES_MODELO = [
  "The piiveil plugin is active in this project: personal data in tool outputs has been replaced with tokens",
  "such as [PERSON_1], [CPF_2], [COMPANY_1], [EMAIL_3] and [CASE_1].",
  "Treat each token as the data itself. When writing files, editing or running commands, use the tokens exactly",
  "as they appear (brackets, uppercase and number included): they are replaced with the real values before",
  "execution, and the user sees the real values on screen. Do not try to discover, guess or reconstruct the",
  "original values, do not invent new tokens and do not change a token's number.",
  "Careful with the Edit tool: it checks that old_string exists in the file before tokens are replaced, so an",
  "old_string containing tokens is never found. Pick an old_string without tokens (nearby text that identifies",
  "the location unambiguously); new_string may contain tokens as usual. If no such text exists, rewrite the",
  "whole file with Write, using the tokens. Keep replying in the user's language."
].join(" ");
async function sessionStart(entrada) {
  const ctx = contexto(entrada);
  if (!ctx.config.ativo) return null;
  const saida = {
    hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: INSTRUCOES_MODELO }
  };
  if (ctx.avisos.length) saida.systemMessage = msg().problemasConfig(ctx.avisos.join("\n"));
  return saida;
}

// src/cli.ts
var HOOKS = {
  "post-tool-use": postToolUse,
  "pre-tool-use": preToolUse,
  "message-display": messageDisplay,
  "user-prompt-submit": userPromptSubmit,
  "session-start": sessionStart
};
function saidaDeFalha(evento, e) {
  const motivo = msg().falhaProcessar(descreverErro(e));
  if (evento === "post-tool-use") {
    return { continue: false, stopReason: msg().sessaoInterrompida(motivo), systemMessage: motivo };
  }
  if (evento === "pre-tool-use") {
    return { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: motivo } };
  }
  if (evento === "user-prompt-submit") return { decision: "block", reason: motivo };
  return null;
}
async function lerEntrada() {
  const partes = [];
  for await (const parte of process.stdin) partes.push(parte);
  return Buffer.concat(partes).toString("utf8");
}
async function executarHook(evento, json) {
  const hook = HOOKS[evento];
  if (!hook) throw new Error(`hook desconhecido: ${evento}`);
  try {
    const entrada = JSON.parse(json);
    return await hook(entrada);
  } catch (e) {
    return saidaDeFalha(evento, e);
  }
}
function argumento(args, nome) {
  const i = args.indexOf(nome);
  return i >= 0 ? args[i + 1] : void 0;
}
var CONFIG_EXEMPLO = {
  $comment: "piiveil settings for this project. Do not commit this folder.",
  terms: [],
  names: [],
  companies: [],
  firstNames: [],
  ignore: [],
  disabledTypes: [],
  prompt: "block",
  blockBinaryFiles: true,
  unmaskBash: true
};
var ALIASES = {
  limpar: "clear",
  mascarar: "mask",
  desmascarar: "unmask",
  ajuda: "help",
  "--help": "help",
  "-h": "help",
  versao: "version",
  "--version": "version"
};
async function main(args) {
  const [bruto, ...resto] = args;
  const comando = bruto === void 0 ? "help" : ALIASES[bruto] ?? bruto;
  const pasta = argumento(resto, "--project") ?? argumento(resto, "--projeto");
  const projeto = pastaDoProjeto(pasta);
  const carregada = comando === "hook" ? void 0 : carregarConfig(projeto);
  switch (comando) {
    case "hook": {
      const evento = resto[0] ?? "";
      if (!HOOKS[evento]) {
        process.stderr.write(msg().hookDesconhecido(evento) + "\n");
        return 1;
      }
      const saida = await executarHook(evento, await lerEntrada());
      if (saida) process.stdout.write(JSON.stringify(saida));
      return 0;
    }
    case "status": {
      const arquivo = caminhoDoCofre(projeto);
      const { arquivos, avisos, config } = carregada;
      const m = msg();
      const linhas = [m.statusProjeto(projeto), m.statusCofre(arquivo, existsSync4(arquivo))];
      linhas.push(m.statusChave(Boolean(process.env.PIIVEIL_PASSPHRASE), join3(diretorioBase(), "chave")));
      linhas.push(m.statusAtivo(config.ativo));
      linhas.push(m.statusIdioma(idioma()));
      linhas.push(m.statusConfig(arquivos));
      for (const a of avisos) linhas.push(m.statusAviso(a));
      if (existsSync4(arquivo)) {
        const cofre = Cofre.abrir(projeto);
        const resumo = Object.entries(cofre.resumo()).map(([t, n]) => `${t}: ${n}`);
        linhas.push(m.statusDados(cofre.tamanho, resumo.join(", ")));
      }
      process.stdout.write(linhas.join("\n") + "\n");
      return 0;
    }
    case "clear": {
      const havia = await Cofre.limpar(projeto);
      process.stdout.write((havia ? msg().limpo() : msg().semCofre()) + "\n");
      return 0;
    }
    case "init": {
      const dir = join3(projeto, ".piiveil");
      mkdirSync2(dir, { recursive: true });
      const gitignore = join3(dir, ".gitignore");
      if (!existsSync4(gitignore)) writeFileSync2(gitignore, "*\n");
      const arquivo = join3(dir, "config.json");
      if (existsSync4(arquivo)) {
        process.stdout.write(msg().configExiste(arquivo) + "\n");
      } else {
        writeFileSync2(arquivo, JSON.stringify(CONFIG_EXEMPLO, null, 2) + "\n");
        process.stdout.write(msg().configCriada(arquivo) + "\n");
      }
      return 0;
    }
    case "mask":
    case "unmask": {
      const caminho = resto.find((a, i) => !a.startsWith("--") && resto[i - 1] !== "--project" && resto[i - 1] !== "--projeto");
      if (!caminho) {
        process.stderr.write(msg().uso(comando) + "\n");
        return 1;
      }
      const texto = readFileSync3(caminho, "utf8");
      if (comando === "mask") {
        const { config } = carregada;
        const r = await Cofre.comTrava(projeto, (c) => mascarar(texto, c, opcoesDeteccao(config)));
        process.stdout.write(r.texto);
      } else {
        process.stdout.write(desmascarar(texto, Cofre.abrir(projeto)));
      }
      return 0;
    }
    case "help":
      process.stdout.write(msg().ajuda(VERSAO));
      return 0;
    case "version":
      process.stdout.write(VERSAO + "\n");
      return 0;
    default:
      process.stderr.write(`${msg().comandoDesconhecido(String(bruto))}

${msg().ajuda(VERSAO)}`);
      return 1;
  }
}
var ehExecucaoDireta = (() => {
  const script = process.argv[1] ?? "";
  return /(?:^|[\\/])(?:cli\.js|piiveil\.mjs)$/.test(script);
})();
if (ehExecucaoDireta) {
  main(process.argv.slice(2)).then(
    (codigo) => {
      process.exitCode = codigo;
    },
    (e) => {
      process.stderr.write(`piiveil: ${descreverErro(e)}
`);
      process.exitCode = 1;
    }
  );
}
export {
  executarHook,
  main
};
