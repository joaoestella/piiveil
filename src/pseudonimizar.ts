import { criarDetector, PADRAO_TOKEN, type Achado, type OpcoesDeteccao } from "./detectors/index.js";
import type { Cofre } from "./vault/cofre.js";

export interface ResultadoMascara {
  texto: string;
  achados: Achado[];
  /** Pares token -> trecho original, na ordem em que aparecem. */
  substituicoes: Array<{ token: string; achado: Achado }>;
}

/**
 * Troca cada dado pessoal encontrado pelo token correspondente no cofre,
 * criando tokens novos quando necessário. Valores já presentes no cofre são
 * reconhecidos literalmente, mesmo que a heurística não os encontrasse.
 */
export function mascarar(texto: string, cofre: Cofre, opcoes: OpcoesDeteccao = {}): ResultadoMascara {
  const detector = criarDetector({ ...opcoes, conhecidos: [...(opcoes.conhecidos ?? []), ...cofre.conhecidos()] });
  const achados = detector(texto);
  const partes: string[] = [];
  const substituicoes: ResultadoMascara["substituicoes"] = [];
  let pos = 0;
  for (const a of achados) {
    const token = cofre.tokenPara(a.valor, a.tipo);
    partes.push(texto.slice(pos, a.inicio), token);
    substituicoes.push({ token, achado: a });
    pos = a.fim;
  }
  partes.push(texto.slice(pos));
  return { texto: partes.join(""), achados, substituicoes };
}

/** Troca os tokens conhecidos pelos valores reais. Tokens desconhecidos ficam como estão. */
export function desmascarar(texto: string, cofre: Cofre): string {
  return texto.replace(PADRAO_TOKEN, (token) => cofre.valorDe(token) ?? token);
}

/** Lista os tokens presentes no texto que não existem no cofre. */
export function tokensDesconhecidos(texto: string, cofre: Cofre): string[] {
  const r = new Set<string>();
  for (const m of texto.matchAll(PADRAO_TOKEN)) if (cofre.valorDe(m[0]) === undefined) r.add(m[0]);
  return [...r];
}

/** Aplica `desmascarar` a todas as strings de um objeto (entrada de ferramenta). */
export function desmascararProfundo<T>(valor: T, cofre: Cofre, transformar?: (s: string) => string): T {
  const f = transformar ?? ((s: string) => desmascarar(s, cofre));
  const visitar = (v: unknown): unknown => {
    if (typeof v === "string") return f(v);
    if (Array.isArray(v)) return v.map(visitar);
    if (v && typeof v === "object") {
      return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, visitar(x)]));
    }
    return v;
  };
  return visitar(valor) as T;
}

export function contemToken(texto: string): boolean {
  PADRAO_TOKEN.lastIndex = 0;
  const r = PADRAO_TOKEN.test(texto);
  PADRAO_TOKEN.lastIndex = 0;
  return r;
}
