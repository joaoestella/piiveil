import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { TIPOS, type TipoDado } from "./detectors/tipos.js";
import type { OpcoesDeteccao } from "./detectors/index.js";
import { diretorioBase } from "./vault/cofre.js";

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
  for (const arquivo of arquivosDeConfig(projeto)) {
    if (!existsSync(arquivo)) continue;
    let bruto: unknown;
    try {
      bruto = JSON.parse(readFileSync(arquivo, "utf8"));
    } catch {
      avisos.push(`${arquivo}: JSON inválido, arquivo ignorado`);
      continue;
    }
    if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) {
      avisos.push(`${arquivo}: esperado um objeto JSON, arquivo ignorado`);
      continue;
    }
    lidos.push(arquivo);
    aplicar(config, bruto as Record<string, unknown>, arquivo, avisos);
  }
  return { config, avisos, arquivos: lidos };
}

function aplicar(config: Config, bruto: Record<string, unknown>, arquivo: string, avisos: string[]): void {
  for (const [chave, valor] of Object.entries(bruto)) {
    if (COMENTARIOS.has(chave)) continue;
    const campo = CHAVES[chave];
    if (!campo) {
      avisos.push(`${arquivo}: opção desconhecida "${chave}"`);
    } else if (LISTAS.has(campo)) {
      if (Array.isArray(valor) && valor.every((v) => typeof v === "string")) {
        (config[campo] as string[]).push(...(valor as string[]));
      } else avisos.push(`${arquivo}: "${chave}" deve ser uma lista de textos`);
    } else if (campo === "tiposDesativados") {
      const tipos = Array.isArray(valor) ? valor.map((v) => (typeof v === "string" ? (TIPOS_ANTIGOS[v] ?? v) : v)) : null;
      if (tipos && tipos.every((v) => (TIPOS as readonly unknown[]).includes(v))) {
        config.tiposDesativados.push(...(tipos as TipoDado[]));
      } else avisos.push(`${arquivo}: "${chave}" aceita apenas ${TIPOS.join(", ")}`);
    } else if (campo === "prompt") {
      const modo = typeof valor === "string" ? MODOS_PROMPT[valor] : undefined;
      if (modo) config.prompt = modo;
      else avisos.push(`${arquivo}: "prompt" deve ser "block", "warn" ou "off"`);
    } else if (BOOLEANOS.has(campo)) {
      if (typeof valor === "boolean") (config[campo] as boolean) = valor;
      else avisos.push(`${arquivo}: "${chave}" deve ser true ou false`);
    }
  }
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
