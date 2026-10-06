import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { criarDetector, type TipoDado } from "../src/detectors/index.js";
import { classificarSSN, validarEIN } from "../src/detectors/eua.js";

const detectar = criarDetector();
const achar = (texto: string, tipo?: TipoDado) =>
  detectar(texto)
    .filter((a) => !tipo || a.tipo === tipo)
    .map((a) => a.valor);
const tipos = (texto: string) => detectar(texto).map((a) => `${a.tipo}:${a.valor}`);

describe("SSN e ITIN", () => {
  test("classifica pelas regras da SSA e do IRS", () => {
    assert.equal(classificarSSN("412-73-9058"), "SSN");
    assert.equal(classificarSSN("912-70-1234"), "ITIN");
    assert.equal(classificarSSN("000-12-3456"), null, "área 000");
    assert.equal(classificarSSN("666-12-3456"), null, "área 666");
    assert.equal(classificarSSN("412-00-3456"), null, "grupo 00");
    assert.equal(classificarSSN("412-73-0000"), null, "série 0000");
    assert.equal(classificarSSN("912-40-1234"), null, "9xx fora das faixas de ITIN");
    assert.equal(classificarSSN("078-05-1120"), null, "número publicado e invalidado");
  });
  test("detecta formatado e, corrido, só com palavra-chave", () => {
    assert.deepEqual(tipos("SSN 412-73-9058."), ["SSN:412-73-9058"]);
    assert.deepEqual(tipos("Social Security Number: 412739058"), ["SSN:412739058"]);
    assert.deepEqual(tipos("ITIN 912 70 1234"), ["ITIN:912 70 1234"]);
    assert.deepEqual(achar("order 412739058", "SSN"), []);
  });
});

describe("EIN", () => {
  test("valida o prefixo", () => {
    assert.ok(validarEIN("45-6789012"));
    assert.equal(validarEIN("07-1234567"), false);
    assert.equal(validarEIN("89-1234567"), false);
  });
  test("detecta formatado e com palavra-chave", () => {
    assert.deepEqual(tipos("EIN 45-6789012"), ["EIN:45-6789012"]);
    assert.deepEqual(tipos("FEIN: 456789012"), ["EIN:456789012"]);
    assert.deepEqual(achar("ref 07-1234567", "EIN"), []);
  });
});

describe("telefone dos EUA", () => {
  test("formatos comuns", () => {
    for (const t of ["(415) 555-0132", "415-555-0132", "415.555.0132", "+1 415 555 0132", "+1 (212) 555-0187"]) {
      assert.deepEqual(achar(`call ${t} today`, "PHONE"), [t], t);
    }
  });
  test("dez dígitos corridos só com palavra-chave", () => {
    assert.deepEqual(achar("Phone: 4155550132", "PHONE"), ["4155550132"]);
    assert.deepEqual(achar("invoice 4155550132", "PHONE"), []);
  });
  test("rejeita códigos N11 e prefixos inválidos", () => {
    assert.deepEqual(achar("(911) 555-0132", "PHONE"), []);
    assert.deepEqual(achar("(415) 155-0132", "PHONE"), []);
  });
  test("não interfere nos telefones brasileiros", () => {
    assert.deepEqual(tipos("fone (11) 98765-4321"), ["PHONE:(11) 98765-4321"]);
    assert.deepEqual(tipos("CPF 381.294.057-41"), ["CPF:381.294.057-41"]);
  });
});

describe("ZIP code", () => {
  test("ZIP+4, após sigla de estado e com palavra-chave", () => {
    assert.deepEqual(achar("94103-1234", "ZIP"), ["94103-1234"]);
    assert.deepEqual(achar("San Francisco, CA 94103", "ZIP"), ["94103"]);
    assert.deepEqual(achar("ZIP code: 10001", "ZIP"), ["10001"]);
  });
  test("ignora cinco dígitos soltos e não confunde CEP", () => {
    assert.deepEqual(achar("total of 94103 items", "ZIP"), []);
    assert.deepEqual(tipos("CEP 01310-100"), ["CEP:01310-100"]);
    assert.deepEqual(achar("Cuiabá, MT 78000-000", "ZIP"), []);
  });
});

describe("nomes e empresas em inglês", () => {
  test("nomes com prenome americano e pronomes de tratamento", () => {
    assert.deepEqual(achar("Tenant: John Michael Smith, signed", "PERSON"), ["John Michael Smith"]);
    assert.deepEqual(achar("as confirmed by Mrs. Patricia yesterday", "PERSON"), ["Patricia"]);
    assert.deepEqual(achar("Dr. Emily Carter, Esq.", "PERSON"), ["Emily Carter"]);
  });
  test("lugares e títulos comuns não viram nomes", () => {
    assert.deepEqual(achar("1200 Market Street, San Francisco", "PERSON"), []);
    assert.deepEqual(achar("Mark As Read", "PERSON"), []);
    assert.deepEqual(achar("Meeting Notes For Robert Brown", "PERSON"), ["Robert Brown"]);
  });
  test("sufixos societários americanos", () => {
    assert.deepEqual(achar("Landlord: Acme Property Holdings LLC, a Delaware company", "COMPANY"), ["Acme Property Holdings LLC"]);
    assert.deepEqual(achar("Apple Inc. announced", "COMPANY"), ["Apple Inc."]);
    assert.deepEqual(achar("Smith and Jones Consulting Corp. agrees", "COMPANY"), ["Smith and Jones Consulting Corp."]);
    assert.deepEqual(achar("Riverside Partners, L.P.", "COMPANY"), ["Riverside Partners, L.P."]);
  });
});

describe("tipos desativados", () => {
  test("ITIN pode ser desativado à parte do SSN", () => {
    const d = criarDetector({ tiposDesativados: ["ITIN"] });
    assert.deepEqual(
      d("SSN 412-73-9058, ITIN 912-70-1234").map((a) => a.tipo),
      ["SSN"],
    );
  });
});
