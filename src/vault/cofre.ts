import { createHash, randomBytes } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  rmdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { cifrar, decifrar, ErroCofre, type MaterialChave } from "./cripto.js";
import { TIPOS, type TipoDado } from "../detectors/tipos.js";

export { ErroCofre } from "./cripto.js";

/**
 * Cofre: mapa token -> valor real, um por projeto, cifrado com AES-256-GCM.
 *
 * O arquivo fica fora da pasta do projeto (em ~/.sigilo/cofres/), de modo que
 * não pode ser versionado por acidente. A chave é um arquivo aleatório em
 * ~/.sigilo/chave, ou é derivada da variável SIGILO_SENHA quando ela existe.
 */

export interface Entrada {
  valor: string;
  tipo: TipoDado;
}

interface Conteudo {
  versao: 1;
  projeto: string;
  criadoEm: string;
  contadores: Partial<Record<TipoDado, number>>;
  entradas: Record<string, Entrada>;
}

export function diretorioBase(): string {
  return process.env.SIGILO_HOME ? resolve(process.env.SIGILO_HOME) : join(homedir(), ".sigilo");
}

function garantirDiretorio(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
}

/** Lê (ou cria na primeira vez) o material da chave do cofre. */
export function obterMaterialChave(): MaterialChave {
  const senha = process.env.SIGILO_SENHA;
  if (senha && senha.length > 0) return { modo: 1, segredo: Buffer.from(senha, "utf8") };
  const base = diretorioBase();
  const arquivo = join(base, "chave");
  if (existsSync(arquivo)) {
    const chave = Buffer.from(readFileSync(arquivo, "utf8").trim(), "base64");
    if (chave.length !== 32) throw new ErroCofre(`arquivo de chave inválido: ${arquivo}`);
    return { modo: 0, segredo: chave };
  }
  garantirDiretorio(base);
  const chave = randomBytes(32);
  try {
    writeFileSync(arquivo, chave.toString("base64") + "\n", { mode: 0o600, flag: "wx" });
  } catch (e) {
    // Outro processo criou a chave ao mesmo tempo: usa a dele.
    if ((e as NodeJS.ErrnoException).code === "EEXIST") return obterMaterialChave();
    throw e;
  }
  return { modo: 0, segredo: chave };
}

export function caminhoDoCofre(projeto: string): string {
  const id = createHash("sha256").update(resolve(projeto)).digest("hex").slice(0, 24);
  return join(diretorioBase(), "cofres", `${id}.cofre`);
}

const RE_TOKEN = new RegExp(String.raw`^\[(${TIPOS.join("|")})_(\d+)\]$`);

export class Cofre {
  private porToken = new Map<string, Entrada>();
  private porValor = new Map<string, string>();
  private contadores: Partial<Record<TipoDado, number>> = {};
  private alterado = false;
  private criadoEm = new Date().toISOString();

  private constructor(
    readonly projeto: string,
    readonly arquivo: string,
  ) {}

  /** Abre o cofre do projeto; se não existir, começa vazio (só grava ao salvar). */
  static abrir(projeto: string, arquivo = caminhoDoCofre(projeto)): Cofre {
    const cofre = new Cofre(resolve(projeto), arquivo);
    if (existsSync(arquivo)) {
      const claro = decifrar(readFileSync(arquivo), obterMaterialChave());
      cofre.carregar(JSON.parse(claro.toString("utf8")) as Conteudo);
    }
    return cofre;
  }

  /**
   * Abre o cofre com trava exclusiva, executa `fn` e salva se houve mudança.
   * Evita perder tokens quando vários hooks rodam em paralelo.
   */
  static async comTrava<T>(projeto: string, fn: (cofre: Cofre) => T | Promise<T>, arquivo = caminhoDoCofre(projeto)): Promise<T> {
    const liberar = await travar(arquivo);
    try {
      const cofre = Cofre.abrir(projeto, arquivo);
      const resultado = await fn(cofre);
      if (cofre.alterado) cofre.salvar();
      return resultado;
    } finally {
      liberar();
    }
  }

