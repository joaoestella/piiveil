import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { build } from "esbuild";

const executar = promisify(execFile);
const raiz = new URL("../../", import.meta.url);
const ler = (caminho: string) => readFileSync(new URL(caminho, raiz), "utf8");
const json = (caminho: string) => JSON.parse(ler(caminho));

describe("pacote do plugin", () => {
  test("versões coincidem entre package.json, plugin.json e o código", async () => {
    const versao = json("package.json").version;
    assert.equal(json(".claude-plugin/plugin.json").version, versao);
    const { VERSAO } = await import("../src/versao.js");
    assert.equal(VERSAO, versao);
  });

  test("marketplace aponta para o plugin na raiz do repositório", () => {
    const m = json(".claude-plugin/marketplace.json");
    assert.equal(m.plugins[0].name, json(".claude-plugin/plugin.json").name);
    assert.equal(m.plugins[0].source, "./");
  });

  test("hooks.json chama o bundle com eventos existentes", () => {
    const { hooks } = json("hooks/hooks.json");
    const eventos: Record<string, string> = {
      SessionStart: "session-start",
      UserPromptSubmit: "user-prompt-submit",
      PreToolUse: "pre-tool-use",
      PostToolUse: "post-tool-use",
    };
    assert.deepEqual(Object.keys(hooks).sort(), Object.keys(eventos).sort());
    for (const [evento, grupos] of Object.entries(hooks) as Array<[string, Array<{ hooks: Array<{ args: string[] }> }>]>) {
      const args = grupos[0]!.hooks[0]!.args;
      assert.deepEqual(args, ["${CLAUDE_PLUGIN_ROOT}/dist/piiveil.mjs", "hook", eventos[evento]]);
    }
  });

  test("MessageDisplay não é registrado por padrão", () => {
    // O Claude Code espera o hook a cada pedaço da resposta; com ele registrado, a exibição
    // atrasa e sai embaralhada no terminal mesmo quando o hook não altera nada.
    assert.equal(json("hooks/hooks.json").hooks.MessageDisplay, undefined);
  });

  test("comandos do plugin não usam nomes de comandos nativos do Claude Code", () => {
    // Um /clear ou /status do plugin pode ser chamado no lugar do comando nativo.
    const nativos = new Set([
      "add-dir", "agents", "bug", "clear", "compact", "config", "context", "cost", "doctor", "exit", "export", "help",
      "hooks", "init", "login", "logout", "mcp", "memory", "model", "permissions", "plugin", "pr-comments", "release-notes",
      "resume", "review", "rewind", "status", "statusline", "terminal-setup", "todos", "usage", "vim",
    ]);
    const skills = readdirSync(new URL("skills/", raiz));
    assert.ok(skills.length > 0);
    for (const nome of skills) {
      assert.ok(!nativos.has(nome), `skills/${nome} colide com /${nome}`);
      assert.match(ler(`skills/${nome}/SKILL.md`), new RegExp(`^name: ${nome}$`, "m"));
    }
  });

  test("dist/piiveil.mjs está atualizado em relação ao código-fonte", async () => {
    const pkg = json("package.json");
    assert.match(pkg.scripts.bundle, /--outfile=dist\/piiveil\.mjs/);
    const r = await build({
      entryPoints: [fileURLToPath(new URL("src/cli.ts", raiz))],
      bundle: true,
      platform: "node",
      format: "esm",
      target: "node18",
      legalComments: "none",
      write: false,
      outfile: fileURLToPath(new URL("dist/piiveil.mjs", raiz)),
      absWorkingDir: fileURLToPath(raiz),
    });
    assert.equal(r.outputFiles[0]!.text, ler("dist/piiveil.mjs"), "rode `npm run bundle` e versione o resultado");
  });

  test("o bundle executa", async () => {
    const { stdout } = await executar(process.execPath, [fileURLToPath(new URL("dist/piiveil.mjs", raiz)), "--version"]);
    assert.equal(stdout.trim(), json("package.json").version);
  });
});
