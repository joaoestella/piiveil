import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Cofre, caminhoDoCofre, diretorioBase } from "./vault/cofre.js";
import { carregarConfig, opcoesDeteccao, pastaDoProjeto } from "./config.js";
import { desmascarar, mascarar } from "./pseudonimizar.js";
import { VERSAO } from "./versao.js";
import type { EntradaHook, SaidaHook } from "./hooks/comum.js";
import { postToolUse } from "./hooks/post-tool-use.js";
import { preToolUse } from "./hooks/pre-tool-use.js";
import { messageDisplay } from "./hooks/message-display.js";
import { userPromptSubmit } from "./hooks/user-prompt-submit.js";
import { sessionStart } from "./hooks/session-start.js";
import { descreverErro } from "./hooks/comum.js";

type Hook = (entrada: EntradaHook) => Promise<SaidaHook | null>;

const HOOKS: Record<string, Hook> = {
  "post-tool-use": postToolUse,
  "pre-tool-use": preToolUse,
  "message-display": messageDisplay,
  "user-prompt-submit": userPromptSubmit,
  "session-start": sessionStart,
};

/** Resposta usada quando a entrada do hook não pôde ser lida: nunca deixa o dado passar. */
function saidaDeFalha(evento: string, e: unknown): SaidaHook | null {
  const motivo = `sigilo: falha ao processar (${descreverErro(e)})`;
  if (evento === "post-tool-use") {
    // Sem a entrada não há como saber o formato da saída para substituí-la;
    // interromper o Claude é a única forma de impedir que ela siga para o modelo.
    return { continue: false, stopReason: `${motivo}. A sessão foi interrompida para proteger os dados.`, systemMessage: motivo };
  }
  if (evento === "pre-tool-use") {
    return { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: motivo } };
  }
  if (evento === "user-prompt-submit") return { decision: "block", reason: motivo };
  return null;
}

async function lerEntrada(): Promise<string> {
  const partes: Buffer[] = [];
  for await (const parte of process.stdin) partes.push(parte as Buffer);
  return Buffer.concat(partes).toString("utf8");
}

export async function executarHook(evento: string, json: string): Promise<SaidaHook | null> {
  const hook = HOOKS[evento];
  if (!hook) throw new Error(`hook desconhecido: ${evento}`);
  try {
    const entrada = JSON.parse(json) as EntradaHook;
    return await hook(entrada);
  } catch (e) {
    return saidaDeFalha(evento, e);
  }
}

function argumento(args: string[], nome: string): string | undefined {
  const i = args.indexOf(nome);
  return i >= 0 ? args[i + 1] : undefined;
}

const AJUDA = `sigilo ${VERSAO}: pseudonimização reversível de dados pessoais para o Claude Code

Uso: node dist/sigilo.mjs <comando> [opções]

Comandos:
  status                 mostra onde fica o cofre do projeto e quantos dados ele guarda
  limpar                 apaga o cofre do projeto (os tokens antigos deixam de ter valor)
  init                   cria .sigilo/config.json no projeto, já protegido do git
  mascarar <arquivo>     imprime o arquivo com os dados pessoais trocados por tokens
  desmascarar <arquivo>  imprime o arquivo com os tokens trocados pelos valores reais
  hook <evento>          uso interno pelos hooks do Claude Code

Opções:
  --projeto <pasta>      pasta do projeto (padrão: CLAUDE_PROJECT_DIR ou a pasta atual)
`;

const CONFIG_EXEMPLO = {
  $comentario: "Configuração do sigilo para este projeto. Esta pasta não deve ser versionada.",
  termos: [],
  nomes: [],
  empresas: [],
  prenomes: [],
  ignorar: [],
  tiposDesativados: [],
  prompt: "bloquear",
  bloquearArquivosBinarios: true,
  desmascararBash: true,
};

