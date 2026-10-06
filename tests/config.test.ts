import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { carregarConfig, CONFIG_PADRAO, pastaDoProjeto } from "../src/config.js";
import { ambienteTemporario } from "./helpers/ambiente.js";

describe("configuração", () => {
  let amb: ReturnType<typeof ambienteTemporario>;
  beforeEach(() => {
    amb = ambienteTemporario();
    mkdirSync(join(amb.projeto, ".piiveil"), { recursive: true });
    mkdirSync(amb.home, { recursive: true });
  });
  afterEach(() => amb.limpar());

  test("sem arquivos, usa o padrão", () => {
    const { config, avisos } = carregarConfig(amb.projeto);
    assert.deepEqual(config, CONFIG_PADRAO);
    assert.deepEqual(avisos, []);
  });

  test("soma listas da configuração global e do projeto; o projeto prevalece nos valores simples", () => {
    writeFileSync(join(amb.home, "config.json"), JSON.stringify({ termos: ["Global"], prompt: "avisar" }));
    writeFileSync(join(amb.projeto, ".piiveil", "config.json"), JSON.stringify({ termos: ["Local"], prompt: "desligado" }));
    const { config } = carregarConfig(amb.projeto);
    assert.deepEqual(config.termos, ["Global", "Local"]);
    assert.equal(config.prompt, "desligado");
  });

  test("valores inválidos geram aviso e são ignorados", () => {
    writeFileSync(
      join(amb.projeto, ".piiveil", "config.json"),
      JSON.stringify({ termos: "não é lista", tiposDesativados: ["XYZ"], ativo: "sim", outra: 1 }),
    );
    const { config, avisos } = carregarConfig(amb.projeto);
    assert.equal(config.ativo, true);
    assert.equal(avisos.length, 4);
  });

  test("JSON quebrado não derruba o carregamento", () => {
    writeFileSync(join(amb.projeto, ".piiveil", "config.json"), "{ termos: ");
    const { config, avisos } = carregarConfig(amb.projeto);
    assert.deepEqual(config, CONFIG_PADRAO);
    assert.match(avisos[0] ?? "", /JSON inválido/);
  });

  test("pasta do projeto vem de CLAUDE_PROJECT_DIR quando definida", () => {
    process.env.CLAUDE_PROJECT_DIR = amb.projeto;
    try {
      assert.equal(pastaDoProjeto("/outro"), amb.projeto);
    } finally {
      delete process.env.CLAUDE_PROJECT_DIR;
    }
    assert.equal(pastaDoProjeto(amb.projeto), amb.projeto);
  });
});
