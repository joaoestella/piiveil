import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Cofre, caminhoDoCofre } from "../src/vault/cofre.js";
import { postToolUse } from "../src/hooks/post-tool-use.js";
import { preToolUse } from "../src/hooks/pre-tool-use.js";
import { fixture } from "./helpers/ambiente.js";
import { entradaRead, prepararHooks, type AmbienteHooks, type Qualquer } from "./helpers/hooks.js";

let h: AmbienteHooks;
let amb: AmbienteHooks["amb"];
let base: AmbienteHooks["base"];
let lerMascarado: AmbienteHooks["lerMascarado"];
beforeEach(() => {
  h = prepararHooks();
  ({ amb, base, lerMascarado } = h);
});
afterEach(() => amb.limpar());

describe("PostToolUse", () => {
  test("Read: mascara o conteúdo e preserva o formato da resposta", async () => {
    const arquivo = join(amb.projeto, "contrato.txt");
    const conteudo = fixture("contrato-locacao.txt");
    writeFileSync(arquivo, conteudo);
    const entrada = entradaRead(arquivo, conteudo);
    const r = (await postToolUse(base("PostToolUse", entrada))) as Qualquer;
    const saida = r.hookSpecificOutput.updatedToolOutput;
    assert.equal(typeof saida, "object", "o Claude Code exige o mesmo formato da resposta original");
    assert.deepEqual(Object.keys(saida), Object.keys(entrada.tool_response));
    assert.deepEqual(Object.keys(saida.file), Object.keys(entrada.tool_response.file));
    assert.equal(saida.type, "text");
    assert.equal(saida.file.numLines, entrada.tool_response.file.numLines);
    assert.equal(saida.file.filePath, arquivo);
    const visto = saida.file.content as string;
    assert.ok(visto.includes("[PERSON_1]"));
    for (const real of ["HELENA MARQUES DE OLIVEIRA", "381.294.057-41", "helena.locadora@exemplo.com.br", "47.281.035/0001-00"]) {
      assert.ok(!visto.includes(real), `vazou: ${real}`);
    }
  });

  test("Bash: mascara stdout e stderr e mantém os demais campos", async () => {
    const resposta = { stdout: "cpf 111.444.777-35", stderr: "aviso: ana@exemplo.com", interrupted: false, isImage: false, noOutputExpected: false };
    const r = (await postToolUse(base("PostToolUse", { tool_name: "Bash", tool_response: resposta }))) as Qualquer;
    assert.deepEqual(r.hookSpecificOutput.updatedToolOutput, {
      stdout: "cpf [CPF_1]",
      stderr: "aviso: [EMAIL_1]",
      interrupted: false,
      isImage: false,
      noOutputExpected: false,
    });
  });

  test("Edit e Write: mascara o trecho devolvido ao modelo, inclusive o arquivo original e o patch", async () => {
    const resposta = {
      filePath: "/p/a.txt",
      oldString: "solteiro",
      newString: "casado",
      originalFile: "Rafael Augusto Nogueira, solteiro, CPF 704.518.236-80",
      structuredPatch: [{ oldStart: 1, oldLines: 1, newStart: 1, newLines: 1, lines: ["-Rafael Augusto Nogueira, solteiro", "+Rafael Augusto Nogueira, casado"] }],
      userModified: false,
      replaceAll: false,
    };
    const r = (await postToolUse(base("PostToolUse", { tool_name: "Edit", tool_response: resposta }))) as Qualquer;
    const s = JSON.stringify(r.hookSpecificOutput.updatedToolOutput);
    assert.ok(!s.includes("Rafael") && !s.includes("704.518.236-80"));
    assert.equal(r.hookSpecificOutput.updatedToolOutput.structuredPatch[0].lines[1], "+[PERSON_1], casado");
    assert.equal(r.hookSpecificOutput.updatedToolOutput.userModified, false);
  });

  test("Grep e Glob: mascara conteúdo e nomes de arquivo", async () => {
    const grep = (await postToolUse(
      base("PostToolUse", {
        tool_name: "Grep",
        tool_response: { mode: "content", numFiles: 0, filenames: [], content: "a.txt:2:CPF 111.444.777-35", numLines: 1 },
      }),
    )) as Qualquer;
    assert.equal(grep.hookSpecificOutput.updatedToolOutput.content, "a.txt:2:CPF [CPF_1]");
    assert.equal(grep.hookSpecificOutput.updatedToolOutput.mode, "content");
    const glob = (await postToolUse(
      base("PostToolUse", { tool_name: "Glob", tool_response: { filenames: ["docs/Laudo Maria Clara Souza.txt", "docs/outro.txt"], numFiles: 2 } }),
    )) as Qualquer;
    assert.deepEqual(glob.hookSpecificOutput.updatedToolOutput.filenames, ["docs/Laudo [PERSON_1].txt", "docs/outro.txt"]);
  });

  test("aceita tool_output em texto, como na documentação", async () => {
    const r = (await postToolUse(base("PostToolUse", { tool_name: "Bash", tool_output: "Sr. João Batista Lima" }))) as Qualquer;
    assert.equal(r.hookSpecificOutput.updatedToolOutput, "Sr. [PERSON_1]");
  });

  test("saída de MCP em lista de blocos de texto", async () => {
    const r = (await postToolUse(
      base("PostToolUse", { tool_name: "mcp__drive__ler", tool_response: [{ type: "text", text: "contato: ana.teste@exemplo.com" }] }),
    )) as Qualquer;
    assert.deepEqual(r.hookSpecificOutput.updatedToolOutput, [{ type: "text", text: "contato: [EMAIL_1]" }]);
  });

  test("não altera saída sem dados pessoais", async () => {
    assert.equal(await postToolUse(base("PostToolUse", { tool_name: "Bash", tool_response: { stdout: "3 arquivos", stderr: "" } })), null);
  });

  test("falha fechada: com o cofre ilegível, o conteúdo é ocultado mantendo o formato", async () => {
    mkdirSync(join(amb.home, "cofres"), { recursive: true });
    writeFileSync(caminhoDoCofre(amb.projeto), "lixo");
    const entrada = entradaRead("/p/laudo.txt", "CPF 111.444.777-35");
    const r = (await postToolUse(base("PostToolUse", entrada))) as Qualquer;
    const saida = r.hookSpecificOutput.updatedToolOutput;
    assert.equal(saida.type, "text");
    assert.equal(saida.file.filePath, "/p/laudo.txt");
    assert.equal(saida.file.numLines, 1);
    assert.ok(saida.file.content.startsWith("[piiveil]"));
    assert.ok(!JSON.stringify(saida).includes("111.444.777-35"));
  });

  test("respeita enabled: false", async () => {
    mkdirSync(join(amb.projeto, ".piiveil"));
    writeFileSync(join(amb.projeto, ".piiveil", "config.json"), JSON.stringify({ enabled: false }));
    assert.equal(await postToolUse(base("PostToolUse", { tool_name: "Bash", tool_output: "CPF 111.444.777-35" })), null);
  });

  test("usa termos da configuração do projeto", async () => {
    mkdirSync(join(amb.projeto, ".piiveil"));
    writeFileSync(join(amb.projeto, ".piiveil", "config.json"), JSON.stringify({ terms: ["Operação Aurora Boreal"] }));
    const r = (await postToolUse(base("PostToolUse", { tool_name: "Grep", tool_output: "ata.txt: Operação Aurora Boreal" }))) as Qualquer;
    assert.equal(r.hookSpecificOutput.updatedToolOutput, "ata.txt: [TERM_1]");
  });
});

