import type { Achado, TipoDado } from "./tipos.js";

/**
 * Detectores de dados pessoais dos Estados Unidos: SSN, ITIN, EIN, telefone
 * no plano de numeração norte-americano (NANP) e ZIP code.
 */

const ANTES = String.raw`(?<![\p{L}\p{N}])(?<![\p{N}][.\/-])`;
const DEPOIS = String.raw`(?![\p{L}\p{N}])(?![.\/-][\p{N}])`;

function coletar(texto: string, rx: RegExp, tipo: TipoDado | ((m: RegExpExecArray) => TipoDado | null), grupo = 0): Achado[] {
  const achados: Achado[] = [];
  const comIndices = new RegExp(rx.source, rx.flags.includes("d") ? rx.flags : rx.flags + "d");
  for (const m of texto.matchAll(comIndices)) {
    const t = typeof tipo === "function" ? tipo(m) : tipo;
    const idx = m.indices?.[grupo];
    if (!t || !idx) continue;
    achados.push({ tipo: t, inicio: idx[0], fim: idx[1], valor: texto.slice(idx[0], idx[1]) });
  }
  return achados;
}

/** Números que a Social Security Administration declarou inválidos por terem sido publicados. */
const SSN_PUBLICADOS = new Set(["078051120", "219099999"]);

/**
 * Classifica 9 dígitos como SSN, ITIN ou nenhum dos dois.
 * SSN: área 001-899 (exceto 666), grupo 01-99, série 0001-9999.
 * ITIN: começa com 9 e o grupo está em 50-65, 70-88, 90-92 ou 94-99.
 */
export function classificarSSN(valor: string): "SSN" | "ITIN" | null {
  const d = valor.replace(/\D/g, "");
  if (d.length !== 9 || SSN_PUBLICADOS.has(d)) return null;
  const area = Number(d.slice(0, 3));
  const grupo = Number(d.slice(3, 5));
  const serie = Number(d.slice(5));
  if (serie === 0) return null;
  if (area >= 900) {
    const itin = (grupo >= 50 && grupo <= 65) || (grupo >= 70 && grupo <= 88) || (grupo >= 90 && grupo <= 92) || grupo >= 94;
    return itin ? "ITIN" : null;
  }
  if (area === 0 || area === 666 || grupo === 0) return null;
  return "SSN";
}

export function detectarSSN(texto: string): Achado[] {
  const tipoDe = (m: RegExpExecArray, g = 0): TipoDado | null => classificarSSN(m[g] ?? "");
  const formatado = new RegExp(ANTES + String.raw`\d{3}(?<s>[- ])\d{2}\k<s>\d{4}` + DEPOIS, "gu");
  const comPalavra = /(?<![\p{L}])(?:SSN|SS#|ITIN|Social Security(?: Number| No\.?)?|TIN)\s*(?:#|No\.?|Number)?\s*[:\-]?\s*(\d{9})(?![\p{N}])/giu;
  return [...coletar(texto, formatado, (m) => tipoDe(m)), ...coletar(texto, comPalavra, (m) => tipoDe(m, 1), 1)];
}

/** Prefixos de EIN atribuídos pelo IRS. */
const PREFIXOS_EIN = new Set(
  [
    ...range(1, 6), ...range(10, 16), ...range(20, 27), ...range(30, 48), ...range(50, 68), ...range(71, 77),
    ...range(80, 88), ...range(90, 95), 98, 99,
  ].map((n) => String(n).padStart(2, "0")),
);

function range(a: number, b: number): number[] {
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}

export function validarEIN(valor: string): boolean {
  const d = valor.replace(/\D/g, "");
  return d.length === 9 && PREFIXOS_EIN.has(d.slice(0, 2)) && !/^(\d)\1+$/.test(d);
}

export function detectarEIN(texto: string): Achado[] {
  const formatado = new RegExp(ANTES + String.raw`\d{2}-\d{7}` + DEPOIS, "gu");
  const comPalavra = /(?<![\p{L}])(?:EIN|FEIN|Employer Identification Number|Federal Tax ID)\s*(?:#|No\.?)?\s*[:\-]?\s*(\d{9})(?![\p{N}])/giu;
  return [
    ...coletar(texto, formatado, (m) => (validarEIN(m[0]) ? "EIN" : null)),
    ...coletar(texto, comPalavra, (m) => (validarEIN(m[1] ?? "") ? "EIN" : null), 1),
  ];
}

const PALAVRA_FONE = /(?:phone|tel|cell|mobile|fax|call|contact)\.?\s*(?:#|no\.?|number)?\s*[:\-]?\s*$/iu;

/**
 * Telefone NANP: código de área e prefixo começam com 2-9 e não terminam em
 * "11" (N11 são serviços). Exige formatação ou +1; dez dígitos corridos só
 * com palavra-chave antes.
 */
export function detectarTelefoneEUA(texto: string): Achado[] {
  const rx = new RegExp(
    ANTES +
      String.raw`(?<int>\+?1[\s.-]?)?(?:\((?<area1>[2-9]\d{2})\)|(?<area2>[2-9]\d{2}))(?<s1>[\s.-]?)(?<prefixo>[2-9]\d{2})(?<s2>[\s.-]?)(?<linha>\d{4})` +
      DEPOIS,
    "gu",
  );
  return coletar(texto, rx, (m) => {
    const g = m.groups ?? {};
    const area = g.area1 ?? g.area2 ?? "";
    const prefixo = g.prefixo ?? "";
    if (/11$/.test(area) || /11$/.test(prefixo)) return null;
    const formatado = g.area1 !== undefined || (g.s1 !== "" && g.s2 !== "") || (g.int !== undefined && g.int.startsWith("+"));
    if (formatado) return "PHONE";
    const antes = texto.slice(Math.max(0, m.index - 25), m.index);
    return PALAVRA_FONE.test(antes) ? "PHONE" : null;
  });
}

const ESTADOS = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC", "PR", "GU", "VI", "AS", "MP",
]);

/** ZIP code: ZIP+4 sempre; cinco dígitos só após sigla de estado ou a palavra ZIP. */
export function detectarZIP(texto: string): Achado[] {
  const zip4 = new RegExp(ANTES + String.raw`\d{5}-\d{4}` + DEPOIS, "gu");
  const aposEstado = /(?<![\p{L}])(?<uf>[A-Z]{2}),?[  ](\d{5})(?![\p{N}-])/gu;
  const comPalavra = /(?<![\p{L}])ZIP(?:[ -]?code)?\s*[:\-]?\s*(\d{5})(?![\p{N}-])/giu;
  return [
    ...coletar(texto, zip4, (m) => (/^0{5}/.test(m[0]) ? null : "ZIP")),
    ...coletar(texto, aposEstado, (m) => (ESTADOS.has(m.groups?.uf ?? "") && m[2] !== "00000" ? "ZIP" : null), 2),
    ...coletar(texto, comPalavra, (m) => (m[1] !== "00000" ? "ZIP" : null), 1),
  ];
}
