import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Cria um SIGILO_HOME e um diretório de projeto temporários e isolados. */
export function ambienteTemporario(): { home: string; projeto: string; limpar: () => void } {
  const raiz = mkdtempSync(join(tmpdir(), "sigilo-teste-"));
  const home = join(raiz, "home");
  const projeto = join(raiz, "projeto");
  process.env.SIGILO_HOME = home;
  delete process.env.SIGILO_SENHA;
  return {
    home,
    projeto,
    limpar: () => rmSync(raiz, { recursive: true, force: true }),
  };
}

export function fixture(nome: string): string {
  return readFileSync(new URL(`../../../tests/fixtures/${nome}`, import.meta.url), "utf8");
}

export const FIXTURES = ["contrato-locacao.txt", "laudo-medico.txt", "reclamacao-trabalhista.txt", "clientes.csv"];
