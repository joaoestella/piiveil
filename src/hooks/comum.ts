import { carregarConfig, pastaDoProjeto, type ConfigCarregada } from "../config.js";
import { ErroCofre } from "../vault/cofre.js";

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
  if (e instanceof Error) return `erro interno (${e.name})`;
  return "erro interno";
}

/** Extrai o texto visto pelo modelo a partir da saída de uma ferramenta. */
export function textoDaSaida(saida: unknown): string | null {
  if (typeof saida === "string") return saida;
  if (Array.isArray(saida)) {
    // Formato de conteúdo MCP: [{ type: "text", text: "..." }, ...]
    const textos = saida
      .map((p) => (p && typeof p === "object" && typeof (p as { text?: unknown }).text === "string" ? (p as { text: string }).text : null))
      .filter((t): t is string => t !== null);
    return textos.length ? textos.join("\n") : JSON.stringify(saida, null, 2);
  }
  if (saida && typeof saida === "object") {
    const o = saida as Record<string, unknown>;
    if (typeof o.stdout === "string" || typeof o.stderr === "string") {
      return [o.stdout, o.stderr].filter((s) => typeof s === "string" && s.length > 0).join("\n");
    }
    const arquivo = o.file as Record<string, unknown> | undefined;
    if (arquivo && typeof arquivo.content === "string") return arquivo.content;
    if (typeof o.content === "string") return o.content;
    if (Array.isArray(o.content)) return textoDaSaida(o.content);
    if (typeof o.result === "string") return o.result;
    return JSON.stringify(saida, null, 2);
  }
  return null;
}
