import { contexto, type EntradaHook, type SaidaHook } from "./comum.js";

export const INSTRUCOES_MODELO = [
  "O plugin sigilo está ativo neste projeto: dados pessoais nas saídas das ferramentas foram trocados por tokens",
  "como [PESSOA_1], [CPF_2], [EMPRESA_1], [EMAIL_3] e [PROCESSO_1].",
  "Trate cada token como o próprio dado. Ao escrever arquivos, editar ou rodar comandos, use os tokens exatamente",
  "como aparecem (com colchetes, maiúsculas e número): eles são trocados pelos valores reais antes da execução,",
  "e o usuário vê os valores reais na tela. Não tente descobrir, adivinhar ou reconstruir os valores originais,",
  "não invente tokens novos e não altere o número de um token.",
].join(" ");

/** SessionStart: explica ao modelo como lidar com os tokens e avisa sobre problemas de configuração. */
export async function sessionStart(entrada: EntradaHook): Promise<SaidaHook | null> {
  const ctx = contexto(entrada);
  if (!ctx.config.ativo) return null;
  const saida: SaidaHook = {
    hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: INSTRUCOES_MODELO },
  };
  if (ctx.avisos.length) saida.systemMessage = `sigilo: problemas na configuração:\n${ctx.avisos.join("\n")}`;
  return saida;
}
