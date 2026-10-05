/**
 * Geradores de números de documento sintéticos (dígitos verificadores corretos,
 * mas sem relação com pessoas ou empresas reais), usados nos testes.
 */
import { calcularDVProcessoCNJ } from "../../src/detectors/validacao.js";

export function gerarCPF(base9: string, formatado = true): string {
  const dv = (b: string, peso: number) => {
    let s = 0;
    for (let i = 0; i < b.length; i++) s += Number(b[i]) * (peso - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const d1 = dv(base9, 10);
  const d2 = dv(base9 + d1, 11);
  const n = base9 + d1 + d2;
  return formatado ? `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}` : n;
}

export function gerarCNPJ(base12: string, formatado = true): string {
  const val = (c: string) => c.charCodeAt(0) - 48;
  const dv = (b: string, pesos: number[]) => {
    let s = 0;
    for (let i = 0; i < pesos.length; i++) s += val(b[i] as string) * (pesos[i] as number);
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = dv(base12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = dv(base12 + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const n = base12 + d1 + d2;
  return formatado ? `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(8, 12)}-${n.slice(12)}` : n;
}

export function gerarPIS(base10: string, formatado = true): string {
  const pesos = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let s = 0;
  for (let i = 0; i < 10; i++) s += Number(base10[i]) * (pesos[i] as number);
  const r = 11 - (s % 11);
  const n = base10 + (r >= 10 ? 0 : r);
  return formatado ? `${n.slice(0, 3)}.${n.slice(3, 8)}.${n.slice(8, 10)}-${n.slice(10)}` : n;
}

export function gerarCartao(prefixoSemDV: string): string {
  // Calcula o último dígito pelo algoritmo de Luhn.
  for (let dv = 0; dv <= 9; dv++) {
    const n = prefixoSemDV + dv;
    let soma = 0;
    let dobrar = false;
    for (let i = n.length - 1; i >= 0; i--) {
      let d = Number(n[i]);
      if (dobrar) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      soma += d;
      dobrar = !dobrar;
    }
    if (soma % 10 === 0) return n;
  }
  throw new Error("inalcançável");
}

export function gerarProcesso(seq: string, ano: string, j: string, tr: string, origem: string): string {
  const dv = calcularDVProcessoCNJ(seq, ano, j, tr, origem);
  return `${seq}-${dv}.${ano}.${j}.${tr}.${origem}`;
}

export function agrupar4(n: string, sep = " "): string {
  return n.match(/.{1,4}/g)!.join(sep);
}
