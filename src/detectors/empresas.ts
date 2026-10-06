import type { Achado } from "./tipos.js";
import { normalizarPalavra } from "./normalizar.js";

/**
 * Razões sociais: sequência de palavras capitalizadas terminada por um sufixo
 * societário (Ltda, S.A., S/A, EIRELI, EPP, ME, SLU).
 */

const PALAVRA = String.raw`[\p{Lu}\p{N}][\p{L}\p{N}&'’]*(?:-[\p{L}\p{N}]+)*`;
const LIGACAO = String.raw`(?:de|da|do|das|dos|e|&|DE|DA|DO|DAS|DOS|E|em|EM|of|and|the|OF|AND|THE)`;
const SUFIXO_FORTE = String.raw`Ltda\.?|LTDA\.?|S\.\s?A\.?|S\/A|EIRELI|Eireli|SLU|S\.?L\.?U\.?|Inc\.?|INC\.?|LLC|L\.L\.C\.|Corp\.?|CORP\.?|Corporation|CORPORATION|Ltd\.?|LTD\.?|LLP|PLLC|L\.P\.`;
const SUFIXO_FRACO = String.raw`SA|ME|EPP|LP|Co\.|CO\.`;
const RAZAO = new RegExp(
  String.raw`(?<![\p{L}\p{N}])(?<nome>${PALAVRA}(?:[ \u00A0](?:${LIGACAO}[ \u00A0])?${PALAVRA}){0,8})(?:[ \u00A0]?[-–,][ \u00A0]?|[ \u00A0])(?<sufixo>${SUFIXO_FORTE}|${SUFIXO_FRACO})(?![\p{L}\p{N}])`,
  "gud",
);

/** Palavras que costumam vir antes da razão social e não fazem parte dela. */
const INICIAIS_IGNORADAS = new Set(
  [
    "a", "o", "as", "os", "à", "ao", "entre", "pela", "pelo", "com", "para", "de", "da", "do", "e", "que",
    "empresa", "sociedade", "contratante", "contratada", "contratado", "locador", "locadora", "locatario",
    "locataria", "vendedora", "vendedor", "compradora", "comprador", "cliente", "fornecedor", "fornecedora",
    "cedente", "cessionaria", "re", "reu", "autora", "autor", "requerida", "requerente", "reclamada",
    "executada", "exequente", "devedora", "credora", "fiadora", "outorgante", "outorgada", "denominada",
    "doravante", "razao", "social", "nome", "empresarial",
    "the", "by", "between", "and", "with", "for", "plaintiff", "defendant", "company", "client", "contractor",
    "vendor", "landlord", "tenant", "buyer", "seller", "employer", "employee", "lessor", "lessee", "party",
  ].map(normalizarPalavra),
);

export function detectarEmpresas(texto: string): Achado[] {
  const achados: Achado[] = [];
  for (const m of texto.matchAll(RAZAO)) {
    const nome = m.groups?.nome ?? "";
    const sufixo = m.groups?.sufixo ?? "";
    const idxNome = m.indices?.groups?.nome;
    const idxSufixo = m.indices?.groups?.sufixo;
    if (!idxNome || !idxSufixo) continue;

    const palavras = [...nome.matchAll(/\S+/gu)];
    let pular = 0;
    while (pular < palavras.length && INICIAIS_IGNORADAS.has(normalizarPalavra(palavras[pular]?.[0] ?? ""))) pular++;
    const restantes = palavras.slice(pular);
    if (restantes.length === 0) continue;
    // Sufixos curtos e ambíguos exigem ao menos duas palavras no nome.
    if (/^(SA|ME|EPP|LP|Co\.|CO\.)$/.test(sufixo) && restantes.length < 2) continue;
    // Exige ao menos uma palavra com letra (evita "123 Ltda").
    if (!restantes.some((p) => /\p{L}{2,}/u.test(p[0]))) continue;

    const inicio = idxNome[0] + (restantes[0]?.index ?? 0);
    const fim = idxSufixo[1];
    achados.push({ tipo: "COMPANY", inicio, fim, valor: texto.slice(inicio, fim) });
  }
  return achados;
}
