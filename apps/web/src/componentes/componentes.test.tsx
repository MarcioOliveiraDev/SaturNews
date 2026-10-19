import type { AlunoResumoDTO, MetaDTO, TransacaoDTO } from '@saturbank/shared';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { CartaoMeta } from './CartaoMeta';
import { CartaoSaldo } from './CartaoSaldo';
import { ItemTransacao } from './ItemTransacao';
import { SeletorAlunos } from './SeletorAlunos';
import { TecladoValor } from './TecladoValor';

const meta = (parcial: Partial<MetaDTO> = {}): MetaDTO => ({
  id: 'm1',
  titulo: 'Sessão de filme',
  icone: 'filme',
  valorAlvo: 200,
  arrecadado: 150,
  falta: 50,
  percentual: 75,
  status: 'ABERTA',
  criadaEm: '2026-10-01T10:00:00.000Z',
  ...parcial,
});

describe('<CartaoSaldo>', () => {
  it('mostra o saldo, o teto e quanto ainda pode receber', () => {
    render(<CartaoSaldo saldo={70} teto={100} />);
    expect(screen.getByText('S$ 70')).toBeInTheDocument();
    expect(screen.getByText(/pode receber até S\$ 30/i)).toBeInTheDocument();
  });

  it('avisa quando o saldo está no teto', () => {
    render(<CartaoSaldo saldo={100} teto={100} />);
    expect(screen.getByText(/saldo no limite/i)).toBeInTheDocument();
  });

  it('permite ocultar o saldo', async () => {
    render(<CartaoSaldo saldo={70} teto={100} />);
    await userEvent.click(screen.getByRole('button', { name: /ocultar saldo/i }));
    expect(screen.queryByText('S$ 70')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mostrar saldo/i })).toBeInTheDocument();
  });
});

describe('<CartaoMeta>', () => {
  it('mostra quanto falta e o progresso acessível', () => {
    render(<CartaoMeta meta={meta()} />, { wrapper: MemoryRouter });
    expect(screen.getByText('Sessão de filme')).toBeInTheDocument();
    expect(screen.getByText(/faltam S\$ 50/i)).toBeInTheDocument();
    const barra = screen.getByRole('progressbar');
    expect(barra).toHaveAttribute('aria-valuenow', '75');
    expect(barra).toHaveAccessibleName(/sessão de filme/i);
  });

  it('celebra a meta atingida', () => {
    render(<CartaoMeta meta={meta({ arrecadado: 200, falta: 0, percentual: 100, status: 'ATINGIDA' })} />, { wrapper: MemoryRouter });
    expect(screen.getByText(/meta atingida/i)).toBeInTheDocument();
  });

  it('vira link quando recebe destino', () => {
    render(<CartaoMeta meta={meta()} para="/metas/m1" />, { wrapper: MemoryRouter });
    expect(screen.getByRole('link')).toHaveAttribute('href', '/metas/m1');
  });
});

describe('<ItemTransacao>', () => {
  const t = (parcial: Partial<TransacaoDTO>): TransacaoDTO => ({
    id: 't',
    tipo: 'DEPOSITO',
    valor: 10,
    descricao: 'Feira de ciências',
    autor: 'Marta Lins',
    meta: null,
    criadaEm: new Date().toISOString(),
    ...parcial,
  });

  it('depósito aparece como entrada, com autor', () => {
    render(<ItemTransacao transacao={t({})} />);
    expect(screen.getByText('+S$ 10')).toBeInTheDocument();
    expect(screen.getByText('Feira de ciências')).toBeInTheDocument();
    expect(screen.getByText(/Marta Lins/)).toBeInTheDocument();
  });

  it('contribuição aparece como saída com o nome da meta', () => {
    render(<ItemTransacao transacao={t({ tipo: 'CONTRIBUICAO', valor: 5, meta: 'Filme', descricao: 'Filme' })} />);
    expect(screen.getByText('−S$ 5')).toBeInTheDocument();
    expect(screen.getByText(/contribuição/i)).toBeInTheDocument();
  });

  it('descrição com HTML é exibida como texto (OWASP A05)', () => {
    const { container } = render(<ItemTransacao transacao={t({ descricao: '<img src=x onerror=alert(1)>' })} />);
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });
});

describe('<SeletorAlunos>', () => {
  const alunos: AlunoResumoDTO[] = [
    { id: 'a', nome: 'Ana Souza', matricula: '1', saldo: 10 },
    { id: 'b', nome: 'Bruno Lima', matricula: '2', saldo: 100 },
    { id: 'c', nome: 'Carla Rocha', matricula: '3', saldo: 0 },
  ];

  function Controlado() {
    const [sel, setSel] = useState<Set<string>>(new Set());
    return <SeletorAlunos alunos={alunos} selecionados={sel} aoMudar={setSel} />;
  }

  it('seleciona todos e desmarca todos', async () => {
    render(<Controlado />);
    await userEvent.click(screen.getByRole('checkbox', { name: /selecionar todos/i }));
    expect(screen.getAllByRole('checkbox', { checked: true })).toHaveLength(4);
    expect(screen.getByText(/3 selecionados/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: /selecionar todos/i }));
    expect(screen.queryAllByRole('checkbox', { checked: true })).toHaveLength(0);
  });

  it('seleciona individualmente e mostra o saldo de cada aluno', async () => {
    render(<Controlado />);
    const linha = screen.getByRole('checkbox', { name: /bruno lima/i });
    await userEvent.click(linha);
    expect(screen.getByText(/1 selecionado/i)).toBeInTheDocument();
    expect(within(linha.closest('li')!).getByText('S$ 100')).toBeInTheDocument();
  });

  it('filtra por nome sem perder a seleção', async () => {
    render(<Controlado />);
    await userEvent.click(screen.getByRole('checkbox', { name: /ana souza/i }));
    await userEvent.type(screen.getByRole('searchbox'), 'carla');
    expect(screen.queryByRole('checkbox', { name: /ana souza/i })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /carla rocha/i })).toBeInTheDocument();
    expect(screen.getByText(/1 selecionado/i)).toBeInTheDocument();
  });
});

describe('<TecladoValor>', () => {
  function Controlado({ maximo }: { maximo?: number }) {
    const [v, setV] = useState(0);
    return <TecladoValor valor={v} aoMudar={setV} atalhos={[5, 10, 25]} maximo={maximo} rotulo="Valor" />;
  }

  it('atalhos preenchem o valor', async () => {
    render(<Controlado />);
    await userEvent.click(screen.getByRole('button', { name: 'S$ 10' }));
    expect(screen.getByLabelText('Valor')).toHaveValue('10');
  });

  it('botão "máximo" usa o limite informado', async () => {
    render(<Controlado maximo={37} />);
    await userEvent.click(screen.getByRole('button', { name: /máximo/i }));
    expect(screen.getByLabelText('Valor')).toHaveValue('37');
  });

  it('aceita apenas números inteiros', async () => {
    render(<Controlado />);
    await userEvent.type(screen.getByLabelText('Valor'), '1a2,5');
    expect(screen.getByLabelText('Valor')).toHaveValue('125');
  });
});
