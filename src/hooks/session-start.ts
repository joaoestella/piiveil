import { contexto, type EntradaHook, type SaidaHook } from "./comum.js";

export const INSTRUCOES_MODELO = [
  "O plugin piiveil está ativo neste projeto: dados pessoais nas saídas das ferramentas foram trocados por tokens",
  "como [PERSON_1], [CPF_2], [COMPANY_1], [EMAIL_3] e [CASE_1].",
  "Trate cada token como o próprio dado. Ao escrever arquivos, editar ou rodar comandos, use os tokens exatamente",
  "como aparecem (com colchetes, maiúsculas e número): eles são trocados pelos valores reais antes da execução,",
  "e o usuário vê os valores reais na tela. Não tente descobrir, adivinhar ou reconstruir os valores originais,",
  "não invente tokens novos e não altere o número de um token.",
  "Atenção com a ferramenta Edit: ela confere se o old_string existe no arquivo antes de os tokens serem trocados,",
  "então um old_string com tokens nunca é encontrado. Escolha um old_string sem tokens (um trecho vizinho que",
  "identifique o local sem ambiguidade); o new_string pode conter tokens normalmente. Se não houver trecho assim,",
  "reescreva o arquivo inteiro com Write, usando os tokens.",
].join(" ");

/** SessionStart: explica ao modelo como lidar com os tokens e avisa sobre problemas de configuração. */
export async function sessionStart(entrada: EntradaHook): Promise<SaidaHook | null> {
  const ctx = contexto(entrada);
  if (!ctx.config.ativo) return null;
  const saida: SaidaHook = {
    hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: INSTRUCOES_MODELO },
  };
  if (ctx.avisos.length) saida.systemMessage = `piiveil: problemas na configuração:\n${ctx.avisos.join("\n")}`;
  return saida;
}
