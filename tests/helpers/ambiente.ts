import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Cria um PIIVEIL_HOME e um diretório de projeto temporários e isolados. */
export function ambienteTemporario(): { home: string; projeto: string; limpar: () => void } {
  const raiz = mkdtempSync(join(tmpdir(), "piiveil-teste-"));
  const home = join(raiz, "home");
  const projeto = join(raiz, "projeto");
  process.env.PIIVEIL_HOME = home;
  delete process.env.PIIVEIL_PASSPHRASE;
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
