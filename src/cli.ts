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
import { idioma, msg } from "./i18n.js";

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
  const motivo = msg().falhaProcessar(descreverErro(e));
  if (evento === "post-tool-use") {
    // Sem a entrada não há como saber o formato da saída para substituí-la;
    // interromper o Claude é a única forma de impedir que ela siga para o modelo.
    return { continue: false, stopReason: msg().sessaoInterrompida(motivo), systemMessage: motivo };
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



const CONFIG_EXEMPLO = {
  $comment: "piiveil settings for this project. Do not commit this folder.",
  terms: [],
  names: [],
  companies: [],
  firstNames: [],
  ignore: [],
  disabledTypes: [],
  prompt: "block",
  blockBinaryFiles: true,
  unmaskBash: true,
  showRealValues: false,
};

/** Nomes em português aceitos como alternativa aos comandos em inglês. */
const ALIASES: Record<string, string> = {
  limpar: "clear",
  mascarar: "mask",
  desmascarar: "unmask",
  ajuda: "help",
  "--help": "help",
  "-h": "help",
  versao: "version",
  "--version": "version",
};

export async function main(args: string[]): Promise<number> {
  const [bruto, ...resto] = args;
  const comando = bruto === undefined ? "help" : (ALIASES[bruto] ?? bruto);
  const pasta = argumento(resto, "--project") ?? argumento(resto, "--projeto");
  const projeto = pastaDoProjeto(pasta);
  // Carrega a configuração cedo para que as mensagens saiam no idioma escolhido.
  const carregada = comando === "hook" ? undefined : carregarConfig(projeto);

  switch (comando) {
    case "hook": {
      const evento = resto[0] ?? "";
      if (!HOOKS[evento]) {
        process.stderr.write(msg().hookDesconhecido(evento) + "\n");
        return 1;
      }
      const saida = await executarHook(evento, await lerEntrada());
      if (saida) process.stdout.write(JSON.stringify(saida));
      return 0;
    }
    case "status": {
      const arquivo = caminhoDoCofre(projeto);
      const { arquivos, avisos, config } = carregada!;
      const m = msg();
      const linhas = [m.statusProjeto(projeto), m.statusCofre(arquivo, existsSync(arquivo))];
      linhas.push(m.statusChave(Boolean(process.env.PIIVEIL_PASSPHRASE), join(diretorioBase(), "chave")));
      linhas.push(m.statusAtivo(config.ativo));
      linhas.push(m.statusIdioma(idioma()));
      linhas.push(m.statusConfig(arquivos));
      for (const a of avisos) linhas.push(m.statusAviso(a));
      if (existsSync(arquivo)) {
        const cofre = Cofre.abrir(projeto);
        const resumo = Object.entries(cofre.resumo()).map(([t, n]) => `${t}: ${n}`);
        linhas.push(m.statusDados(cofre.tamanho, resumo.join(", ")));
      }
      process.stdout.write(linhas.join("\n") + "\n");
      return 0;
    }
    case "clear": {
      const havia = await Cofre.limpar(projeto);
      process.stdout.write((havia ? msg().limpo() : msg().semCofre()) + "\n");
      return 0;
    }
    case "init": {
      const dir = join(projeto, ".piiveil");
      mkdirSync(dir, { recursive: true });
      const gitignore = join(dir, ".gitignore");
      if (!existsSync(gitignore)) writeFileSync(gitignore, "*\n");
      const arquivo = join(dir, "config.json");
      if (existsSync(arquivo)) {
        process.stdout.write(msg().configExiste(arquivo) + "\n");
      } else {
        writeFileSync(arquivo, JSON.stringify(CONFIG_EXEMPLO, null, 2) + "\n");
        process.stdout.write(msg().configCriada(arquivo) + "\n");
      }
      return 0;
    }
    case "mask":
    case "unmask": {
      const caminho = resto.find((a, i) => !a.startsWith("--") && resto[i - 1] !== "--project" && resto[i - 1] !== "--projeto");
      if (!caminho) {
        process.stderr.write(msg().uso(comando) + "\n");
        return 1;
      }
      const texto = readFileSync(caminho, "utf8");
      if (comando === "mask") {
        const { config } = carregada!;
        const r = await Cofre.comTrava(projeto, (c) => mascarar(texto, c, opcoesDeteccao(config)));
        process.stdout.write(r.texto);
      } else {
        process.stdout.write(desmascarar(texto, Cofre.abrir(projeto)));
      }
      return 0;
    }
    case "help":
      process.stdout.write(msg().ajuda(VERSAO));
      return 0;
    case "version":
      process.stdout.write(VERSAO + "\n");
      return 0;
    default:
      process.stderr.write(`${msg().comandoDesconhecido(String(bruto))}\n\n${msg().ajuda(VERSAO)}`);
      return 1;
  }
}

const ehExecucaoDireta = (() => {
  const script = process.argv[1] ?? "";
  return /(?:^|[\\/])(?:cli\.js|piiveil\.mjs)$/.test(script);
})();

if (ehExecucaoDireta) {
  main(process.argv.slice(2)).then(
    (codigo) => {
      process.exitCode = codigo;
    },
    (e) => {
      process.stderr.write(`piiveil: ${descreverErro(e)}\n`);
      process.exitCode = 1;
    },
  );
}
