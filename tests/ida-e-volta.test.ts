import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Cofre } from "../src/vault/cofre.js";
import { desmascarar, mascarar } from "../src/pseudonimizar.js";
import { ambienteTemporario, fixture, FIXTURES } from "./helpers/ambiente.js";

describe("ida e volta (mascarar -> desmascarar)", () => {
  let amb: ReturnType<typeof ambienteTemporario>;
  beforeEach(() => {
    amb = ambienteTemporario();
  });
  afterEach(() => amb.limpar());

  for (const nome of FIXTURES) {
    test(`${nome} volta idêntico ao original`, () => {
      const original = fixture(nome);
      const c = Cofre.abrir(amb.projeto);
      const r = mascarar(original, c);
      assert.ok(r.achados.length > 0);
      for (const { achado } of r.substituicoes) {
        assert.ok(!r.texto.includes(achado.valor), `"${achado.valor}" não deveria aparecer no texto mascarado`);
      }
      assert.equal(desmascarar(r.texto, c), original);
    });
  }

  test("o mesmo dado em documentos diferentes recebe o mesmo token", () => {
    const c = Cofre.abrir(amb.projeto);
    const contrato = mascarar(fixture("contrato-locacao.txt"), c).texto;
    const clientes = mascarar(fixture("clientes.csv"), c).texto;
    const cpf = c.tokenExistente("381.294.057-41", "CPF");
    assert.ok(cpf);
    assert.ok(contrato.includes(cpf));
    assert.ok(clientes.includes(cpf));
  });

  test("valor já conhecido é mascarado mesmo fora do contexto em que foi detectado", () => {
    const c = Cofre.abrir(amb.projeto);
    mascarar("Paciente: Antônio Carlos Ribeiro Lima", c);
    const r = mascarar("ver anotação de antônio e de Antônio Carlos Ribeiro Lima.", c);
    assert.equal(r.texto, "ver anotação de antônio e de [PERSON_1].");
  });

  test("mascarar é idempotente e não altera tokens", () => {
    const c = Cofre.abrir(amb.projeto);
    const uma = mascarar(fixture("laudo-medico.txt"), c).texto;
    const duas = mascarar(uma, c).texto;
    assert.equal(duas, uma);
  });

  test("tokens desconhecidos são preservados ao desmascarar", () => {
    const c = Cofre.abrir(amb.projeto);
    assert.equal(desmascarar("texto com [PERSON_99]", c), "texto com [PERSON_99]");
  });
});

describe("exemplos da documentação", () => {
  let amb: ReturnType<typeof ambienteTemporario>;
  beforeEach(() => {
    amb = ambienteTemporario();
  });
  afterEach(() => amb.limpar());

  for (const nome of ["peticao-inicial.md", "pagamentos.csv", "demand-letter.md"]) {
    test(`examples/${nome} volta idêntico e não expõe CPF, CNPJ, SSN nem e-mail`, () => {
      const original = readFileSync(new URL(`../../examples/${nome}`, import.meta.url), "utf8");
      const c = Cofre.abrir(amb.projeto);
      const r = mascarar(original, c);
      assert.equal(desmascarar(r.texto, c), original);
      assert.doesNotMatch(r.texto, /\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{3}-\d{2}-\d{4}|@exemplo|@example/);
    });
  }
});
