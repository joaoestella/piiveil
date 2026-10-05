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
    const saida = (await postToolUse(
      base("PostToolUse", {
        tool_name: "Read",
        tool_input: { file_path: arquivo },
        tool_output: comoRead(readFileSync(arquivo, "utf8")),
      }),
    )) as Qualquer;
    return saida.hookSpecificOutput.updatedToolOutput as string;
  };
  return { amb, base, lerMascarado };
}

/** Simula o que o Read mostra ao modelo: linhas numeradas como no cat -n. */
export function comoRead(texto: string): string {
  return texto
    .split("\n")
    .map((l, i) => `${String(i + 1).padStart(6)}\t${l}`)
    .join("\n");
}
