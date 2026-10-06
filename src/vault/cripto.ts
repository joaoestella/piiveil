import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { msg } from "../i18n.js";

/**
 * Formato do arquivo cifrado:
 *   "PIV1" (4) | modo (1) | sal (16) | iv (12) | tag (16) | texto cifrado
 * modo 0 = chave aleatória guardada em arquivo; modo 1 = chave derivada de senha (scrypt).
 * O cabeçalho inteiro entra como dado autenticado (AAD) do AES-256-GCM.
 */
const MAGICO = Buffer.from("PIV1", "ascii");
const TAM_CABECALHO = 4 + 1 + 16 + 12;
const TAM_TAG = 16;

export type ModoChave = 0 | 1;

export interface MaterialChave {
  modo: ModoChave;
  /** Chave de 32 bytes (modo 0) ou senha (modo 1). */
  segredo: Buffer;
}

export class ErroCofre extends Error {
  override name = "ErroCofre";
}

function derivar(material: MaterialChave, sal: Buffer): Buffer {
  if (material.modo === 0) {
    if (material.segredo.length !== 32) throw new ErroCofre(msg().chaveTamanho());
    return material.segredo;
  }
  return scryptSync(material.segredo, sal, 32, { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
}

export function cifrar(claro: Buffer, material: MaterialChave): Buffer {
  const sal = material.modo === 1 ? randomBytes(16) : Buffer.alloc(16);
  const iv = randomBytes(12);
  const cabecalho = Buffer.concat([MAGICO, Buffer.from([material.modo]), sal, iv]);
  const cifra = createCipheriv("aes-256-gcm", derivar(material, sal), iv);
  cifra.setAAD(cabecalho);
  const corpo = Buffer.concat([cifra.update(claro), cifra.final()]);
  return Buffer.concat([cabecalho, cifra.getAuthTag(), corpo]);
}

export function lerModo(dados: Buffer): ModoChave {
  if (dados.length < TAM_CABECALHO + TAM_TAG || !dados.subarray(0, 4).equals(MAGICO)) {
    throw new ErroCofre(msg().cofreCorrompido());
  }
  const modo = dados[4];
  if (modo !== 0 && modo !== 1) throw new ErroCofre(msg().modoDesconhecido());
  return modo;
}

export function decifrar(dados: Buffer, material: MaterialChave): Buffer {
  const modo = lerModo(dados);
  if (modo !== material.modo) {
    throw new ErroCofre(
      modo === 1 ? msg().cofreComSenha() : msg().cofreComArquivo(),
    );
  }
  const cabecalho = dados.subarray(0, TAM_CABECALHO);
  const sal = dados.subarray(5, 21);
  const iv = dados.subarray(21, 33);
  const tag = dados.subarray(TAM_CABECALHO, TAM_CABECALHO + TAM_TAG);
  const corpo = dados.subarray(TAM_CABECALHO + TAM_TAG);
  const decifra = createDecipheriv("aes-256-gcm", derivar(material, sal), iv);
  decifra.setAAD(cabecalho);
  decifra.setAuthTag(tag);
  try {
    return Buffer.concat([decifra.update(corpo), decifra.final()]);
  } catch {
    throw new ErroCofre(msg().cofreIlegivel());
  }
}
