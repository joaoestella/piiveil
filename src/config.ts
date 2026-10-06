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

const LISTAS = ["termos", "nomes", "empresas", "prenomes", "ignorar"] as const;

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
    if ((LISTAS as readonly string[]).includes(chave)) {
      if (Array.isArray(valor) && valor.every((v) => typeof v === "string")) {
        config[chave as (typeof LISTAS)[number]].push(...(valor as string[]));
      } else avisos.push(`${arquivo}: "${chave}" deve ser uma lista de textos`);
    } else if (chave === "tiposDesativados") {
      if (Array.isArray(valor) && valor.every((v) => (TIPOS as readonly unknown[]).includes(v))) {
        config.tiposDesativados.push(...(valor as TipoDado[]));
      } else avisos.push(`${arquivo}: "tiposDesativados" aceita apenas ${TIPOS.join(", ")}`);
    } else if (chave === "prompt") {
      if (valor === "bloquear" || valor === "avisar" || valor === "desligado") config.prompt = valor;
      else avisos.push(`${arquivo}: "prompt" deve ser "bloquear", "avisar" ou "desligado"`);
    } else if (chave === "ativo" || chave === "bloquearArquivosBinarios" || chave === "desmascararBash") {
      if (typeof valor === "boolean") config[chave] = valor;
      else avisos.push(`${arquivo}: "${chave}" deve ser true ou false`);
    } else if (chave !== "$comentario") {
      avisos.push(`${arquivo}: opção desconhecida "${chave}"`);
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
