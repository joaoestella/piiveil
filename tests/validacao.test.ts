import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  validarCartao,
  validarCEP,
  validarCNPJ,
  validarCPF,
  validarPIS,
  validarProcessoCNJ,
  validarTelefone,
} from "../src/detectors/validacao.js";
import { gerarCartao, gerarCNPJ, gerarCPF, gerarPIS, gerarProcesso } from "./helpers/gerar.js";

describe("CPF", () => {
  test("aceita exemplo didático válido, com e sem pontuação", () => {
    assert.ok(validarCPF("111.444.777-35"));
    assert.ok(validarCPF("11144477735"));
  });
  test("aceita CPFs gerados", () => {
    for (const base of ["123456789", "987654321", "529982247", "000000001"]) {
      assert.ok(validarCPF(gerarCPF(base)), base);
    }
  });
  test("rejeita dígito errado, sequências repetidas e tamanho errado", () => {
    assert.equal(validarCPF("111.444.777-36"), false);
    assert.equal(validarCPF("111.111.111-11"), false);
    assert.equal(validarCPF("000.000.000-00"), false);
    assert.equal(validarCPF("1114447773"), false);
  });
});

describe("CNPJ", () => {
  test("aceita exemplo didático numérico", () => {
    assert.ok(validarCNPJ("11.222.333/0001-81"));
    assert.ok(validarCNPJ("11222333000181"));
  });
  test("aceita o formato alfanumérico", () => {
    assert.ok(validarCNPJ("12.ABC.345/01DE-35"));
    assert.ok(validarCNPJ(gerarCNPJ("A1B2C3D40001")));
  });
  test("rejeita dígito errado e repetição", () => {
    assert.equal(validarCNPJ("11.222.333/0001-82"), false);
    assert.equal(validarCNPJ("00.000.000/0000-00"), false);
    assert.equal(validarCNPJ("12.ABC.345/01DE-36"), false);
  });
});

describe("cartão (Luhn)", () => {
  test("aceita número de teste conhecido e gerados", () => {
    assert.ok(validarCartao("4111 1111 1111 1111"));
    assert.ok(validarCartao(gerarCartao("552233445566778")));
    assert.ok(validarCartao(gerarCartao("37828224631000")));
  });
  test("rejeita Luhn inválido, prefixo implausível e tamanho errado", () => {
    assert.equal(validarCartao("4111 1111 1111 1112"), false);
    assert.equal(validarCartao(gerarCartao("912345678901234")), false);
    assert.equal(validarCartao("4111111111"), false);
  });
});

describe("processo CNJ", () => {
  test("aceita números gerados com DV correto", () => {
    assert.ok(validarProcessoCNJ(gerarProcesso("0001234", "2024", "8", "26", "0100")));
    assert.ok(validarProcessoCNJ(gerarProcesso("5000321", "2023", "4", "04", "7100")));
  });
  test("rejeita DV alterado e segmento de justiça zero", () => {
    const valido = gerarProcesso("0001234", "2024", "8", "26", "0100");
    const dv = Number(valido.slice(8, 10));
    const errado = valido.slice(0, 8) + String((dv + 1) % 100).padStart(2, "0") + valido.slice(10);
    assert.equal(validarProcessoCNJ(errado), false);
    assert.equal(validarProcessoCNJ(gerarProcesso("0001234", "2024", "0", "26", "0100")), false);
  });
});

describe("PIS/NIS", () => {
  test("aceita exemplo calculado à mão e gerados", () => {
    assert.ok(validarPIS("12034567899"));
    assert.ok(validarPIS("120.34567.89-9"));
    assert.ok(validarPIS(gerarPIS("1701234567")));
  });
  test("rejeita dígito errado", () => {
    assert.equal(validarPIS("12034567898"), false);
    assert.equal(validarPIS("11111111111"), false);
  });
});

describe("CEP e telefone", () => {
  test("CEP", () => {
    assert.ok(validarCEP("01310-100"));
    assert.equal(validarCEP("00000-000"), false);
  });
  test("telefone", () => {
    assert.ok(validarTelefone("11", "987654321"));
    assert.ok(validarTelefone("21", "34567890"));
    assert.ok(validarTelefone(undefined, "34567890"));
    assert.equal(validarTelefone("10", "987654321"), false, "DDD inexistente");
    assert.equal(validarTelefone("11", "887654321"), false, "celular deve começar com 9");
    assert.equal(validarTelefone("11", "94567890"), false, "fixo começa com 2 a 5");
  });
});
