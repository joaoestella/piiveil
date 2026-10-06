import { extname } from "node:path";
import { Cofre } from "../vault/cofre.js";
import { PADRAO_TOKEN } from "../detectors/index.js";
import { escaparRegex } from "../detectors/normalizar.js";
import { desmascarar, desmascararProfundo, tokensDesconhecidos } from "../pseudonimizar.js";
import { contexto, descreverErro, type EntradaHook, type SaidaHook } from "./comum.js";
import { msg } from "../i18n.js";

/** Extensões que o Read entrega ao modelo como documento ou imagem, sem texto para os hooks mascararem. */
export const EXTENSOES_BINARIAS = new Set([".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".tif", ".tiff", ".heic"]);

/** Caracteres que, dentro de um comando do shell, poderiam quebrar aspas ou executar algo. */
const PERIGOSOS_NO_SHELL = /[`$\\"'\n\r]/;

function negar(motivo: string): SaidaHook {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: motivo,
    },
  };
}

/**
 * PreToolUse:
 * - Write, Edit, NotebookEdit e Bash: troca tokens pelos valores reais antes
 *   de executar, para que os arquivos gravados tenham os dados reais;
 * - Read e Glob: idem nos caminhos, já que nomes de arquivo também são
 *   mascarados na saída das ferramentas;
 * - Grep: idem no padrão de busca, com os valores escapados para regex;
 * - Read: bloqueia PDFs e imagens (opcional), que não passam pelo mascaramento.
 */
export async function preToolUse(entrada: EntradaHook): Promise<SaidaHook | null> {
  const ctx = contexto(entrada);
  if (!ctx.config.ativo) return null;
  const ferramenta = String(entrada.tool_name ?? "");
  const input = (entrada.tool_input ?? {}) as Record<string, unknown>;

  const bloquearRead = (caminho: string): SaidaHook | null =>
    ferramenta === "Read" && ctx.config.bloquearArquivosBinarios && EXTENSOES_BINARIAS.has(extname(caminho).toLowerCase())
      ? negar(msg().binarioBloqueado())
      : null;

  if (ferramenta === "Bash" && !ctx.config.desmascararBash) return null;

  const serializado = JSON.stringify(input);
  PADRAO_TOKEN.lastIndex = 0;
  const temToken = PADRAO_TOKEN.test(serializado);
  PADRAO_TOKEN.lastIndex = 0;
  if (!temToken) return bloquearRead(String(input.file_path ?? ""));

  let cofre: Cofre;
  try {
    cofre = Cofre.abrir(ctx.projeto);
  } catch (e) {
    return negar(msg().cofreNaoAbriu(descreverErro(e)));
  }

  let novo: Record<string, unknown>;
  if (ferramenta === "Grep") {
    novo = { ...input };
    for (const [campo, valor] of Object.entries(input)) {
      if (typeof valor !== "string") continue;
      novo[campo] =
        campo === "pattern"
          ? valor.replace(PADRAO_TOKEN, (t) => {
              const real = cofre.valorDe(t);
              return real === undefined ? t : escaparRegex(real);
            })
          : desmascarar(valor, cofre);
    }
  } else if (ferramenta === "Bash") {
    const comando = String(input.command ?? "");
    for (const m of comando.matchAll(PADRAO_TOKEN)) {
      const real = cofre.valorDe(m[0]);
      if (real !== undefined && PERIGOSOS_NO_SHELL.test(real)) {
        return negar(msg().valorPerigosoShell(m[0]));
      }
    }
    novo = desmascararProfundo(input, cofre);
  } else {
    novo = desmascararProfundo(input, cofre);
  }

  const bloqueio = bloquearRead(String(novo.file_path ?? ""));
  if (bloqueio) return bloqueio;
  if (JSON.stringify(novo) === serializado) return null;

  const desconhecidos = tokensDesconhecidos(serializado, cofre);
  const saida: SaidaHook = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      updatedInput: novo,
      ...(desconhecidos.length
        ? {
            additionalContext: msg().tokensDesconhecidos(desconhecidos.join(", ")),
          }
        : {}),
    },
  };
  return saida;
}
