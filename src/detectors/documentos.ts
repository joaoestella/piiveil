import type { Achado, TipoDado } from "./tipos.js";
import {
  UFS,
  validarCartao,
  validarCEP,
  validarCNPJ,
  validarCPF,
  validarPIS,
  validarProcessoCNJ,
  validarTelefone,
} from "./validacao.js";

/** Fronteiras numéricas: o número não pode estar colado em outro dígito ou letra. */
const ANTES = String.raw`(?<![\p{L}\p{N}])(?<![\p{N}][.\/-])`;
const DEPOIS = String.raw`(?![\p{L}\p{N}])(?![.\/-][\p{N}])`;

function re(corpo: string, flags = "gu"): RegExp {
  return new RegExp(ANTES + corpo + DEPOIS, flags);
}

/**
 * Percorre todas as ocorrências de uma expressão e devolve achados para as que
 * passam na validação. Se `grupo` for informado, o achado cobre só aquele grupo
 * (útil quando a expressão inclui uma palavra-chave de contexto).
 */
function coletar(
  texto: string,
  expressao: RegExp,
  tipo: TipoDado,
  validar: (m: RegExpExecArray) => boolean,
  grupo = 0,
): Achado[] {
  const achados: Achado[] = [];
  const rx = new RegExp(expressao.source, expressao.flags.includes("d") ? expressao.flags : expressao.flags + "d");
  for (const m of texto.matchAll(rx)) {
    if (!validar(m)) continue;
    const indices = m.indices?.[grupo];
    if (!indices) continue;
    const [inicio, fim] = indices;
    achados.push({ tipo, inicio, fim, valor: texto.slice(inicio, fim) });
  }
  return achados;
}

export function detectarCPF(texto: string): Achado[] {
  return coletar(texto, re(String.raw`\d{3}\.?\d{3}\.?\d{3}[-.]?\d{2}`), "CPF", (m) => validarCPF(m[0]));
}

export function detectarCNPJ(texto: string): Achado[] {
  const numerico = re(String.raw`\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}`);
  // Formato alfanumérico: exige a pontuação completa para evitar falsos positivos.
  const alfanumerico = re(String.raw`[0-9A-Z]{2}\.[0-9A-Z]{3}\.[0-9A-Z]{3}\/[0-9A-Z]{4}-\d{2}`);
  return [
    ...coletar(texto, numerico, "CNPJ", (m) => validarCNPJ(m[0])),
    ...coletar(texto, alfanumerico, "CNPJ", (m) => /[A-Z]/.test(m[0]) && validarCNPJ(m[0])),
  ];
}

