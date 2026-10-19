import { type Page, expect, test } from '@playwright/test';

const SENHA = 'Saturno2026!';

async function entrar(page: Page, login: string) {
  await page.goto('/');
  await page.getByLabel(/matrícula ou login/i).fill(login);
  await page.getByLabel(/senha/i).fill(SENHA);
  await page.getByRole('button', { name: /entrar/i }).click();
}

const sair = (page: Page) => page.getByRole('button', { name: 'Sair' }).click();

test.beforeEach(({ page }) => {
  // Qualquer violação de CSP ou erro de script quebra o teste.
  page.on('pageerror', (e) => {
    throw e;
  });
  page.on('console', (m) => {
    if (m.type() === 'error' && /Content Security Policy/.test(m.text())) throw new Error(m.text());
  });
});

test('jornada completa: professor deposita para a turma, cria meta e alunos completam', async ({ page }, info) => {
  // Cada projeto (viewport) usa uma turma diferente para não interferir nos saldos.
  const turma = { 'celular-pequeno': '6º A', android: '7º A', desktop: '8º B' }[info.project.name]!;
  const aluno = { 'celular-pequeno': '2026001', android: '2026009', desktop: '2026017' }[info.project.name]!;
  const prof = { 'celular-pequeno': 'prof.marta', android: 'prof.marta', desktop: 'prof.helena' }[info.project.name]!;

  await entrar(page, prof);
  await expect(page.getByRole('heading', { name: 'Minhas turmas' })).toBeVisible();
  await page.getByRole('link', { name: new RegExp(turma) }).click();

  // Depósito em lote para a turma toda
  await page.getByRole('checkbox', { name: /selecionar todos/i }).check();
  await expect(page.getByText(/8 selecionados/)).toBeVisible();
  await page.getByLabel('Valor para cada aluno').fill('30');
  await page.getByLabel(/motivo/i).fill('Gincana');
  await expect(page.getByText('S$ 240', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /depositar S\$ 30 para 8/i }).click();
  await expect(page.getByText(/depósito feito! total S\$ 240/i)).toBeVisible();
  await page.getByRole('button', { name: 'Concluir' }).click();

  // Nova meta
  await page.getByRole('tab', { name: 'Metas' }).click();
  await page.getByRole('link', { name: /nova meta/i }).click();
  await page.getByText('Jogos de tabuleiro').click();
  await page.getByLabel('Valor da meta').fill('50');
  await page.getByRole('button', { name: /criar meta/i }).click();
  await page.getByRole('tab', { name: 'Metas' }).click();
  await expect(page.getByText(/faltam S\$ 50/i)).toBeVisible();
  await sair(page);

  // Aluno contribui com todo o saldo (30) → faltam 20
  await entrar(page, aluno);
  await expect(page.getByText('S$ 30', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: /jogos de tabuleiro/i }).first().click();
  await page.getByRole('button', { name: /máximo/i }).click();
  await page.getByRole('button', { name: /^contribuir$/i }).click();
  await expect(page.getByText(/não pode ser retirada/i)).toBeVisible();
  await page.getByRole('button', { name: /confirmar/i }).click();
  await expect(page.getByText(/agora faltam S\$ 20/i)).toBeVisible();
  await page.getByRole('link', { name: 'Extrato' }).first().click();
  await expect(page.getByText('Contribuição', { exact: false }).first()).toBeVisible();
  await sair(page);

  // Outro aluno completa a meta
  const colega = String(Number(aluno) + 1);
  await entrar(page, colega);
  await page.getByRole('link', { name: /jogos de tabuleiro/i }).first().click();
  await page.getByRole('button', { name: /máximo \(S\$ 20\)/i }).click();
  await page.getByRole('button', { name: /^contribuir$/i }).click();
  await page.getByRole('button', { name: /confirmar/i }).click();
  await expect(page.getByText(/a turma atingiu a meta/i)).toBeVisible();
  await sair(page);

  // Professor marca como realizada
  await entrar(page, prof);
  await page.getByRole('link', { name: new RegExp(turma) }).click();
  await page.getByRole('tab', { name: 'Metas' }).click();
  await page.getByRole('button', { name: /marcar como realizada/i }).click();
  await expect(page.getByText(/conquistada/i)).toBeVisible();
});

test('login inválido mostra mensagem genérica', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel(/matrícula ou login/i).fill('9999999');
  await page.getByLabel(/senha/i).fill('errada');
  await page.getByRole('button', { name: /entrar/i }).click();
  await expect(page.getByRole('alert')).toHaveText('Login ou senha inválidos.');
});

test('layout não tem rolagem horizontal', async ({ page }) => {
  await entrar(page, 'admin');
  await expect(page.getByRole('heading', { name: 'Coordenação' })).toBeVisible();
  const largura = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(largura).toBeLessThanOrEqual(0);
});
