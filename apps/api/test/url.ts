export function urlBancoTeste(): string {
  const url = process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/saturbank_test';
  if (!/test/i.test(url)) throw new Error('TEST_DATABASE_URL precisa apontar para um banco de teste (nome com "test")');
  return url;
}
