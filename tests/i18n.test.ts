import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { definirIdioma, detectarIdioma, idioma, normalizarIdioma } from "../src/i18n.js";
import { carregarConfig } from "../src/config.js";
import { userPromptSubmit } from "../src/hooks/user-prompt-submit.js";
import { ambienteTemporario } from "./helpers/ambiente.js";

const executar = promisify(execFile);

describe("detecção de idioma", () => {
  test("normaliza códigos de localidade", () => {
    assert.equal(normalizarIdioma("pt_BR.UTF-8"), "pt-BR");
    assert.equal(normalizarIdioma("pt"), "pt-BR");
    assert.equal(normalizarIdioma("en_US.UTF-8"), "en");
    assert.equal(normalizarIdioma("C.UTF-8"), undefined);
    assert.equal(normalizarIdioma("auto"), undefined);
  });
  test("PIIVEIL_LANG tem precedência sobre as variáveis do sistema", () => {
    assert.equal(detectarIdioma({ PIIVEIL_LANG: "en", LANG: "pt_BR.UTF-8" }), "en");
    assert.equal(detectarIdioma({ LANG: "pt_BR.UTF-8" }), "pt-BR");
    assert.equal(detectarIdioma({ LC_ALL: "en_US.UTF-8", LANG: "pt_BR.UTF-8" }), "en");
  });
});

describe("idioma na configuração e nas mensagens", () => {
  let amb: ReturnType<typeof ambienteTemporario>;
  beforeEach(() => {
    amb = ambienteTemporario();
    mkdirSync(join(amb.projeto, ".piiveil"), { recursive: true });
  });
  afterEach(() => {
    definirIdioma("auto");
    amb.limpar();
  });

  test('"language" da configuração vale sobre a localidade', () => {
    writeFileSync(join(amb.projeto, ".piiveil", "config.json"), JSON.stringify({ language: "en", foo: 1 }));
    const { avisos, config } = carregarConfig(amb.projeto);
    assert.equal(config.idioma, "en");
    assert.equal(idioma(), "en");
    assert.match(avisos[0] ?? "", /unknown option "foo"/);
  });

  test("valor de idioma inválido gera aviso", () => {
    writeFileSync(join(amb.projeto, ".piiveil", "config.json"), JSON.stringify({ language: "fr" }));
    const { avisos } = carregarConfig(amb.projeto);
    assert.match(avisos[0] ?? "", /"language"/);
  });

  test("prompt bloqueado com mensagem em inglês", async () => {
    process.env.PIIVEIL_LANG = "en";
    const r = (await userPromptSubmit({ cwd: amb.projeto, prompt: "SSN of ana@example.com?" })) as Record<string, string>;
    assert.equal(r.decision, "block");
    assert.match(r.reason ?? "", /was not sent to the model/);
    assert.match(r.reason ?? "", /use \[EMAIL_1\]/);
  });

  test("ajuda da linha de comando nos dois idiomas", async () => {
    const cli = fileURLToPath(new URL("../src/cli.js", import.meta.url));
    const en = await executar(process.execPath, [cli, "help"], { env: { ...process.env, PIIVEIL_LANG: "en" } });
    assert.match(en.stdout, /Usage: node dist\/piiveil\.mjs <command>/);
    const pt = await executar(process.execPath, [cli, "ajuda"], { env: { ...process.env, PIIVEIL_LANG: "pt-BR" } });
    assert.match(pt.stdout, /Uso: node dist\/piiveil\.mjs <comando>/);
  });
});
