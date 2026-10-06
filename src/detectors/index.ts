import { PRIORIDADE, TIPOS, type Achado, type Detector, type TipoDado } from "./tipos.js";
import {
  detectarCartao,
  detectarCEP,
  detectarCNPJ,
  detectarCPF,
  detectarEmail,
  detectarOAB,
  detectarPIS,
  detectarProcessoCNJ,
  detectarRG,
  detectarTelefone,
} from "./documentos.js";
import { criarDetectorNomes } from "./nomes.js";
import { detectarEmpresas } from "./empresas.js";
import { criarDetectorTermos } from "./termos.js";
import { normalizarPalavra } from "./normalizar.js";

export * from "./tipos.js";
export * from "./validacao.js";

export interface OpcoesDeteccao {
  /** Tipos que não devem ser detectados. */
  tiposDesativados?: readonly TipoDado[];
  /** Termos sempre mascarados como [TERM_n]. */
  termos?: readonly string[];
  /** Nomes de pessoas sempre mascarados como [PERSON_n]. */
  nomes?: readonly string[];
  /** Razões sociais sempre mascaradas como [COMPANY_n]. */
  empresas?: readonly string[];
  /** Prenomes extras para a heurística de nomes. */
  prenomes?: readonly string[];
  /** Trechos que nunca devem ser mascarados (comparação sem acento e sem caixa). */
  ignorar?: readonly string[];
  /** Valores já conhecidos (por exemplo, os do cofre), mascarados onde aparecerem. */
  conhecidos?: ReadonlyArray<{ valor: string; tipo: TipoDado }>;
}

/** Trechos que, por padrão, não são dados pessoais apesar de parecerem nomes. */
const IGNORAR_PADRAO = ["Maria da Penha", "Claude Code"];

/** Padrão dos tokens gerados pelo piiveil, ex.: [PERSON_1]. */
export const PADRAO_TOKEN = new RegExp(String.raw`\[(?:${TIPOS.join("|")})_\d+\]`, "g");

export function criarDetector(opcoes: OpcoesDeteccao = {}): (texto: string) => Achado[] {
  const desativados = new Set(opcoes.tiposDesativados ?? []);
  const detectores: Array<[TipoDado, Detector]> = [
    ["CPF", detectarCPF],
    ["CNPJ", detectarCNPJ],
    ["EMAIL", detectarEmail],
    ["PHONE", detectarTelefone],
    ["CEP", detectarCEP],
    ["CARD", detectarCartao],
    ["CASE", detectarProcessoCNJ],
    ["OAB", detectarOAB],
    ["PIS", detectarPIS],
    ["RG", detectarRG],
    ["COMPANY", detectarEmpresas],
    ["PERSON", criarDetectorNomes({ prenomesExtras: opcoes.prenomes })],
  ];
  const listas: Detector[] = [
    criarDetectorTermos(opcoes.termos ?? [], "TERM"),
    criarDetectorTermos(opcoes.nomes ?? [], "PERSON"),
    criarDetectorTermos(opcoes.empresas ?? [], "COMPANY"),
  ];
  const ignorar = new Set([...IGNORAR_PADRAO, ...(opcoes.ignorar ?? [])].map((t) => normalizarPalavra(t.trim())));

  // Valores conhecidos são buscados literalmente (diferenciando maiúsculas),
  // para que o mesmo trecho receba sempre o mesmo token.
  const conhecidos = [...(opcoes.conhecidos ?? [])].filter((c) => c.valor.length > 0);
  conhecidos.sort((a, b) => b.valor.length - a.valor.length);

  return (texto: string): Achado[] => {
    const candidatos: Achado[] = [];
    for (const [tipo, detector] of detectores) {
      if (desativados.has(tipo)) continue;
      candidatos.push(...detector(texto));
    }
    for (const detector of listas) candidatos.push(...detector(texto));
    for (const c of conhecidos) candidatos.push(...buscarLiteral(texto, c.valor, c.tipo));

    const tokens = [...texto.matchAll(PADRAO_TOKEN)].map((m) => [m.index, m.index + m[0].length] as const);
    const validos = candidatos.filter(
      (a) =>
        !ignorar.has(normalizarPalavra(a.valor)) &&
        !tokens.some(([i, f]) => a.inicio < f && i < a.fim),
    );
    return resolverSobreposicoes(validos);
  };
}

function buscarLiteral(texto: string, valor: string, tipo: TipoDado): Achado[] {
  const achados: Achado[] = [];
  const primeiroEhPalavra = /[\p{L}\p{N}]/u.test(valor[0] ?? "");
  const ultimoEhPalavra = /[\p{L}\p{N}]/u.test(valor[valor.length - 1] ?? "");
  let pos = texto.indexOf(valor);
  while (pos >= 0) {
    const antes = texto[pos - 1] ?? "";
    const depois = texto[pos + valor.length] ?? "";
    const fronteiraAntes = !primeiroEhPalavra || !/[\p{L}\p{N}]/u.test(antes);
    const fronteiraDepois = !ultimoEhPalavra || !/[\p{L}\p{N}]/u.test(depois);
    if (fronteiraAntes && fronteiraDepois) {
      achados.push({ tipo, inicio: pos, fim: pos + valor.length, valor, });
    }
    pos = texto.indexOf(valor, pos + 1);
  }
  return achados;
}

/**
 * Mantém um conjunto de achados sem sobreposição: maior prioridade primeiro,
 * depois o mais longo. Resultado ordenado pela posição no texto.
 */
export function resolverSobreposicoes(achados: Achado[]): Achado[] {
  const ordenados = [...achados].sort((a, b) => {
    const p = PRIORIDADE[b.tipo] - PRIORIDADE[a.tipo];
    if (p !== 0) return p;
    const t = b.fim - b.inicio - (a.fim - a.inicio);
    if (t !== 0) return t;
    return a.inicio - b.inicio;
  });
  const aceitos: Achado[] = [];
  for (const a of ordenados) {
    if (aceitos.some((b) => a.inicio < b.fim && b.inicio < a.fim)) continue;
    aceitos.push(a);
  }
  return aceitos.sort((a, b) => a.inicio - b.inicio);
}