export async function main(args: string[]): Promise<number> {
  const [comando, ...resto] = args;
  const projeto = pastaDoProjeto(argumento(resto, "--projeto"));

  switch (comando) {
    case "hook": {
      const evento = resto[0] ?? "";
      if (!HOOKS[evento]) {
        process.stderr.write(`sigilo: hook desconhecido "${evento}"\n`);
        return 1;
      }
      const saida = await executarHook(evento, await lerEntrada());
      if (saida) process.stdout.write(JSON.stringify(saida));
      return 0;
    }
    case "status": {
      const arquivo = caminhoDoCofre(projeto);
      const { arquivos, avisos, config } = carregarConfig(projeto);
      const linhas = [`projeto: ${projeto}`, `cofre: ${arquivo}${existsSync(arquivo) ? "" : " (ainda não criado)"}`];
      linhas.push(`chave: ${process.env.SIGILO_SENHA ? "derivada de SIGILO_SENHA" : join(diretorioBase(), "chave")}`);
      linhas.push(`ativo: ${config.ativo ? "sim" : "não"}`);
      linhas.push(`configuração: ${arquivos.length ? arquivos.join(", ") : "padrão"}`);
      for (const a of avisos) linhas.push(`aviso: ${a}`);
      if (existsSync(arquivo)) {
        const cofre = Cofre.abrir(projeto);
        const resumo = Object.entries(cofre.resumo()).map(([t, n]) => `${t}: ${n}`);
        linhas.push(`dados no cofre: ${cofre.tamanho}${resumo.length ? ` (${resumo.join(", ")})` : ""}`);
      }
      process.stdout.write(linhas.join("\n") + "\n");
      return 0;
    }
    case "limpar": {
      const havia = await Cofre.limpar(projeto);
      process.stdout.write(
        havia
          ? "sigilo: valores do cofre apagados. Tokens usados até aqui não serão mais traduzidos e seus números não serão reutilizados.\n"
          : "sigilo: este projeto não tinha cofre.\n",
      );
      return 0;
    }
    case "init": {
      const dir = join(projeto, ".sigilo");
      mkdirSync(dir, { recursive: true });
      const gitignore = join(dir, ".gitignore");
      if (!existsSync(gitignore)) writeFileSync(gitignore, "*\n");
      const arquivo = join(dir, "config.json");
      if (existsSync(arquivo)) {
        process.stdout.write(`sigilo: ${arquivo} já existe.\n`);
      } else {
        writeFileSync(arquivo, JSON.stringify(CONFIG_EXEMPLO, null, 2) + "\n");
        process.stdout.write(`sigilo: criado ${arquivo}\n`);
      }
      return 0;
    }
    case "mascarar":
    case "desmascarar": {
      const caminho = resto.find((a, i) => !a.startsWith("--") && resto[i - 1] !== "--projeto");
      if (!caminho) {
        process.stderr.write(`uso: ${comando} <arquivo>\n`);
        return 1;
      }
      const texto = readFileSync(caminho, "utf8");
      if (comando === "mascarar") {
        const { config } = carregarConfig(projeto);
        const r = await Cofre.comTrava(projeto, (c) => mascarar(texto, c, opcoesDeteccao(config)));
        process.stdout.write(r.texto);
      } else {
        process.stdout.write(desmascarar(texto, Cofre.abrir(projeto)));
      }
      return 0;
    }
    case undefined:
    case "ajuda":
    case "--help":
    case "-h":
      process.stdout.write(AJUDA);
      return 0;
    case "--version":
    case "versao":
      process.stdout.write(VERSAO + "\n");
      return 0;
    default:
      process.stderr.write(`sigilo: comando desconhecido "${comando}"\n\n${AJUDA}`);
      return 1;
  }
}

const ehExecucaoDireta = (() => {
  const script = process.argv[1] ?? "";
  return /(?:^|[\\/])(?:cli\.js|sigilo\.mjs)$/.test(script);
})();

if (ehExecucaoDireta) {
  main(process.argv.slice(2)).then(
    (codigo) => {
      process.exitCode = codigo;
    },
    (e) => {
      process.stderr.write(`sigilo: ${descreverErro(e)}\n`);
      process.exitCode = 1;
    },
  );
}
