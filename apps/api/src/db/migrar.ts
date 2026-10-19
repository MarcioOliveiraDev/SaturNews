import { carregarConfig } from '../config';
import { criarDb } from './conexao';
import { migrarParaUltima } from './migrador';

const db = criarDb(carregarConfig().databaseUrl);
try {
  await migrarParaUltima(db);
  console.log('Banco atualizado.');
} finally {
  await db.destroy();
}
