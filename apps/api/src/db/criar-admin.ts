import { carregarConfig } from '../config';
import { gerarHash, gerarSenhaTemporaria } from '../servicos/senhas';
import { criarDb } from './conexao';

/** Cria um administrador com senha provisória (troca obrigatória no primeiro login). */
const [login, ...nome] = process.argv.slice(2);
if (!login || !/^[a-z0-9._-]{3,64}$/.test(login)) {
  console.error('Uso: criar-admin <login> [nome]');
  process.exit(1);
}
const db = criarDb(carregarConfig().databaseUrl);
try {
  const senha = gerarSenhaTemporaria(16);
  await db
    .insertInto('usuario')
    .values({ nome: nome.join(' ') || 'Coordenação', login, senhaHash: await gerarHash(senha), papel: 'ADMIN', trocarSenha: true })
    .execute();
  console.log(`Administrador "${login}" criado. Senha provisória: ${senha}`);
} finally {
  await db.destroy();
}
