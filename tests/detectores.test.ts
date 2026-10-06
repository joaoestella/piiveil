import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { criarDetector, type TipoDado } from "../src/detectors/index.js";
import { agrupar4, gerarCartao, gerarCNPJ, gerarCPF, gerarPIS, gerarProcesso } from "./helpers/gerar.js";

const detectar = criarDetector();

function achar(texto: string, tipo?: TipoDado): string[] {
  return detectar(texto)
    .filter((a) => !tipo || a.tipo === tipo)
    .map((a) => a.valor);
}

function tipos(texto: string): string[] {
  return detectar(texto).map((a) => `${a.tipo}:${a.valor}`);
}

describe("CPF", () => {
  const cpf = gerarCPF("123456789");
  test("detecta formatado e corrido", () => {
    assert.deepEqual(achar(`CPF nº ${cpf}, residente`, "CPF"), [cpf]);
    assert.deepEqual(achar(`cpf ${cpf.replace(/\D/g, "")}.`, "CPF"), [cpf.replace(/\D/g, "")]);
  });
  test("ignora CPF com dígito inválido", () => {
    assert.deepEqual(achar("CPF 123.456.789-00"), []);
  });
  test("não pega pedaço de número maior", () => {
    const corrido = cpf.replace(/\D/g, "");
    assert.deepEqual(achar(`código 9${corrido}9`, "CPF"), []);
  });
});

describe("CNPJ", () => {
  test("detecta numérico e alfanumérico", () => {
    const num = gerarCNPJ("112223330001");
    assert.deepEqual(achar(`inscrita no CNPJ ${num}`, "CNPJ"), [num]);
    assert.deepEqual(achar("CNPJ 12.ABC.345/01DE-35", "CNPJ"), ["12.ABC.345/01DE-35"]);
  });
  test("ignora inválido", () => {
    assert.deepEqual(achar("CNPJ 11.222.333/0001-99"), []);
  });
});

describe("e-mail", () => {
  test("detecta", () => {
    assert.deepEqual(achar("escreva para fulano.teste+1@exemplo.com.br hoje", "EMAIL"), ["fulano.teste+1@exemplo.com.br"]);
  });
  test("não confunde menção em rede social", () => {
    assert.deepEqual(achar("siga @exemplo no perfil", "EMAIL"), []);
  });
});

describe("telefone", () => {
  test("detecta formatos comuns", () => {
    for (const t of ["(11) 98765-4321", "+55 21 3456-7890", "11 98765-4321", "(48)3333-2222", "11987654321", "+55 (31) 9 8888-7777"]) {
      assert.deepEqual(achar(`ligue ${t} amanhã`, "PHONE"), [t], t);
    }
  });
  test("sem DDD só com palavra-chave", () => {
    assert.deepEqual(achar("Tel.: 3456-7890", "PHONE"), ["3456-7890"]);
    assert.deepEqual(achar("vigência 2024-2025", "PHONE"), []);
  });
  test("ignora DDD inexistente e números soltos", () => {
    assert.deepEqual(achar("(10) 98765-4321", "PHONE"), []);
    assert.deepEqual(achar("pedido 12345678", "PHONE"), []);
    assert.deepEqual(achar("total 1234567890", "PHONE"), []);
  });
});

describe("CEP", () => {
  test("detecta formatado e com palavra-chave", () => {
    assert.deepEqual(achar("CEP 01310-100, São Paulo", "CEP"), ["01310-100"]);
    assert.deepEqual(achar("CEP: 01310100", "CEP"), ["01310100"]);
    assert.deepEqual(achar("CEP 01.310-100", "CEP"), ["01.310-100"]);
  });
  test("ignora oito dígitos sem contexto", () => {
    assert.deepEqual(achar("nota 01310100", "CEP"), []);
  });
});

describe("cartão", () => {
  test("detecta agrupado e corrido", () => {
    const n = gerarCartao("552233445566778");
    assert.deepEqual(achar(`cartão ${agrupar4(n)} validade`, "CARD"), [agrupar4(n)]);
    assert.deepEqual(achar(`cartão ${agrupar4(n, "-")}`, "CARD"), [agrupar4(n, "-")]);
    assert.deepEqual(achar(`cartão ${n}`, "CARD"), [n]);
  });
  test("ignora Luhn inválido", () => {
    assert.deepEqual(achar("4111 1111 1111 1112", "CARD"), []);
  });
});

