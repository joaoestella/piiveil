import { Cofre } from "../vault/cofre.js";
import { opcoesDeteccao } from "../config.js";
import { mascarar } from "../pseudonimizar.js";
import { contexto, descreverErro, type EntradaHook, type SaidaHook } from "./comum.js";

/**
 * PostToolUse: mascara dados pessoais na saída das ferramentas antes que o
 * modelo a veja.
 *
 * O Claude Code entrega a saída em `tool_response` com o formato próprio de
 * cada ferramenta (por exemplo, Read: { type, file: { content, ... } }; Bash:
 * { stdout, stderr, ... }) e só aceita `updatedToolOutput` com esse mesmo
 * formato: se o formato não bater, ele usa a saída original. Por isso a troca
 * é feita campo a campo, preservando a estrutura. `tool_output` em texto,
 * como na documentação, também é aceito.
 *
 * Em caso de erro, o conteúdo textual é ocultado (falha fechada), mantendo a
 * estrutura para que a substituição seja aceita.
 */
export async function postToolUse(entrada: EntradaHook): Promise<SaidaHook | null> {
  const bruto = entrada.tool_response !== undefined ? entrada.tool_response : entrada.tool_output;
  if (bruto === undefined || bruto === null) return null;
  try {
    const ctx = contexto(entrada);
    if (!ctx.config.ativo) return null;
    const opcoes = opcoesDeteccao(ctx.config);
    const { valor, alterado } = await Cofre.comTrava(ctx.projeto, (cofre) =>
      transformarTextos(bruto, (texto) => mascarar(texto, cofre, opcoes).texto),
    );
    if (!alterado) return null;
    return { hookSpecificOutput: { hookEventName: "PostToolUse", updatedToolOutput: valor } };
  } catch (e) {
    const aviso =
      `[piiveil] Conteúdo ocultado: não foi possível pseudonimizá-lo com segurança (${descreverErro(e)}). ` +
      "Avise o usuário; não tente obter o conteúdo por outro caminho.";
    return {
      systemMessage: `piiveil: saída da ferramenta ocultada por segurança (${descreverErro(e)})`,
      hookSpecificOutput: { hookEventName: "PostToolUse", updatedToolOutput: ocultarTextos(bruto, aviso) },
    };
  }
}

/** Aplica `f` a cada string da estrutura, devolvendo uma cópia com o mesmo formato. */
export function transformarTextos(valor: unknown, f: (texto: string) => string): { valor: unknown; alterado: boolean } {
  let alterado = false;
  const visitar = (v: unknown): unknown => {
    if (typeof v === "string") {
      if (v.length === 0) return v;
      const novo = f(v);
      if (novo !== v) alterado = true;
      return novo;
    }
    if (Array.isArray(v)) return v.map(visitar);
    if (v && typeof v === "object") {
      return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, visitar(x)]));
    }
    return v;
  };
  return { valor: visitar(valor), alterado };
}

/** Campos que guardam caminhos ou identificadores, mantidos na ocultação. */
const CAMPOS_PRESERVADOS = new Set(["filePath", "file_path", "path", "notebook_path", "type", "mode", "url", "id"]);

/**
 * Troca o conteúdo textual por um aviso, mantendo a estrutura. Valores curtos
 * com cara de identificador (ex.: "text", "create") e campos de caminho são
 * preservados, pois costumam ser enumerações exigidas pelo formato da saída.
 */
export function ocultarTextos(valor: unknown, aviso: string): unknown {
  let avisou = false;
  const visitar = (v: unknown, chave?: string): unknown => {
    if (typeof v === "string") {
      if (chave !== undefined && CAMPOS_PRESERVADOS.has(chave)) return v;
      if (/^[a-z_]{1,20}$/.test(v) || v.length === 0) return v;
      if (!avisou) {
        avisou = true;
        return aviso;
      }
      return "[piiveil: ocultado]";
    }
    if (Array.isArray(v)) return v.map((x) => visitar(x));
    if (v && typeof v === "object") {
      return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, visitar(x, k)]));
    }
    return v;
  };
  return visitar(valor);
}
