import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { Cofre } from "../src/vault/cofre.js";
import { executarHook } from "../src/cli.js";
import { prepararHooks, type AmbienteHooks, type Qualquer } from "./helpers/hooks.js";

const executar = promisify(execFile);

let amb: AmbienteHooks["amb"];
beforeEach(() => {
  ({ amb } = prepararHooks());
});
afterEach(() => amb.limpar());

describe("linha de comando", () => {
  test("JSON inválido no PostToolUse interrompe a sessão", async () => {
    const r = (await executarHook("post-tool-use", "{quebrado")) as Qualquer;
    assert.equal(r.continue, false);
    assert.match(r.stopReason, /piiveil/);
  });

  test("JSON inválido no PreToolUse nega a ferramenta", async () => {
    const r = (await executarHook("pre-tool-use", "{quebrado")) as Qualquer;
    assert.equal(r.hookSpecificOutput.permissionDecision, "deny");
  });

  test("processo real: stdin -> stdout", async () => {
    const cli = fileURLToPath(new URL("../src/cli.js", import.meta.url));
    const filho = execFile(process.execPath, [cli, "hook", "post-tool-use"], {
      env: { ...process.env, PIIVEIL_HOME: amb.home, CLAUDE_PROJECT_DIR: amb.projeto },
    });
    let saida = "";
    filho.stdout!.on("data", (d) => (saida += d));
    filho.stdin!.end(JSON.stringify({ hook_event_name: "PostToolUse", tool_name: "Bash", tool_response: { stdout: "fone (11) 98765-4321", stderr: "", interrupted: false } }));
    await new Promise((r) => filho.on("close", r));
    assert.deepEqual(JSON.parse(saida).hookSpecificOutput.updatedToolOutput, { stdout: "fone [PHONE_1]", stderr: "", interrupted: false });
  });

  test("status e limpar", async () => {
    const cli = fileURLToPath(new URL("../src/cli.js", import.meta.url));
    const env = { ...process.env, PIIVEIL_HOME: amb.home };
    const c = Cofre.abrir(amb.projeto);
    c.tokenPara("Maria Souza", "PERSON");
    c.salvar();
    const status = await executar(process.execPath, [cli, "status", "--projeto", amb.projeto], { env });
    assert.match(status.stdout, /dados no cofre: 1 \(PERSON: 1\)/);
    assert.ok(!status.stdout.includes("Maria"), "status não pode exibir valores");
    const limpar = await executar(process.execPath, [cli, "limpar", "--projeto", amb.projeto], { env });
    assert.match(limpar.stdout, /apagados/);
    assert.equal(Cofre.abrir(amb.projeto).tamanho, 0);
  });
});
