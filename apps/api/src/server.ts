import { construirApp } from './app';
import { carregarConfig } from './config';
import { criarDb } from './db/conexao';

const config = carregarConfig();
const db = criarDb(config.databaseUrl);
const app = await construirApp({ config, db });

const encerrar = async () => {
  await app.close();
  await db.destroy();
  process.exit(0);
};
process.on('SIGTERM', encerrar);
process.on('SIGINT', encerrar);

await app.listen({ port: config.porta, host: '0.0.0.0' });
