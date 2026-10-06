import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { TIPOS, type TipoDado } from "./detectors/tipos.js";
import type { OpcoesDeteccao } from "./detectors/index.js";
import { diretorioBase } from "./vault/cofre.js";
import { definirIdioma, msg, normalizarIdioma, type Idioma } from "./i18n.js";

export type ModoPrompt = "bloquear" | "avisar" | "desligado";

export interface Config {
  /** Liga ou desliga o piiveil por completo. */
  ativo: boolean;
  termos: string[];
  nomes: string[];
  empresas: string[];
  prenomes: string[];
  ignorar: string[];
  tiposDesativados: TipoDado[];
  /** O que fazer quando o prompt digitado contém dado pessoal. */
  prompt: ModoPrompt;
  /** Impede o Read de PDFs e imagens, que chegam ao modelo sem passar pelos hooks de texto. */
  bloquearArquivosBinarios: boolean;
  /** Troca tokens por valores reais também nos comandos do Bash. */
  desmascararBash: boolean;
  /** Idioma das mensagens; "auto" segue a localidade do sistema. */
  idioma: Idioma | "auto";
}

export const CONFIG_PADRAO: Config = {
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
  idioma: "auto",
};

export interface ConfigCarregada {
  config: Config;
  /** Problemas encontrados nos arquivos (o piiveil segue com o que for válido). */
  avisos: string[];
  arquivos: string[];
}

export function arquivosDeConfig(projeto: string): string[] {
  return [join(diretorioBase(), "config.json"), join(resolve(projeto), ".piiveil", "config.json")];
}

/**
 * Nome de cada opção no arquivo de configuração. As chaves em inglês são as
 * principais; as em português são aceitas como alternativa.
 */
const CHAVES: Record<string, keyof Config> = {
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
  idioma: "idioma",
};

const LISTAS = new Set<keyof Config>(["termos", "nomes", "empresas", "prenomes", "ignorar"]);
const BOOLEANOS = new Set<keyof Config>(["ativo", "bloquearArquivosBinarios", "desmascararBash"]);
const COMENTARIOS = new Set(["$comment", "$comentario", "$schema"]);

const MODOS_PROMPT: Record<string, ModoPrompt> = {
  block: "bloquear",
  bloquear: "bloquear",
  warn: "avisar",
  avisar: "avisar",
  off: "desligado",
  desligado: "desligado",
};

/** Nomes de tipo das versões anteriores, aceitos em disabledTypes. */
const TIPOS_ANTIGOS: Record<string, TipoDado> = {
  PESSOA: "PERSON",
  EMPRESA: "COMPANY",
  TELEFONE: "PHONE",
  CARTAO: "CARD",
  PROCESSO: "CASE",
  TERMO: "TERM",
};

/**
 * Junta a configuração global (~/.piiveil/config.json) com a do projeto
 * (.piiveil/config.json). Listas são somadas; valores simples do projeto
 * prevalecem sobre os globais.
 */
export function carregarConfig(projeto: string): ConfigCarregada {
  const config: Config = structuredClone(CONFIG_PADRAO);
  const avisos: string[] = [];
  const lidos: string[] = [];
  const objetos: Array<[string, Record<string, unknown>]> = [];
  const problemas: Array<[string, "json" | "objeto"]> = [];
  for (const arquivo of arquivosDeConfig(projeto)) {
    if (!existsSync(arquivo)) continue;
    let bruto: unknown;
    try {
      // O Bloco de Notas e o PowerShell costumam gravar UTF-8 com BOM, que o JSON.parse não aceita.
      bruto = JSON.parse(readFileSync(arquivo, "utf8").replace(/^\uFEFF/, ""));
    } catch {
      problemas.push([arquivo, "json"]);
      continue;
    }
    if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) {
      problemas.push([arquivo, "objeto"]);
      continue;
    }
    objetos.push([arquivo, bruto as Record<string, unknown>]);
  }

  // O idioma é definido antes de tudo, para que os avisos já saiam nele.
  let idiomaEscolhido: Idioma | "auto" = "auto";
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

function aplicar(config: Config, bruto: Record<string, unknown>, arquivo: string, avisos: string[]): void {
  for (const [chave, valor] of Object.entries(bruto)) {
    if (COMENTARIOS.has(chave)) continue;
    const campo = CHAVES[chave];
    if (!campo) {
      avisos.push(msg().opcaoDesconhecida(arquivo, chave));
    } else if (LISTAS.has(campo)) {
      if (Array.isArray(valor) && valor.every((v) => typeof v === "string")) {
        (config[campo] as string[]).push(...(valor as string[]));
      } else avisos.push(msg().esperadaLista(arquivo, chave));
    } else if (campo === "tiposDesativados") {
      const tipos = Array.isArray(valor) ? valor.map((v) => (typeof v === "string" ? (TIPOS_ANTIGOS[v] ?? v) : v)) : null;
      if (tipos && tipos.every((v) => (TIPOS as readonly unknown[]).includes(v))) {
        config.tiposDesativados.push(...(tipos as TipoDado[]));
      } else avisos.push(msg().tiposValidos(arquivo, chave, TIPOS.join(", ")));
    } else if (campo === "prompt") {
      const modo = typeof valor === "string" ? MODOS_PROMPT[valor] : undefined;
      if (modo) config.prompt = modo;
      else avisos.push(msg().promptValido(arquivo));
    } else if (BOOLEANOS.has(campo)) {
      if (typeof valor === "boolean") (config[campo] as boolean) = valor;
      else avisos.push(msg().booleanoValido(arquivo, chave));
    } else if (campo === "idioma") {
      if (!idiomaDaConfig(valor)) avisos.push(msg().idiomaValido(arquivo));
    }
  }
}

function idiomaDaConfig(v: unknown): Idioma | "auto" | undefined {
  if (typeof v !== "string") return undefined;
  if (v.trim().toLowerCase() === "auto") return "auto";
  return /^(en|pt)([-_].*)?$/i.test(v.trim()) ? normalizarIdioma(v) : undefined;
}

export function opcoesDeteccao(config: Config): OpcoesDeteccao {
  return {
    termos: config.termos,
    nomes: config.nomes,
    empresas: config.empresas,
    prenomes: config.prenomes,
    ignorar: config.ignorar,
    tiposDesativados: config.tiposDesativados,
  };
}

/** Pasta do projeto: a do Claude Code quando disponível, senão o cwd informado. */
export function pastaDoProjeto(cwd?: string): string {
  return resolve(process.env.CLAUDE_PROJECT_DIR || cwd || process.cwd());
}
