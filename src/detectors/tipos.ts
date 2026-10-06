export const TIPOS = [
  "PERSON",
  "COMPANY",
  "CPF",
  "CNPJ",
  "EMAIL",
  "PHONE",
  "CEP",
  "CARD",
  "CASE",
  "OAB",
  "PIS",
  "RG",
  "SSN",
  "ITIN",
  "EIN",
  "ZIP",
  "TERM",
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
  TERM: 100,
  EMAIL: 95,
  CASE: 90,
  CNPJ: 85,
  EIN: 83,
  SSN: 82,
  ITIN: 82,
  CPF: 80,
  CARD: 75,
  PIS: 70,
  OAB: 65,
  RG: 60,
  CEP: 55,
  PHONE: 50,
  ZIP: 45,
  COMPANY: 40,
  PERSON: 30,
};

export type Detector = (texto: string) => Achado[];
