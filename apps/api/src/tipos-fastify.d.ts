import type { Papel } from '@saturbank/shared';
import type { UsuarioSessao } from './servicos/auth';

declare module 'fastify' {
  interface FastifyContextConfig {
    /** Rota acessível sem login. */
    publico?: boolean;
    /** Papéis autorizados. Toda rota da API precisa declarar `publico` ou `papeis`. */
    papeis?: readonly Papel[];
    /** Rota liberada mesmo com troca de senha pendente. */
    liberadaComTrocaPendente?: boolean;
  }
  interface FastifyRequest {
    usuario: UsuarioSessao | null;
  }
}
