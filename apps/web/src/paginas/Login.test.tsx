import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderizar, simularApi } from '../teste-utils';
import { Login } from './Login';

afterEach(() => vi.restoreAllMocks());

describe('<Login>', () => {
  it('envia matrícula e senha e guarda o usuário na sessão', async () => {
    const usuario = { id: 'u', nome: 'Ana', papel: 'ALUNO', turma: null, trocarSenha: false, csrfToken: 'x' };
    const api = simularApi({ 'POST /auth/login': [200, { usuario }] });
    const { cliente } = renderizar(<Login />);

    await userEvent.type(screen.getByLabelText(/matrícula ou login/i), '2026001');
    await userEvent.type(screen.getByLabelText(/senha/i), 'Saturno2026!');
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));

    expect(JSON.parse(String(api.mock.calls[0]![1]!.body))).toEqual({ login: '2026001', senha: 'Saturno2026!' });
    await vi.waitFor(() => expect(cliente.getQueryData(['me'])).toEqual(usuario));
  });

  it('mostra mensagem genérica quando as credenciais são inválidas', async () => {
    simularApi({ 'POST /auth/login': [401, { codigo: 'CREDENCIAIS_INVALIDAS' }] });
    renderizar(<Login />);
    await userEvent.type(screen.getByLabelText(/matrícula ou login/i), '2026001');
    await userEvent.type(screen.getByLabelText(/senha/i), 'errada');
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Login ou senha inválidos.');
  });

  it('o campo de senha não é exibido em texto e usa autocomplete correto', () => {
    renderizar(<Login />);
    const senha = screen.getByLabelText(/senha/i);
    expect(senha).toHaveAttribute('type', 'password');
    expect(senha).toHaveAttribute('autocomplete', 'current-password');
  });
});
