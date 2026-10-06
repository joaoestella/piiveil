import { Cofre } from "../vault/cofre.js";
import { opcoesDeteccao } from "../config.js";
import { mascarar } from "../pseudonimizar.js";
import { contexto, descreverErro, type EntradaHook, type SaidaHook } from "./comum.js";

const MAX_EXEMPLOS = 8;

/**
 * UserPromptSubmit: o hook não pode reescrever o prompt. Se o texto digitado
 * tiver dado pessoal, o prompt é bloqueado (não chega ao modelo) e o usuário
 * recebe os tokens que pode usar no lugar, ou a orientação de colocar o
 * conteúdo num arquivo, que será lido já mascarado.
 */
export async function userPromptSubmit(entrada: EntradaHook): Promise<SaidaHook | null> {
  const ctx = contexto(entrada);
  if (!ctx.config.ativo || ctx.config.prompt === "desligado") return null;
  const prompt = typeof entrada.prompt === "string" ? entrada.prompt : typeof entrada.prompt_text === "string" ? entrada.prompt_text : "";
  if (!prompt.trim() || prompt.trimStart().startsWith("/")) return null;

  let substituicoes: Array<{ token: string; valor: string; tipo: string }>;
  try {
    substituicoes = await Cofre.comTrava(ctx.projeto, (cofre) =>
      mascarar(prompt, cofre, opcoesDeteccao(ctx.config)).substituicoes.map((s) => ({
        token: s.token,
        valor: s.achado.valor,
        tipo: s.achado.tipo,
      })),
    );
  } catch (e) {
    if (ctx.config.prompt === "avisar") return { systemMessage: `piiveil: não foi possível verificar o prompt (${descreverErro(e)})` };
    return { decision: "block", reason: `piiveil: não foi possível verificar o prompt (${descreverErro(e)}). Ele não foi enviado.` };
  }
  if (substituicoes.length === 0) return null;

  const unicos = [...new Map(substituicoes.map((s) => [s.token, s])).values()];
  const linhas = unicos.slice(0, MAX_EXEMPLOS).map((s) => `  • "${s.valor}" → use ${s.token}`);
  if (unicos.length > MAX_EXEMPLOS) linhas.push(`  • … e mais ${unicos.length - MAX_EXEMPLOS}`);

  if (ctx.config.prompt === "avisar") {
    return {
      systemMessage: `piiveil: atenção, o prompt contém ${unicos.length} dado(s) pessoal(is) e foi enviado ao modelo sem pseudonimização.`,
    };
  }

  const motivo = [
    `piiveil: o prompt contém ${unicos.length} dado(s) pessoal(is) e não foi enviado ao modelo.`,
    "Reescreva usando os tokens abaixo (a resposta mostrará os valores reais na tela):",
    ...linhas,
    "Para textos longos, salve o conteúdo num arquivo e peça para lê-lo: a leitura passa pelo mascaramento.",
  ].join("\n");
  return { decision: "block", reason: motivo };
}
