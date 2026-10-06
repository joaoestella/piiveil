import type { Achado } from "./tipos.js";
import { PRENOMES, PRENOMES_EUA } from "./dados/prenomes.js";
import { normalizarPalavra } from "./normalizar.js";

/**
 * Heurística de nomes de pessoas:
 * 1. encontra sequências de palavras capitalizadas (ou em caixa alta), com
 *    partículas como "da", "de", "dos" entre elas;
 * 2. corta a sequência em palavras de função (cargos, qualificações, meses...);
 * 3. dentro de cada trecho, o nome começa no primeiro prenome conhecido e vai
 *    até a última palavra; precisa ter pelo menos prenome + sobrenome, exceto
 *    quando vem logo após um pronome de tratamento (Sr., Dra. etc.).
 */

const TITULO = String.raw`\p{Lu}\p{Ll}+(?:-\p{Lu}\p{Ll}+)*`;
const CAIXA_ALTA = String.raw`\p{Lu}{2,}(?:-\p{Lu}{2,})*`;
const PALAVRA = `(?:${TITULO}|${CAIXA_ALTA})`;
const PARTICULA = String.raw`(?:d[aeo]s?|D[AEO]S?|di|du|del|della|van|von|der)`;
const SEQUENCIA = new RegExp(
  String.raw`(?<![\p{L}\p{N}_])${PALAVRA}(?:[ \u00A0](?:${PARTICULA}[ \u00A0])?${PALAVRA})*(?![\p{L}\p{N}_])`,
  "gu",
);
const PALAVRA_SOLTA = new RegExp(`${PALAVRA}|${PARTICULA}`, "gu");
const RE_PARTICULA = new RegExp(`^${PARTICULA}$`, "u");

/** Palavras que encerram um trecho; o que vem depois pode ser outro nome. */
const CORTE = new Set(
  [
    "cpf", "rg", "cnpj", "oab", "cep", "pis", "nis", "ctps", "cnh", "ltda", "eireli", "epp", "mei",
    "brasileiro", "brasileira", "estrangeiro", "estrangeira", "solteiro", "solteira", "casado", "casada",
    "divorciado", "divorciada", "viuvo", "viuva", "separado", "separada", "portador", "portadora",
    "inscrito", "inscrita", "residente", "domiciliado", "domiciliada", "nascido", "nascida", "maior", "menor",
    "contratante", "contratantes", "contratada", "contratado", "contratadas", "autor", "autora", "autores",
    "reu", "re", "reus", "requerente", "requerido", "requerida", "exequente", "executado", "executada",
    "impetrante", "impetrado", "reclamante", "reclamada", "reclamado", "apelante", "apelado", "apelada",
    "agravante", "agravado", "agravada", "embargante", "embargado", "embargada", "interessado", "interessada",
    "advogado", "advogada", "procurador", "procuradora", "doutor", "doutora", "dr", "dra", "sr", "sra", "srta",
    "senhor", "senhora", "dona", "dom", "prof", "profa", "professor", "professora", "eng", "engenheiro",
    "engenheira", "testemunha", "testemunhas", "paciente", "medico", "medica", "enfermeiro", "enfermeira",
    "cliente", "locador", "locadora", "locatario", "locataria", "fiador", "fiadora", "vendedor", "vendedora",
    "comprador", "compradora", "outorgante", "outorgado", "outorgada", "credor", "credora", "devedor", "devedora",
    "responsavel", "representante", "socio", "socia", "administrador", "administradora", "diretor", "diretora",
    "gerente", "presidente", "assinatura", "nome", "filiacao", "pai", "mae", "conjuge", "esposa", "esposo",
    "janeiro", "fevereiro", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro",
    "novembro", "dezembro", "segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo",
    "clausula", "artigo", "art", "paragrafo", "inciso", "capitulo", "secao", "anexo", "item", "contrato",
    "termo", "laudo", "parecer", "relatorio", "atestado", "procuracao", "declaracao", "certidao", "pessoa",
    "empresa", "termo", "processo", "telefone", "email",
    // Inglês
    "ssn", "itin", "ein", "inc", "llc", "corp", "ltd", "llp", "plaintiff", "plaintiffs", "defendant", "defendants",
    "petitioner", "respondent", "appellant", "appellee", "attorney", "esq", "counsel", "tenant", "landlord",
    "buyer", "seller", "employer", "employee", "witness", "witnesses", "patient", "doctor", "judge", "mr", "mrs",
    "ms", "miss", "mx", "sir", "madam", "name", "signature", "signed", "date", "address", "phone", "dear",
    "january", "february", "march", "april", "june", "july", "august", "september", "october", "november",
    "december", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "and", "or",
    "section", "article", "exhibit", "page", "agreement", "contract", "lease", "report", "the", "of", "to",
    "about", "as", "in", "on", "at", "for", "with", "from", "by", "into", "over", "after", "before", "is", "are",
    "was", "be", "new", "how", "what", "why", "when", "where", "your", "our", "my", "this", "that", "these",
    "those", "all", "more", "read", "view", "edit", "save", "open", "close", "see", "get", "set", "add", "use",
    "notes", "note", "summary", "overview", "introduction", "chapter", "part", "step", "guide",
  ].map(normalizarPalavra),
);

