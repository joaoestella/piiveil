import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Cofre } from "../src/vault/cofre.js";
import { messageDisplay } from "../src/hooks/message-display.js";
import { userPromptSubmit } from "../src/hooks/user-prompt-submit.js";
import { sessionStart } from "../src/hooks/session-start.js";
import { prepararHooks, type AmbienteHooks, type Qualquer } from "./helpers/hooks.js";

let h: AmbienteHooks;
let amb: AmbienteHooks["amb"];
let base: AmbienteHooks["base"];
beforeEach(() => {
  h = prepararHooks();
  ({ amb, base } = h);
});
afterEach(() => amb.limpar());

describe("MessageDisplay", () => {
  test("mostra valores reais só na tela", async () => {
    const c = Cofre.abrir(amb.projeto);
    c.tokenPara("Maria Souza", "PESSOA");
    c.salvar();
    const r = (await messageDisplay(base("MessageDisplay", { delta: "Resumo: [PESSOA_1] assinou. [PESSOA_5] não.", index: 0, final: true }))) as Qualquer;
    assert.equal(r.hookSpecificOutput.displayContent, "Resumo: Maria Souza assinou. [PESSOA_5] não.");
  });
  test("sem tokens ou sem cofre, não faz nada", async () => {
    assert.equal(await messageDisplay(base("MessageDisplay", { delta: "olá" })), null);
    assert.equal(await messageDisplay(base("MessageDisplay", { delta: "[PESSOA_1]" })), null);
  });
  test("aceita message_text, como na documentação", async () => {
    const c = Cofre.abrir(amb.projeto);
    c.tokenPara("Maria Souza", "PESSOA");
    c.salvar();
    const r = (await messageDisplay(base("MessageDisplay", { message_text: "[PESSOA_1]" }))) as Qualquer;
    assert.equal(r.hookSpecificOutput.displayContent, "Maria Souza");
  });
});

describe("UserPromptSubmit", () => {
  test("bloqueia prompt com dado pessoal e sugere os tokens", async () => {
    const r = (await userPromptSubmit(base("UserPromptSubmit", { prompt: "resuma o caso do CPF 111.444.777-35" }))) as Qualquer;
    assert.equal(r.decision, "block");
    assert.match(r.reason, /use \[CPF_1\]/);
  });
  test("deixa passar prompt sem dados pessoais, com tokens ou comando de barra", async () => {
    assert.equal(await userPromptSubmit(base("UserPromptSubmit", { prompt: "resuma o contrato" })), null);
    assert.equal(await userPromptSubmit(base("UserPromptSubmit", { prompt: "quem é [PESSOA_1]?" })), null);
    assert.equal(await userPromptSubmit(base("UserPromptSubmit", { prompt: "/sigilo:status" })), null);
  });
  test("modo avisar não bloqueia", async () => {
    mkdirSync(join(amb.projeto, ".sigilo"));
    writeFileSync(join(amb.projeto, ".sigilo", "config.json"), JSON.stringify({ prompt: "avisar" }));
    const r = (await userPromptSubmit(base("UserPromptSubmit", { prompt: "email ana@exemplo.com" }))) as Qualquer;
    assert.equal(r.decision, undefined);
    assert.match(r.systemMessage, /sem pseudonimização/);
  });
});

describe("SessionStart", () => {
  test("injeta instruções e avisa sobre configuração inválida", async () => {
    mkdirSync(join(amb.projeto, ".sigilo"));
    writeFileSync(join(amb.projeto, ".sigilo", "config.json"), JSON.stringify({ prompt: "talvez" }));
    const r = (await sessionStart(base("SessionStart", { source: "startup" }))) as Qualquer;
    assert.match(r.hookSpecificOutput.additionalContext, /\[PESSOA_1\]/);
    assert.match(r.systemMessage, /"prompt"/);
  });
});