describe("processo CNJ", () => {
  test("detecta formatado", () => {
    const p = gerarProcesso("0001234", "2024", "8", "26", "0100");
    assert.deepEqual(tipos(`Processo nº ${p}, 2ª Vara`), [`CASE:${p}`]);
  });
  test("ignora DV errado", () => {
    assert.deepEqual(achar("Processo 0001234-00.2024.8.26.0100", "CASE"), []);
  });
});

describe("OAB", () => {
  test("detecta variações", () => {
    assert.deepEqual(achar("advogado, OAB/SP 123.456, com escritório", "OAB"), ["OAB/SP 123.456"]);
    assert.deepEqual(achar("OAB-RJ nº 98765", "OAB"), ["OAB-RJ nº 98765"]);
    assert.deepEqual(achar("inscrito na OAB nº 45.678/MG", "OAB"), ["OAB nº 45.678/MG"]);
  });
  test("ignora UF inexistente", () => {
    assert.deepEqual(achar("OAB/XX 123456", "OAB"), []);
  });
});

describe("PIS/NIS", () => {
  test("detecta formatado e com palavra-chave", () => {
    const pis = gerarPIS("1701234567");
    assert.deepEqual(achar(`PIS ${pis}`, "PIS"), [pis]);
    const corrido = pis.replace(/\D/g, "");
    // Corrido, 11 dígitos: pode também ser um CPF válido; aqui só vale com a palavra-chave.
    const r = detectar(`NIS: ${corrido}`);
    assert.equal(r.length, 1);
    assert.ok(r[0]!.tipo === "PIS" || r[0]!.tipo === "CPF");
  });
  test("ignora dígito errado", () => {
    assert.deepEqual(achar("PIS 120.34567.89-8", "PIS"), []);
  });
});

describe("RG", () => {
  test("detecta formato com pontos e com palavra-chave", () => {
    assert.deepEqual(achar("portadora do RG 12.345.678-9 SSP/SP", "RG"), ["12.345.678-9"]);
    assert.deepEqual(achar("RG nº 1234567", "RG"), ["1234567"]);
    assert.deepEqual(achar("RG: MG-12.345.678", "RG"), []);
  });
  test("não confunde valor em reais", () => {
    assert.deepEqual(achar("valor de R$ 12.345.678,90", "RG"), []);
  });
});

describe("nomes de pessoas", () => {
  test("nome com partículas e caixa alta", () => {
    assert.deepEqual(achar("O contrato foi assinado por Maria da Silva Souza ontem.", "PERSON"), ["Maria da Silva Souza"]);
    assert.deepEqual(achar("CONTRATANTE: JOÃO PEDRO DOS SANTOS, brasileiro", "PERSON"), ["JOÃO PEDRO DOS SANTOS"]);
  });
  test("separa qualificação e cargo", () => {
    assert.deepEqual(achar("Contratante Ana Beatriz Ramos Brasileira", "PERSON"), ["Ana Beatriz Ramos"]);
  });
  test("prenome sozinho só com pronome de tratamento", () => {
    assert.deepEqual(achar("Conversei com Maria ontem.", "PERSON"), []);
    assert.deepEqual(achar("Atendido pela Dra. Helena na clínica.", "PERSON"), ["Helena"]);
  });
  test("falsos positivos comuns: lugares, instituições e leis", () => {
    assert.deepEqual(achar("Comarca de São Paulo, Estado de Santa Catarina", "PERSON"), []);
    assert.deepEqual(achar("na Rua Paulo Freire, 100", "PERSON"), []);
    assert.deepEqual(achar("Tribunal de Justiça do Estado de São Paulo", "PERSON"), []);
    assert.deepEqual(achar("nos termos da Lei Maria da Penha", "PERSON"), []);
    assert.deepEqual(achar("São José dos Campos", "PERSON"), []);
  });
  test("dois nomes ligados por 'e' viram dois achados", () => {
    assert.deepEqual(achar("Testemunhas: Carlos Alberto Nunes e Fernanda Lima Rocha.", "PERSON"), [
      "Carlos Alberto Nunes",
      "Fernanda Lima Rocha",
    ]);
  });
  test("colunas de assinatura separadas por vários espaços viram nomes distintos", () => {
    assert.deepEqual(achar("HELENA MARQUES DE OLIVEIRA          Rafael Augusto Nogueira", "PERSON"), [
      "HELENA MARQUES DE OLIVEIRA",
      "Rafael Augusto Nogueira",
    ]);
  });
  test("prenomes e nomes extras do usuário", () => {
    const d = criarDetector({ prenomes: ["Kauê"], nomes: ["Zuleide Pimenta"] });
    assert.deepEqual(
      d("Kauê Andrade e zuleide pimenta").map((a) => `${a.tipo}:${a.valor}`),
      ["PERSON:Kauê Andrade", "PERSON:zuleide pimenta"],
    );
  });
});