  /**
   * Apaga todos os valores do cofre do projeto. Devolve true se havia um.
   *
   * Os contadores são mantidos para que um token novo nunca reaproveite o
   * número de um token antigo que ainda esteja na conversa: depois de limpar,
   * [PESSOA_1] antigo fica sem valor em vez de passar a apontar para outra pessoa.
   * Se o cofre não puder ser decifrado (chave perdida), o arquivo é removido.
   */
  static async limpar(projeto: string, arquivo = caminhoDoCofre(projeto)): Promise<boolean> {
    if (!existsSync(arquivo)) return false;
    const liberar = await travar(arquivo);
    try {
      let contadores: Partial<Record<TipoDado, number>> | null = null;
      try {
        contadores = Cofre.abrir(projeto, arquivo).contadores;
      } catch {
        contadores = null;
      }
      if (contadores === null) {
        rmSync(arquivo, { force: true });
      } else {
        const vazio = new Cofre(resolve(projeto), arquivo);
        vazio.contadores = { ...contadores };
        vazio.salvar();
      }
      return true;
    } finally {
      liberar();
    }
  }

  private carregar(c: Conteudo): void {
    if (c.versao !== 1) throw new ErroCofre(`versão de cofre não suportada: ${String(c.versao)}`);
    this.criadoEm = c.criadoEm;
    this.contadores = { ...c.contadores };
    for (const [token, entrada] of Object.entries(c.entradas)) {
      this.porToken.set(token, entrada);
      this.porValor.set(chaveValor(entrada.tipo, entrada.valor), token);
    }
  }

  get tamanho(): number {
    return this.porToken.size;
  }

  get modificado(): boolean {
    return this.alterado;
  }

  /** Token já atribuído a um valor, ou um novo token. */
  tokenPara(valor: string, tipo: TipoDado): string {
    const chave = chaveValor(tipo, valor);
    const existente = this.porValor.get(chave);
    if (existente) return existente;
    const n = (this.contadores[tipo] ?? 0) + 1;
    this.contadores[tipo] = n;
    const token = `[${tipo}_${n}]`;
    this.porToken.set(token, { valor, tipo });
    this.porValor.set(chave, token);
    this.alterado = true;
    return token;
  }

  valorDe(token: string): string | undefined {
    return this.porToken.get(token)?.valor;
  }

  tokenExistente(valor: string, tipo: TipoDado): string | undefined {
    return this.porValor.get(chaveValor(tipo, valor));
  }

  /** Valores conhecidos, para a detecção literal em textos futuros. */
  conhecidos(): Array<{ valor: string; tipo: TipoDado }> {
    return [...this.porToken.values()].map((e) => ({ valor: e.valor, tipo: e.tipo }));
  }

  /** Contagem de entradas por tipo (sem expor valores). */
  resumo(): Partial<Record<TipoDado, number>> {
    const r: Partial<Record<TipoDado, number>> = {};
    for (const e of this.porToken.values()) r[e.tipo] = (r[e.tipo] ?? 0) + 1;
    return r;
  }

  static ehToken(texto: string): boolean {
    return RE_TOKEN.test(texto);
  }

  salvar(): void {
    const conteudo: Conteudo = {
      versao: 1,
      projeto: this.projeto,
      criadoEm: this.criadoEm,
      contadores: this.contadores,
      entradas: Object.fromEntries(this.porToken),
    };
    const dados = cifrar(Buffer.from(JSON.stringify(conteudo), "utf8"), obterMaterialChave());
    garantirDiretorio(dirname(this.arquivo));
    const temporario = `${this.arquivo}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
    writeFileSync(temporario, dados, { mode: 0o600 });
    renameSync(temporario, this.arquivo);
    try {
      chmodSync(this.arquivo, 0o600);
    } catch {
      // Em alguns sistemas de arquivos (ex.: Windows) chmod não tem efeito.
    }
    this.alterado = false;
  }
}

function chaveValor(tipo: TipoDado, valor: string): string {
  return `${tipo}\u0000${valor}`;
}

const ESPERA_MAXIMA_MS = 8000;
const TRAVA_VENCIDA_MS = 15000;

/** Trava entre processos baseada em mkdir, que é atômico em todos os sistemas. */
async function travar(arquivo: string): Promise<() => void> {
  const dir = `${arquivo}.trava`;
  garantirDiretorio(dirname(arquivo));
  const inicio = Date.now();
  for (;;) {
    try {
      mkdirSync(dir);
      return () => {
        try {
          rmdirSync(dir);
        } catch {
          // já removida
        }
      };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      try {
        if (Date.now() - statSync(dir).mtimeMs > TRAVA_VENCIDA_MS) {
          rmdirSync(dir);
          continue;
        }
      } catch {
        continue;
      }
      if (Date.now() - inicio > ESPERA_MAXIMA_MS) throw new ErroCofre("tempo esgotado esperando a trava do cofre");
      await new Promise((r) => setTimeout(r, 15 + Math.random() * 35));
    }
  }
}
