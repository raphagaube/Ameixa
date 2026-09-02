/**
 * Cifragem do refresh token.
 *
 * Existe porque o servidor da Ameixa fala com o Postgres como
 * `authenticated`, o mesmo papel do navegador do dono: toda função que o
 * servidor chama, o navegador também chama. Guardar o token em texto puro
 * no banco — mesmo em schema privado, mesmo atrás de RLS — significa que um
 * script rodando na sessão dele consegue lê-lo.
 *
 * Cifrado, o que sai do banco é embaralhado, e a chave vive só nas
 * variáveis de ambiente do servidor.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITMO = "aes-256-gcm";

function chave(): Buffer {
  const bruta = process.env.AGENDA_CHAVE;
  if (!bruta) {
    throw new Error(
      "AGENDA_CHAVE não configurada. Gere 32 bytes em base64 e cadastre na Vercel.",
    );
  }
  const b = Buffer.from(bruta, "base64");
  if (b.length !== 32) {
    throw new Error(
      `AGENDA_CHAVE precisa ter 32 bytes em base64; tem ${b.length}.`,
    );
  }
  return b;
}

/** Devolve `iv.selo.texto`, tudo em base64url. */
export function cifrar(texto: string, k: Buffer = chave()): string {
  const iv = randomBytes(12);
  const c = createCipheriv(ALGORITMO, k, iv);
  const corpo = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), corpo]
    .map((b) => b.toString("base64url"))
    .join(".");
}

/**
 * Lança se o texto foi adulterado ou a chave está errada — o selo do GCM
 * garante isso. Quem chama trata como "precisa reconectar".
 */
export function decifrar(pacote: string, k: Buffer = chave()): string {
  const partes = pacote.split(".");
  if (partes.length !== 3) throw new Error("Pacote cifrado malformado.");
  const [iv, selo, corpo] = partes.map((p) => Buffer.from(p, "base64url"));
  const d = createDecipheriv(ALGORITMO, k, iv);
  d.setAuthTag(selo);
  return Buffer.concat([d.update(corpo), d.final()]).toString("utf8");
}

/** Só para os testes e para gerar a chave na configuração inicial. */
export function chaveNova(): string {
  return randomBytes(32).toString("base64");
}