/** Palavras que indicam lugar ou instituição: o restante da sequência não é nome de pessoa. */
const LUGAR = new Set(
  [
    "sao", "santa", "santo", "rua", "r", "avenida", "av", "travessa", "alameda", "praca", "rodovia",
    "estrada", "largo", "bairro", "vila", "jardim", "parque", "cidade", "edificio", "condominio",
    "conjunto", "residencial", "loteamento", "hospital", "clinica", "escola", "colegio", "universidade",
    "faculdade", "fazenda", "sitio", "chacara", "lei", "decreto", "banco", "instituto", "fundacao",
    "associacao", "igreja", "paroquia", "capela", "ponte", "porto", "rio", "lago", "monte", "serra",
    "ilha", "estado", "municipio", "comarca", "vara", "tribunal", "forum", "cartorio", "tabelionato",
    "camara", "senado", "ministerio", "secretaria", "prefeitura", "governo", "delegacia", "aeroporto",
    "estadio", "shopping", "teatro", "museu", "biblioteca", "ginasio", "centro", "nucleo", "unidade",
    "posto", "terminal", "estacao", "rodoviaria",
    // Inglês
    "street", "st", "avenue", "ave", "road", "rd", "boulevard", "blvd", "lane", "ln", "drive", "way", "place",
    "court", "county", "city", "town", "state", "university", "college", "school", "academy", "hospital",
    "clinic", "bank", "church", "park", "lake", "mount", "mt", "fort", "saint", "san", "los", "las", "port",
    "center", "centre", "institute", "foundation", "department", "dept", "district", "highway", "hwy", "suite",
  ].map(normalizarPalavra),
);

const TRATAMENTO = /(?:^|[^\p{L}])(?:Sr|Sra|Srta|Dr|Dra|Dom|Dona|Prof|Profa|Exmo|Exma|Ilmo|Ilma|Sr\(a\)|Mr|Mrs|Ms|Miss|Mx)\.?[ \u00A0]$/u;

interface Palavra {
  texto: string;
  inicio: number;
  fim: number;
  particula: boolean;
}

export interface OpcoesNomes {
  prenomesExtras?: readonly string[];
}

export function criarDetectorNomes(opcoes: OpcoesNomes = {}) {
  const prenomes = new Set([...PRENOMES, ...PRENOMES_EUA]);
  for (const p of opcoes.prenomesExtras ?? []) prenomes.add(normalizarPalavra(p.trim()));

  return function detectarNomes(texto: string): Achado[] {
    const achados: Achado[] = [];
    for (const m of texto.matchAll(SEQUENCIA)) {
      const base = m.index;
      const palavras: Palavra[] = [];
      for (const p of m[0].matchAll(PALAVRA_SOLTA)) {
        palavras.push({
          texto: p[0],
          inicio: base + p.index,
          fim: base + p.index + p[0].length,
          particula: RE_PARTICULA.test(p[0]),
        });
      }
      for (const trecho of dividirEmTrechos(palavras)) {
        const achado = extrairNome(texto, trecho, prenomes);
        if (achado) achados.push(achado);
      }
    }
    return achados;
  };
}

function dividirEmTrechos(palavras: Palavra[]): Palavra[][] {
  const trechos: Palavra[][] = [];
  let atual: Palavra[] = [];
  let ignorandoLugar = false;
  for (const p of palavras) {
    const n = normalizarPalavra(p.texto);
    if (!p.particula && LUGAR.has(n)) {
      if (atual.length) trechos.push(atual);
      atual = [];
      ignorandoLugar = true;
      continue;
    }
    if (!p.particula && CORTE.has(n)) {
      if (atual.length) trechos.push(atual);
      atual = [];
      ignorandoLugar = false;
      continue;
    }
    if (ignorandoLugar) continue;
    atual.push(p);
  }
  if (atual.length) trechos.push(atual);
  return trechos;
}

function extrairNome(texto: string, trecho: Palavra[], prenomes: Set<string>): Achado | null {
  const inicio = trecho.findIndex((p) => !p.particula && prenomes.has(normalizarPalavra(p.texto)));
  if (inicio < 0) return null;
  let fim = trecho.length - 1;
  while (fim > inicio && trecho[fim]?.particula) fim--;
  const partes = trecho.slice(inicio, fim + 1).filter((p) => !p.particula);
  // Sequências longas demais costumam ser títulos, não nomes de pessoas.
  if (partes.length > 6) return null;
  const primeira = trecho[inicio] as Palavra;
  const ultima = trecho[fim] as Palavra;
  if (partes.length < 2) {
    const antes = texto.slice(Math.max(0, primeira.inicio - 12), primeira.inicio);
    if (!TRATAMENTO.test(antes)) return null;
  }
  return {
    tipo: "PERSON",
    inicio: primeira.inicio,
    fim: ultima.fim,
    valor: texto.slice(primeira.inicio, ultima.fim),
  };
}
