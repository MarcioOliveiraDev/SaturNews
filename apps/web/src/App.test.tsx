import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { renderizar, simularApi } from './teste-utils';

afterEach(() => vi.restoreAllMocks());

const prof = { id: 'p', nome: 'Marta Lins', papel: 'PROFESSOR', turma: null, trocarSenha: false, csrfToken: 'c' };

describe('<App>', () => {
  it('após o login, sai da tela de login e mostra a área do usuário', async () => {
    simularApi({
      'GET /me': [401, { codigo: 'NAO_AUTENTICADO' }],
      'POST /auth/login': [200, { usuario: prof }],
      'GET /turmas': [200, [{ id: 't1', nome: '7º A', totalAlunos: 8, metasAbertas: 1 }]],
    });
    renderizar(<App />);

    await userEvent.type(await screen.findByLabelText(/matrícula ou login/i), 'prof.marta');
    await userEvent.type(screen.getByLabelText(/senha/i), 'Saturno2026!');
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByRole('heading', { name: /minhas turmas/i })).toBeInTheDocument();
    expect(await screen.findByText('7º A')).toBeInTheDocument();
  });

  it('ao sair, volta para a tela de login', async () => {
    simularApi({
      'GET /me': [200, prof],
      'GET /turmas': [200, []],
      'POST /auth/logout': [204, null],
    });
    renderizar(<App />);
    await userEvent.click(await screen.findByRole('button', { name: /sair/i }));
    expect(await screen.findByLabelText(/matrícula ou login/i)).toBeInTheDocument();
  });

  it('com troca de senha pendente, mostra a tela de nova senha', async () => {
    simularApi({ 'GET /me': [200, { ...prof, trocarSenha: true }] });
    renderizar(<App />);
    expect(await screen.findByRole('heading', { name: /crie sua senha/i })).toBeInTheDocument();
  });
});
