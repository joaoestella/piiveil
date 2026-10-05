import type { Achado, TipoDado } from "./tipos.js";
import { escaparRegex } from "./normalizar.js";

/**
 * Detector de termos fixos (lista do usuário). A busca ignora maiúsculas e
 * minúsculas e respeita fronteiras de palavra.
 */
export function criarDetectorTermos(termos: readonly string[], tipo: TipoDado) {
  const limpos = [...new Set(termos.map((t) => t.trim()).filter((t) => t.length > 0))];
  if (limpos.length === 0) return (_texto: string): Achado[] => [];
  // Mais longos primeiro, para "Maria da Silva Souza" vencer "Maria da Silva".
  limpos.sort((a, b) => b.length - a.length);
  const rx = new RegExp(
    String.raw`(?<![\p{L}\p{N}])(?:${limpos.map(escaparRegex).join("|")})(?![\p{L}\p{N}])`,
    "giu",
  );
  return (texto: string): Achado[] =>
    [...texto.matchAll(rx)].map((m) => ({
      tipo,
      inicio: m.index,
      fim: m.index + m[0].length,
      valor: m[0],
    }));
}