describe("PreToolUse", () => {
  test("Edit: old_string com tokens casa com o arquivo real e o resultado tem os dados reais", async () => {
    const arquivo = join(amb.projeto, "contrato.txt");
    const original = fixture("contrato-locacao.txt");
    writeFileSync(arquivo, original);
    const visto = await lerMascarado(arquivo);

    // O modelo escolhe um trecho do que viu e o reescreve.
    const oldString = visto.split("\n").find((l) => l.includes("LOCATÁRIO:"))!;
    assert.ok(oldString.includes("[PERSON_"), "o trecho deve conter tokens");
    const newString = oldString.replace("solteiro", "casado");

    const r = (await preToolUse(
      base("PreToolUse", {
        tool_name: "Edit",
        tool_input: { file_path: arquivo, old_string: oldString, new_string: newString, replace_all: false },
      }),
    )) as Qualquer;
    const input = r.hookSpecificOutput.updatedInput;
    assert.equal(r.hookSpecificOutput.permissionDecision, undefined, "não deve aprovar sozinho a ferramenta");
    assert.ok(!input.old_string.includes("["), "não deve sobrar token");
    assert.ok(original.includes(input.old_string), "old_string desmascarado precisa existir no arquivo real");

    // Aplica a edição como a ferramenta Edit faria.
    const editado = original.replace(input.old_string, input.new_string);
    writeFileSync(arquivo, editado);
    assert.ok(editado.includes("Rafael Augusto Nogueira, brasileiro, casado"));
    assert.ok(editado.includes("704.518.236-80"));
    assert.equal(input.file_path, arquivo);
    assert.equal(input.replace_all, false);
  });

  test("Edit: old_string sem tokens e new_string com tokens (caminho recomendado)", async () => {
    const arquivo = join(amb.projeto, "contrato.txt");
    writeFileSync(arquivo, fixture("contrato-locacao.txt"));
    await lerMascarado(arquivo);
    const r = (await preToolUse(
      base("PreToolUse", {
        tool_name: "Edit",
        tool_input: { file_path: arquivo, old_string: "Testemunhas:", new_string: "Testemunhas (ver [PERSON_2]):", replace_all: false },
      }),
    )) as Qualquer;
    assert.equal(r.hookSpecificOutput.updatedInput.old_string, "Testemunhas:");
    assert.equal(r.hookSpecificOutput.updatedInput.new_string, "Testemunhas (ver Rafael Augusto Nogueira):");
  });

  test("Write: grava os valores reais", async () => {
    const c = Cofre.abrir(amb.projeto);
    c.tokenPara("Maria Souza", "PERSON");
    c.tokenPara("111.444.777-35", "CPF");
    c.salvar();
    const r = (await preToolUse(
      base("PreToolUse", {
        tool_name: "Write",
        tool_input: { file_path: join(amb.projeto, "resumo.md"), content: "# Resumo\n[PERSON_1], CPF [CPF_1]." },
      }),
    )) as Qualquer;
    assert.equal(r.hookSpecificOutput.updatedInput.content, "# Resumo\nMaria Souza, CPF 111.444.777-35.");
  });

  test("NotebookEdit: troca tokens em qualquer campo de texto", async () => {
    const c = Cofre.abrir(amb.projeto);
    c.tokenPara("ana@exemplo.com", "EMAIL");
    c.salvar();
    const r = (await preToolUse(
      base("PreToolUse", {
        tool_name: "NotebookEdit",
        tool_input: { notebook_path: join(amb.projeto, "n.ipynb"), cell_id: "a1", new_source: "email = '[EMAIL_1]'" },
      }),
    )) as Qualquer;
    assert.equal(r.hookSpecificOutput.updatedInput.new_source, "email = 'ana@exemplo.com'");
    assert.equal(r.hookSpecificOutput.updatedInput.cell_id, "a1");
  });

  test("Bash: troca tokens no comando e recusa valores com aspas", async () => {
    const c = Cofre.abrir(amb.projeto);
    c.tokenPara("Maria Souza", "PERSON");
    c.tokenPara("Joana D'Arc Silva", "PERSON");
    c.salvar();
    const ok = (await preToolUse(base("PreToolUse", { tool_name: "Bash", tool_input: { command: 'grep -rn "[PERSON_1]" docs/' } }))) as Qualquer;
    assert.equal(ok.hookSpecificOutput.updatedInput.command, 'grep -rn "Maria Souza" docs/');
    const negado = (await preToolUse(base("PreToolUse", { tool_name: "Bash", tool_input: { command: "echo '[PERSON_2]'" } }))) as Qualquer;
    assert.equal(negado.hookSpecificOutput.permissionDecision, "deny");
  });

  test("Grep: valor real escapado para regex", async () => {
    const c = Cofre.abrir(amb.projeto);
    c.tokenPara("111.444.777-35", "CPF");
    c.salvar();
    const r = (await preToolUse(base("PreToolUse", { tool_name: "Grep", tool_input: { pattern: "CPF:? [CPF_1]", path: "." } }))) as Qualquer;
    assert.equal(r.hookSpecificOutput.updatedInput.pattern, String.raw`CPF:? 111\.444\.777-35`);
  });

  test("sem tokens, não interfere", async () => {
    assert.equal(await preToolUse(base("PreToolUse", { tool_name: "Write", tool_input: { file_path: "a", content: "oi" } })), null);
  });

  test("tokens desconhecidos são mantidos e não alteram a entrada", async () => {
    assert.equal(await preToolUse(base("PreToolUse", { tool_name: "Write", tool_input: { file_path: "a", content: "[PERSON_7]" } })), null);
  });

  test("Read e Glob: caminhos com tokens voltam ao nome real", async () => {
    const c = Cofre.abrir(amb.projeto);
    c.tokenPara("Maria Clara Souza", "PERSON");
    c.salvar();
    const read = (await preToolUse(base("PreToolUse", { tool_name: "Read", tool_input: { file_path: "/docs/Laudo [PERSON_1].txt" } }))) as Qualquer;
    assert.equal(read.hookSpecificOutput.updatedInput.file_path, "/docs/Laudo Maria Clara Souza.txt");
    const pdf = (await preToolUse(base("PreToolUse", { tool_name: "Read", tool_input: { file_path: "/docs/Laudo [PERSON_1].pdf" } }))) as Qualquer;
    assert.equal(pdf.hookSpecificOutput.permissionDecision, "deny");
    const glob = (await preToolUse(base("PreToolUse", { tool_name: "Glob", tool_input: { pattern: "**/*[PERSON_1]*" } }))) as Qualquer;
    assert.equal(glob.hookSpecificOutput.updatedInput.pattern, "**/*Maria Clara Souza*");
  });

  test("Read de PDF e imagem é bloqueado por padrão", async () => {
    const r = (await preToolUse(base("PreToolUse", { tool_name: "Read", tool_input: { file_path: "/x/laudo.PDF" } }))) as Qualquer;
    assert.equal(r.hookSpecificOutput.permissionDecision, "deny");
    assert.equal(await preToolUse(base("PreToolUse", { tool_name: "Read", tool_input: { file_path: "/x/laudo.txt" } })), null);
  });
});

