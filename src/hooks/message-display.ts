import { existsSync } from "node:fs";
import { Cofre, caminhoDoCofre } from "../vault/cofre.js";
import { PADRAO_TOKEN } from "../detectors/index.js";
import { desmascarar } from "../pseudonimizar.js";
import { contexto, type EntradaHook, type SaidaHook } from "./comum.js";

/**
 * MessageDisplay: mostra ao usuário os valores reais no lugar dos tokens.
 * Só altera a tela; o modelo e a transcrição continuam com os tokens.
 */
export async function messageDisplay(entrada: EntradaHook): Promise<SaidaHook | null> {
  const texto = typeof entrada.message_text === "string" ? entrada.message_text : typeof entrada.text === "string" ? entrada.text : null;
  if (!texto) return null;
  PADRAO_TOKEN.lastIndex = 0;
  if (!PADRAO_TOKEN.test(texto)) return null;
  PADRAO_TOKEN.lastIndex = 0;

  const ctx = contexto(entrada);
  if (!ctx.config.ativo || !existsSync(caminhoDoCofre(ctx.projeto))) return null;
  try {
    const cofre = Cofre.abrir(ctx.projeto);
    const exibido = desmascarar(texto, cofre);
    if (exibido === texto) return null;
    return { hookSpecificOutput: { hookEventName: "MessageDisplay", displayContent: exibido } };
  } catch {
    // Sem cofre legível, a tela simplesmente continua mostrando os tokens.
    return null;
  }
}