describe("empresas", () => {
  test("razões sociais com sufixo", () => {
    assert.deepEqual(achar("A contratada Alfa Comércio de Alimentos Ltda. sediada", "COMPANY"), ["Alfa Comércio de Alimentos Ltda."]);
    assert.deepEqual(achar("Banco Fictício Beta S.A., instituição", "COMPANY"), ["Banco Fictício Beta S.A."]);
    assert.deepEqual(achar("GAMA SERVIÇOS EIRELI", "COMPANY"), ["GAMA SERVIÇOS EIRELI"]);
    assert.deepEqual(achar("Padaria Pão Quente - ME", "COMPANY"), ["Padaria Pão Quente - ME"]);
  });
  test("vence a heurística de nomes quando a razão social contém um nome", () => {
    assert.deepEqual(tipos("José Carlos Ferreira Transportes Ltda"), ["COMPANY:José Carlos Ferreira Transportes Ltda"]);
  });
  test("ignora sufixo ambíguo com uma palavra só", () => {
    assert.deepEqual(achar("CHAME ME", "COMPANY"), []);
  });
});

describe("termos, ignorados e tokens", () => {
  test("termos do usuário viram TERM", () => {
    const d = criarDetector({ termos: ["Projeto Fênix"] });
    assert.deepEqual(d("o projeto fênix começa").map((a) => `${a.tipo}:${a.valor}`), ["TERM:projeto fênix"]);
  });
  test("lista de ignorados", () => {
    const d = criarDetector({ ignorar: ["Paulo Freire"] });
    assert.deepEqual(d("obra de Paulo Freire").length, 0);
  });
  test("tipos desativados", () => {
    const d = criarDetector({ tiposDesativados: ["EMAIL"] });
    assert.deepEqual(d("a@b.com.br").length, 0);
  });
  test("não detecta dentro de tokens já existentes", () => {
    assert.deepEqual(detectar("[PERSON_1] e [COMPANY_2] assinaram"), []);
  });
});

describe("documento misto", () => {
  test("encontra cada dado uma única vez, sem sobreposição", () => {
    const cpf = gerarCPF("529982247");
    const cnpj = gerarCNPJ("123456780001");
    const texto = [
      "CONTRATO DE PRESTAÇÃO DE SERVIÇOS",
      `CONTRATANTE: Mariana Albuquerque Teixeira, brasileira, CPF ${cpf}, e-mail mariana.teste@exemplo.com.br,`,
      `telefone (21) 99876-5432, residente na Rua das Acácias, 45, CEP 22041-001.`,
      `CONTRATADA: Delta Tecnologia Ltda, CNPJ ${cnpj}.`,
    ].join("\n");
    assert.deepEqual(tipos(texto), [
      "PERSON:Mariana Albuquerque Teixeira",
      `CPF:${cpf}`,
      "EMAIL:mariana.teste@exemplo.com.br",
      "PHONE:(21) 99876-5432",
      "CEP:22041-001",
      "COMPANY:Delta Tecnologia Ltda",
      `CNPJ:${cnpj}`,
    ]);
  });
});
