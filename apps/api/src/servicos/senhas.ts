import { hash, verify } from '@node-rs/argon2';
import { randomInt } from 'node:crypto';

// @node-rs/argon2 usa Argon2id com m=19 MiB, t=2, p=1 por padrão (recomendação OWASP).
export const gerarHash = (senha: string) => hash(senha);

let hashFicticio: Promise<string> | undefined;

/** Verifica a senha; sem hash (usuário inexistente) gasta o mesmo tempo para não revelar isso. */
export async function conferirSenha(hashSalvo: string | undefined, senha: string): Promise<boolean> {
  hashFicticio ??= hash('senha-ficticia-para-tempo-constante');
  const alvo = hashSalvo ?? (await hashFicticio);
  const ok = await verify(alvo, senha).catch(() => false);
  return ok && hashSalvo !== undefined;
}

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

/** Senha provisória legível (sem caracteres ambíguos como 0/O e 1/l). */
export function gerarSenhaTemporaria(tamanho = 12): string {
  return Array.from({ length: tamanho }, () => ALFABETO[randomInt(ALFABETO.length)]).join('');
}
