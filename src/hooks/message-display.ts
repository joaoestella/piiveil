import { existsSync } from "node:fs";
import { Cofre, caminhoDoCofre } from "../vault/cofre.js";
import { PADRAO_TOKEN } from "../detectors/index.js";
import { desmascarar } from "../pseudonimizar.js";
import { contexto, type EntradaHook, type SaidaHook } from "./comum.js";

/**
 * MessageDisplay: mostra ao usuário os valores reais no lugar dos tokens.
 * Só altera a tela; o modelo e a transcrição continuam com os tokens.
 * Só age com a opção showRealValues ligada (ver Config.mostrarValoresReais).
 *
 * O Claude Code envia o texto em pedaços (`delta`); versões e a documentação
 * também citam `message_text` e `text`, aceitos como alternativa. Um token
 * dividido entre dois pedaços aparece na tela como token.
 */
export async function messageDisplay(entrada: EntradaHook): Promise<SaidaHook | null> {
  const texto = [entrada.delta, entrada.message_text, entrada.text].find((v): v is string => typeof v === "string");
  if (!texto) return null;
  PADRAO_TOKEN.lastIndex = 0;
  if (!PADRAO_TOKEN.test(texto)) return null;
  PADRAO_TOKEN.lastIndex = 0;

  const ctx = contexto(entrada);
  if (!ctx.config.ativo || !ctx.config.mostrarValoresReais || !existsSync(caminhoDoCofre(ctx.projeto))) return null;
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
