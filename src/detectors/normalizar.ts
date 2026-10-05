/** Remove acentos e passa para minúsculas, para comparar palavras. */
export function normalizarPalavra(palavra: string): string {
  return palavra
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

export function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&");
}
