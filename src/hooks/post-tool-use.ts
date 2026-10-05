import { Cofre } from "../vault/cofre.js";
import { opcoesDeteccao } from "../config.js";
import { mascarar } from "../pseudonimizar.js";
import { contexto, descreverErro, textoDaSaida, type EntradaHook, type SaidaHook } from "./comum.js";

/**
 * PostToolUse: mascara dados pessoais na saída das ferramentas de leitura
 * (Read, Grep, Glob, Bash, WebFetch, MCP) antes que o modelo a veja.
 *
 * Em caso de erro, a saída é ocultada (falha fechada): é preferível o modelo
 * não ver nada a ver o dado real.
 */
export async function postToolUse(entrada: EntradaHook): Promise<SaidaHook | null> {
  try {
    const ctx = contexto(entrada);
    if (!ctx.config.ativo) return null;
    const bruto = entrada.tool_output !== undefined ? entrada.tool_output : entrada.tool_response;
    const texto = textoDaSaida(bruto);
    if (texto === null || texto.length === 0) return null;

    const resultado = await Cofre.comTrava(ctx.projeto, (cofre) => mascarar(texto, cofre, opcoesDeteccao(ctx.config)));
    if (resultado.achados.length === 0) return null;

    return {
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        updatedToolOutput: resultado.texto,
      },
    };
  } catch (e) {
    return {
      systemMessage: `sigilo: saída da ferramenta ocultada por segurança (${descreverErro(e)})`,
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        updatedToolOutput:
          "[sigilo] A saída desta ferramenta foi ocultada porque não foi possível pseudonimizá-la com segurança " +
          `(${descreverErro(e)}). Avise o usuário; não tente obter o conteúdo por outro caminho.`,
      },
    };
  }
}
