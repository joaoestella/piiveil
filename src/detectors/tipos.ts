export const TIPOS = [
  "PESSOA",
  "EMPRESA",
  "CPF",
  "CNPJ",
  "EMAIL",
  "TELEFONE",
  "CEP",
  "CARTAO",
  "PROCESSO",
  "OAB",
  "PIS",
  "RG",
  "TERMO",
] as const;

export type TipoDado = (typeof TIPOS)[number];

export interface Achado {
  tipo: TipoDado;
  /** Posição inicial (inclusiva) no texto analisado. */
  inicio: number;
  /** Posição final (exclusiva). */
  fim: number;
  /** Trecho exato do texto, sem normalização. */
  valor: string;
}

/**
 * Prioridade usada para resolver sobreposições: quando dois achados se
 * sobrepõem, vence o de maior prioridade; em caso de empate, o mais longo.
 */
export const PRIORIDADE: Record<TipoDado, number> = {
  TERMO: 100,
  EMAIL: 95,
  PROCESSO: 90,
  CNPJ: 85,
  CPF: 80,
  CARTAO: 75,
  PIS: 70,
  OAB: 65,
  RG: 60,
  CEP: 55,
  TELEFONE: 50,
  EMPRESA: 40,
  PESSOA: 30,
};

export type Detector = (texto: string) => Achado[];
