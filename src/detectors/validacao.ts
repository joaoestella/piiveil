/**
 * Funções de validação de dígitos verificadores dos documentos brasileiros.
 * Todas recebem o valor como aparece no texto (com ou sem pontuação).
 */

export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

function todosIguais(valor: string): boolean {
  return /^(.)\1*$/.test(valor);
}

/** CPF: 11 dígitos, dois dígitos verificadores módulo 11. */
export function validarCPF(valor: string): boolean {
  const d = somenteDigitos(valor);
  if (d.length !== 11 || todosIguais(d)) return false;
  const calc = (base: string, pesoInicial: number): number => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (pesoInicial - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  const dv1 = calc(d.slice(0, 9), 10);
  const dv2 = calc(d.slice(0, 10), 11);
  return dv1 === Number(d[9]) && dv2 === Number(d[10]);
}

/** Valor de um caractere do CNPJ (numérico ou alfanumérico): código ASCII menos 48. */
function valorCaractereCNPJ(c: string): number {
  return c.charCodeAt(0) - 48;
}

/**
 * CNPJ: 14 posições, as 12 primeiras podem ser alfanuméricas (formato adotado
 * pela Receita Federal a partir de julho de 2026); os 2 verificadores são numéricos.
 */
export function validarCNPJ(valor: string): boolean {
  const c = valor.toUpperCase().replace(/[.\/\-\s]/g, "");
  if (!/^[0-9A-Z]{12}\d{2}$/.test(c) || todosIguais(c)) return false;
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const dv = (base: string, pesos: number[]): number => {
    let soma = 0;
    for (let i = 0; i < pesos.length; i++) soma += valorCaractereCNPJ(base[i] as string) * (pesos[i] as number);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const dv1 = dv(c.slice(0, 12), pesos1);
  const dv2 = dv(c.slice(0, 12) + String(dv1), pesos2);
  return dv1 === Number(c[12]) && dv2 === Number(c[13]);
}

/** Algoritmo de Luhn, usado em cartões de pagamento. */
export function validarLuhn(valor: string): boolean {
  const d = somenteDigitos(valor);
  if (d.length < 12 || todosIguais(d)) return false;
  let soma = 0;
  let dobrar = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i]);
    if (dobrar) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    soma += n;
    dobrar = !dobrar;
  }
  return soma % 10 === 0;
}

/** Cartão: 13 a 19 dígitos, prefixo de bandeira plausível e Luhn válido. */
export function validarCartao(valor: string): boolean {
  const d = somenteDigitos(valor);
  if (d.length < 13 || d.length > 19) return false;
  if (!/^[2-6]/.test(d)) return false;
  return validarLuhn(d);
}

/**
 * Número único de processo do CNJ (Resolução 65/2008):
 * NNNNNNN-DD.AAAA.J.TR.OOOO, verificador pelo módulo 97 (ISO 7064).
 */
export function validarProcessoCNJ(valor: string): boolean {
  const d = somenteDigitos(valor);
  if (d.length !== 20) return false;
  const n = d.slice(0, 7);
  const dv = d.slice(7, 9);
  const resto = d.slice(9); // AAAA J TR OOOO
  const justica = Number(d[13]);
  if (justica < 1 || justica > 9) return false;
  return BigInt(n + resto + dv) % 97n === 1n;
}

/** Calcula os dígitos verificadores de um processo CNJ (útil para gerar dados fictícios). */
export function calcularDVProcessoCNJ(sequencial: string, ano: string, justica: string, tribunal: string, origem: string): string {
  const base = BigInt(sequencial + ano + justica + tribunal + origem + "00");
  const dv = 98n - (base % 97n);
  return dv.toString().padStart(2, "0");
}

/** PIS/PASEP/NIS/NIT: 11 dígitos, um verificador módulo 11. */
export function validarPIS(valor: string): boolean {
  const d = somenteDigitos(valor);
  if (d.length !== 11 || todosIguais(d)) return false;
  const pesos = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let soma = 0;
  for (let i = 0; i < 10; i++) soma += Number(d[i]) * (pesos[i] as number);
  const r = 11 - (soma % 11);
  const dv = r >= 10 ? 0 : r;
  return dv === Number(d[10]);
}

/** CEP: 8 dígitos, não pode ser todo zero. */
export function validarCEP(valor: string): boolean {
  const d = somenteDigitos(valor);
  return d.length === 8 && !/^0{8}$/.test(d);
}

export const UFS = new Set([
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]);

/** DDDs em uso no Brasil (Anatel). */
export const DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19,
  21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55,
  61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79,
  81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

/**
 * Telefone: número local de 8 dígitos (fixo, começa com 2 a 5) ou 9 dígitos
 * (celular, começa com 9). Se houver DDD, ele precisa existir.
 */
export function validarTelefone(ddd: string | undefined, local: string): boolean {
  const l = somenteDigitos(local);
  if (ddd !== undefined && !DDDS.has(Number(ddd))) return false;
  if (l.length === 9) return l[0] === "9" && !todosIguais(l.slice(1));
  if (l.length === 8) return /^[2-5]/.test(l) && !todosIguais(l);
  return false;
}
