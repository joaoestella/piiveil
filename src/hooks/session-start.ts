import { contexto, type EntradaHook, type SaidaHook } from "./comum.js";
import { msg } from "../i18n.js";

/** Instruções para o modelo (em inglês, que o modelo segue bem qualquer que seja o idioma da conversa). */
export const INSTRUCOES_MODELO = [
  "The piiveil plugin is active in this project: personal data in tool outputs has been replaced with tokens",
  "such as [PERSON_1], [CPF_2], [SSN_1], [COMPANY_1], [EMAIL_3] and [CASE_1].",
  "Treat each token as the data itself. When writing files, editing or running commands, use the tokens exactly",
  "as they appear (brackets, uppercase and number included): they are replaced with the real values before",
  "execution, and the user sees the real values on screen. Do not try to discover, guess or reconstruct the",
  "original values, do not invent new tokens and do not change a token's number.",
  "Careful with the Edit tool: it checks that old_string exists in the file before tokens are replaced, so an",
  "old_string containing tokens is never found. Pick an old_string without tokens (nearby text that identifies",
  "the location unambiguously); new_string may contain tokens as usual. If no such text exists, rewrite the",
  "whole file with Write, using the tokens. Keep replying in the user's language.",
].join(" ");

/** SessionStart: explica ao modelo como lidar com os tokens e avisa sobre problemas de configuração. */
export async function sessionStart(entrada: EntradaHook): Promise<SaidaHook | null> {
  const ctx = contexto(entrada);
  if (!ctx.config.ativo) return null;
  const saida: SaidaHook = {
    hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: INSTRUCOES_MODELO },
  };
  if (ctx.avisos.length) saida.systemMessage = msg().problemasConfig(ctx.avisos.join("\n"));
  return saida;
}