export function detectarEmail(texto: string): Achado[] {
  const rx = /(?<![\p{L}\p{N}._%+-])[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*\.\p{L}{2,}(?![\p{L}\p{N}])/gu;
  return coletar(texto, rx, "EMAIL", (m) => !m[0].startsWith(".") && !m[0].includes(".."));
}

const PALAVRA_TELEFONE = /(?:tel(?:efone)?|fone|cel(?:ular)?|whats(?:app)?|contato|fax)\.?\s*[:\-]?\s*$/iu;

export function detectarTelefone(texto: string): Achado[] {
  const rx = re(
    String.raw`(?<int>\+\s?55[\s.-]?)?(?:(?:\((?<ddd1>0?\d{2})\)|(?<ddd2>0?\d{2}))(?<sep1>[\s.-]?))?(?<a>(?:9[\s.]?)?\d{4})(?<sep2>[\s.-]?)(?<b>\d{4})`,
  );
  return coletar(texto, rx, "PHONE", (m) => {
    const g = m.groups ?? {};
    const dddBruto = g.ddd1 ?? g.ddd2;
    const ddd = dddBruto ? dddBruto.replace(/^0/, "") : undefined;
    const local = (g.a ?? "") + (g.b ?? "");
    if (!validarTelefone(ddd, local)) return false;
    const temParenteses = g.ddd1 !== undefined;
    const temSeparador = (g.sep2 ?? "") !== "" || /[\s.]/.test(g.a ?? "");
    const temInternacional = g.int !== undefined;
    if (ddd === undefined) {
      // Sem DDD só aceita com hífen/espaço e com palavra-chave logo antes (ex.: "Tel.: 3456-7890").
      const antes = texto.slice(Math.max(0, m.index - 25), m.index);
      return temSeparador && PALAVRA_TELEFONE.test(antes);
    }
    if (temParenteses || temInternacional || temSeparador) return true;
    // Totalmente sem formatação: aceita apenas celular com DDD (11 dígitos começando com 9 após o DDD).
    return local.replace(/\D/g, "").length === 9 && (g.sep1 ?? "") === "";
  });
}

export function detectarCEP(texto: string): Achado[] {
  const formatado = re(String.raw`(?:\d{5}-\d{3}|\d{2}\.\d{3}-\d{3})`);
  const comPalavra = /(?<![\p{L}])CEP\s*(?:n[º°o.]*\s*)?[:\-]?\s*(\d{8})(?![\p{N}])/giu;
  return [
    ...coletar(texto, formatado, "CEP", (m) => validarCEP(m[0])),
    ...coletar(texto, comPalavra, "CEP", (m) => validarCEP(m[1] ?? ""), 1),
  ];
}

export function detectarCartao(texto: string): Achado[] {
  const agrupado = re(String.raw`\d{4}(?<s>[ -]?)\d{4}\k<s>\d{4}\k<s>\d{4}(?:\k<s>\d{1,3})?`);
  const amex = re(String.raw`\d{4}(?<s>[ -])\d{6}\k<s>\d{4,5}`);
  const corrido = re(String.raw`\d{13,19}`);
  return [
    ...coletar(texto, agrupado, "CARD", (m) => validarCartao(m[0])),
    ...coletar(texto, amex, "CARD", (m) => validarCartao(m[0])),
    ...coletar(texto, corrido, "CARD", (m) => validarCartao(m[0])),
  ];
}

export function detectarProcessoCNJ(texto: string): Achado[] {
  const formatado = re(String.raw`\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}`);
  const corrido = re(String.raw`\d{20}`);
  return [
    ...coletar(texto, formatado, "CASE", (m) => validarProcessoCNJ(m[0])),
    ...coletar(texto, corrido, "CASE", (m) => validarProcessoCNJ(m[0])),
  ];
}

export function detectarOAB(texto: string): Achado[] {
  const numero = String.raw`\d{1,3}\.\d{3}|\d{2,6}`;
  const ufAntes = new RegExp(
    String.raw`(?<![\p{L}])OAB\s*[\/\-–]?\s*(?<uf>[A-Z]{2})\s*(?:n[º°o.]*\s*)?[:\-]?\s*(?:${numero})(?:-?[A-Z])?(?![\p{L}\p{N}])`,
    "gu",
  );
  const ufDepois = new RegExp(
    String.raw`(?<![\p{L}])OAB\s*(?:n[º°o.]*\s*)?[:\-]?\s*(?:${numero})(?:-?[A-Z])?\s*[\/\-–]\s*(?<uf>[A-Z]{2})(?![\p{L}\p{N}])`,
    "gu",
  );
  const ufValida = (m: RegExpExecArray) => UFS.has(m.groups?.uf ?? "");
  return [...coletar(texto, ufAntes, "OAB", ufValida), ...coletar(texto, ufDepois, "OAB", ufValida)];
}

export function detectarPIS(texto: string): Achado[] {
  const formatado = re(String.raw`\d{3}\.\d{5}\.\d{2}-\d`);
  const comPalavra = /(?<![\p{L}])(?:PIS|PASEP|NIS|NIT)(?:\s*\/\s*PASEP)?\s*(?:n[º°o.]*\s*)?[:\-]?\s*(\d{3}\.?\d{5}\.?\d{2}-?\d)(?![\p{N}])/gu;
  return [
    ...coletar(texto, formatado, "PIS", (m) => validarPIS(m[0])),
    ...coletar(texto, comPalavra, "PIS", (m) => validarPIS(m[1] ?? ""), 1),
  ];
}

export function detectarRG(texto: string): Achado[] {
  // Formato com pontos e hífen (ex.: 12.345.678-9). Sem hífen seria confundido com valores em reais.
  const formatado = re(String.raw`\d{1,2}\.\d{3}\.\d{3}-[\dXx]`);
  // Com a palavra "RG" antes, aceita outros formatos estaduais.
  const comPalavra = /(?<![\p{L}])(?:RG|R\.G\.|Registro Geral|C[ée]dula de Identidade)\s*(?:n[º°o.]*\s*)?[:\-]?\s*(\d[\d.\-]{3,12}[\dXx])(?![\p{L}\p{N}])/giu;
  return [
    ...coletar(texto, formatado, "RG", () => true),
    ...coletar(texto, comPalavra, "RG", (m) => ((m[1] ?? "").replace(/\D/g, "").length >= 5), 1),
  ];
}
