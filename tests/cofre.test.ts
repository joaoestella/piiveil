import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { join, resolve } from "node:path";
import { cifrar, decifrar, ErroCofre } from "../src/vault/cripto.js";
import { Cofre, caminhoDoCofre } from "../src/vault/cofre.js";
import { ambienteTemporario } from "./helpers/ambiente.js";

const executar = promisify(execFile);

describe("criptografia", () => {
  const chave = { modo: 0 as const, segredo: Buffer.alloc(32, 7) };

  test("cifra e decifra", () => {
    const claro = Buffer.from("dados sigilosos: Maria", "utf8");
    const c = cifrar(claro, chave);
    assert.ok(!c.includes(Buffer.from("Maria")));
    assert.deepEqual(decifrar(c, chave), claro);
  });

  test("usa IV aleatório a cada gravação", () => {
    const claro = Buffer.from("mesmo conteúdo");
    assert.notDeepEqual(cifrar(claro, chave), cifrar(claro, chave));
  });

  test("detecta adulteração e chave errada", () => {
    const c = cifrar(Buffer.from("abc"), chave);
    const adulterado = Buffer.from(c);
    adulterado[adulterado.length - 1] = (adulterado[adulterado.length - 1] ?? 0) ^ 1;
    assert.throws(() => decifrar(adulterado, chave), ErroCofre);
    assert.throws(() => decifrar(c, { modo: 0, segredo: Buffer.alloc(32, 8) }), ErroCofre);
  });

  test("modo senha", () => {
    const senha = { modo: 1 as const, segredo: Buffer.from("uma senha longa de teste") };
    const c = cifrar(Buffer.from("xyz"), senha);
    assert.equal(decifrar(c, senha).toString(), "xyz");
    assert.throws(() => decifrar(c, { modo: 1, segredo: Buffer.from("outra") }), ErroCofre);
    assert.throws(() => decifrar(c, chave), /criado com senha/);
  });
});

describe("cofre", () => {
  let amb: ReturnType<typeof ambienteTemporario>;
  beforeEach(() => {
    amb = ambienteTemporario();
  });
  afterEach(() => amb.limpar());

  test("mesmo valor recebe sempre o mesmo token; tipos diferentes têm contadores próprios", () => {
    const c = Cofre.abrir(amb.projeto);
    assert.equal(c.tokenPara("Maria Souza", "PESSOA"), "[PESSOA_1]");
    assert.equal(c.tokenPara("João Lima", "PESSOA"), "[PESSOA_2]");
    assert.equal(c.tokenPara("Maria Souza", "PESSOA"), "[PESSOA_1]");
    assert.equal(c.tokenPara("111.444.777-35", "CPF"), "[CPF_1]");
    assert.equal(c.valorDe("[PESSOA_2]"), "João Lima");
    assert.equal(c.valorDe("[PESSOA_9]"), undefined);
  });

  test("persiste cifrado, fora da pasta do projeto, e reabre com os mesmos tokens", () => {
    const c = Cofre.abrir(amb.projeto);
    c.tokenPara("Maria Souza", "PESSOA");
    c.salvar();
    const arquivo = caminhoDoCofre(amb.projeto);
    assert.ok(existsSync(arquivo));
    assert.ok(!resolve(arquivo).startsWith(resolve(amb.projeto)));
    assert.ok(!readFileSync(arquivo).includes(Buffer.from("Maria")));
    const reaberto = Cofre.abrir(amb.projeto);
    assert.equal(reaberto.tokenPara("Maria Souza", "PESSOA"), "[PESSOA_1]");
    assert.equal(reaberto.tokenPara("Outra Pessoa", "PESSOA"), "[PESSOA_2]");
  });

  test("cria a chave com permissão restrita", { skip: process.platform === "win32" }, () => {
    const c = Cofre.abrir(amb.projeto);
    c.tokenPara("x", "TERMO");
    c.salvar();
    const modo = statSync(join(amb.home, "chave")).mode & 0o777;
    assert.equal(modo, 0o600);
  });

  test("projetos diferentes têm cofres diferentes", () => {
    const a = Cofre.abrir(amb.projeto);
    a.tokenPara("Valor A", "TERMO");
    a.salvar();
    const b = Cofre.abrir(amb.projeto + "-outro");
    assert.equal(b.tamanho, 0);
  });

  test("falha de forma clara com chave errada", () => {
    const c = Cofre.abrir(amb.projeto);
    c.tokenPara("x", "TERMO");
    c.salvar();
    writeFileSync(join(amb.home, "chave"), Buffer.alloc(32, 1).toString("base64"));
    assert.throws(() => Cofre.abrir(amb.projeto), ErroCofre);
  });

  test("limpar apaga os valores sem reaproveitar números de token", async () => {
    assert.equal(await Cofre.limpar(amb.projeto), false);
    const c = Cofre.abrir(amb.projeto);
    c.tokenPara("Maria Souza", "PESSOA");
    c.tokenPara("x", "TERMO");
    c.salvar();
    assert.equal(await Cofre.limpar(amb.projeto), true);
    const depois = Cofre.abrir(amb.projeto);
    assert.equal(depois.tamanho, 0);
    assert.equal(depois.valorDe("[PESSOA_1]"), undefined);
    assert.equal(depois.tokenPara("Outra Pessoa", "PESSOA"), "[PESSOA_2]");
    assert.ok(!readFileSync(caminhoDoCofre(amb.projeto)).includes(Buffer.from("Maria")));
  });

  test("limpar remove o arquivo quando ele não pode ser decifrado", async () => {
    const c = Cofre.abrir(amb.projeto);
    c.tokenPara("x", "TERMO");
    c.salvar();
    writeFileSync(join(amb.home, "chave"), Buffer.alloc(32, 1).toString("base64"));
    assert.equal(await Cofre.limpar(amb.projeto), true);
    assert.equal(existsSync(caminhoDoCofre(amb.projeto)), false);
  });

  test("trava evita perda de tokens com processos concorrentes", async () => {
    const script = fileURLToPath(new URL("./helpers/processo-concorrente.js", import.meta.url));
    const env = { ...process.env, SIGILO_HOME: amb.home };
    await Promise.all(
      ["a", "b", "c", "d"].map((p) => executar(process.execPath, [script, amb.projeto, p, "15"], { env })),
    );
    const c = Cofre.abrir(amb.projeto);
    assert.equal(c.tamanho, 60);
    const numeros = c
      .conhecidos()
      .map((k) => c.tokenExistente(k.valor, k.tipo))
      .sort();
    assert.equal(new Set(numeros).size, 60, "tokens não podem se repetir");
  });
});
