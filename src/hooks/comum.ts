import { carregarConfig, pastaDoProjeto, type ConfigCarregada } from "../config.js";
import { ErroCofre } from "../vault/cofre.js";
import { msg } from "../i18n.js";

/** Campos comuns da entrada dos hooks (os demais variam por evento). */
export interface EntradaHook {
  session_id?: string;
  cwd?: string;
  hook_event_name?: string;
  [campo: string]: unknown;
}

export type SaidaHook = Record<string, unknown>;

export interface Contexto {
  projeto: string;
  config: ConfigCarregada["config"];
  avisos: string[];
}

export function contexto(entrada: EntradaHook): Contexto {
  const projeto = pastaDoProjeto(typeof entrada.cwd === "string" ? entrada.cwd : undefined);
  const { config, avisos } = carregarConfig(projeto);
  return { projeto, config, avisos };
}

/**
 * Mensagem de erro segura para exibir: nunca inclui o texto original do erro
 * quando ele pode conter trechos do conteúdo analisado.
 */
export function descreverErro(e: unknown): string {
  if (e instanceof ErroCofre) return e.message;
  if (e instanceof Error) return msg().erroInterno(e.name);
  return msg().erroInterno();
}
