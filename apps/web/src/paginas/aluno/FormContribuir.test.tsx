import type { MetaDTO } from '@saturbank/shared';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderizar, simularApi } from '../../teste-utils';
import { FormContribuir } from './FormContribuir';

afterEach(() => vi.restoreAllMocks());

const meta: MetaDTO = {
  id: 'm1',
  titulo: 'Sessão de filme',
  icone: 'filme',
  valorAlvo: 200,
  arrecadado: 170,
  falta: 30,
  percentual: 85,
  status: 'ABERTA',
  criadaEm: '2026-10-01T10:00:00.000Z',
};

describe('<FormContribuir>', () => {
  it('o máximo é o menor entre o saldo e o que falta', () => {
    renderizar(<FormContribuir meta={meta} saldo={80} />);
    expect(screen.getByRole('button', { name: /máximo \(S\$ 30\)/i })).toBeInTheDocument();
  });

  it('pede confirmação, avisa que não dá para retirar e envia com chave de idempotência', async () => {
    const api = simularApi({
      'POST /metas/m1/contribuicoes': [201, { saldo: 70, meta: { ...meta, arrecadado: 180, falta: 20, percentual: 90 } }],
    });
    renderizar(<FormContribuir meta={meta} saldo={80} />);

    await userEvent.click(screen.getByRole('button', { name: 'S$ 10' }));
    await userEvent.click(screen.getByRole('button', { name: /contribuir/i }));
    expect(screen.getByText(/não pode ser retirada/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    expect(await screen.findByText(/você colocou S\$ 10/i)).toBeInTheDocument();
    const init = api.mock.calls[0]![1]!;
    expect(JSON.parse(String(init.body))).toEqual({ valor: 10 });
    expect(new Headers(init.headers).get('idempotency-key')).toMatch(/^[\w-]{8,}$/);
  });

  it('não deixa contribuir acima do máximo', async () => {
    renderizar(<FormContribuir meta={meta} saldo={80} />);
    await userEvent.type(screen.getByLabelText(/quanto você quer colocar/i), '50');
    expect(screen.getByRole('button', { name: /contribuir/i })).toBeDisabled();
    expect(screen.getByText(/máximo é S\$ 30/i)).toBeInTheDocument();
  });

  it('sem saldo, explica como conseguir moedas', () => {
    renderizar(<FormContribuir meta={meta} saldo={0} />);
    expect(screen.getByText(/você ainda não tem saldo/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /contribuir/i })).not.toBeInTheDocument();
  });
});
