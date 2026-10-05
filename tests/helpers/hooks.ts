import { mkdirSync, readFileSync } from "node:fs";
import { postToolUse } from "../../src/hooks/post-tool-use.js";
import { ambienteTemporario } from "./ambiente.js";

export type Qualquer = Record<string, any>;

export interface AmbienteHooks {
  amb: ReturnType<typeof ambienteTemporario>;
  base: (evento: string, extra?: Qualquer) => Qualquer;
  lerMascarado: (arquivo: string) => Promise<string>;
}

export function prepararHooks(): AmbienteHooks {
  const amb = ambienteTemporario();
  delete process.env.CLAUDE_PROJECT_DIR;
  mkdirSync(amb.projeto, { recursive: true });
  const base = (evento: string, extra: Qualquer = {}): Qualquer => ({
    session_id: "teste",
    cwd: amb.projeto,
    hook_event_name: evento,
    ...extra,
  });
  const lerMascarado = async (arquivo: string): Promise<string> => {
    const saida = (await postToolUse(base("PostToolUse", entradaRead(arquivo, readFileSync(arquivo, "utf8"))))) as Qualquer;
    return saida.hookSpecificOutput.updatedToolOutput.file.content as string;
  };
  return { amb, base, lerMascarado };
}

/** Entrada do PostToolUse do Read no formato enviado pelo Claude Code. */
export function entradaRead(arquivo: string, conteudo: string): Qualquer {
  const linhas = conteudo.split("\n").length;
  return {
    tool_name: "Read",
    tool_input: { file_path: arquivo },
    tool_response: {
      type: "text",
      file: { filePath: arquivo, content: conteudo, numLines: linhas, startLine: 1, totalLines: linhas },
    },
    tool_use_id: "toolu_teste",
  };
}
