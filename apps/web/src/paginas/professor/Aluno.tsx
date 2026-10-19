import type { AlunoResumoDTO } from '@saturbank/shared';
import { SALDO_MAXIMO, espacoDisponivel } from '@saturbank/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { api, novaChaveIdempotencia } from '../../api/cliente';
import { Aviso, AvisoErro, Carregando } from '../../componentes/Aviso';
import { CartaoSaldo } from '../../componentes/CartaoSaldo';
import { Titulo } from '../../componentes/Casca';
import { IconeSeta } from '../../componentes/Icones';
import { ListaExtrato } from '../../componentes/ListaExtrato';
import { TecladoValor } from '../../componentes/TecladoValor';
import { formatarMoeda } from '../../util/formatar';

export function AlunoProfessor() {
  const { id = '' } = useParams();
  const navegar = useNavigate();
  const qc = useQueryClient();
  const aluno = useQuery({ queryKey: ['aluno', id], queryFn: () => api.get<AlunoResumoDTO>(`/alunos/${id}`) });
  const [valor, setValor] = useState(0);
  const [descricao, setDescricao] = useState('');
  const [chave, setChave] = useState(novaChaveIdempotencia);
  const idDescricao = useId();
  const depositar = useMutation({
    mutationFn: () => api.post<{ saldo: number }>('/depositos', { alunoId: id, valor, descricao: descricao.trim() }, { chaveIdempotencia: chave }),
    onSuccess: () => {
      setValor(0);
      setDescricao('');
      qc.invalidateQueries({ queryKey: ['aluno', id] });
      qc.invalidateQueries({ queryKey: ['extrato'] });
      qc.invalidateQueries({ queryKey: ['turma'] });
    },
    onSettled: () => setChave(novaChaveIdempotencia()),
  });

  if (aluno.isPending) return <Carregando />;
  if (aluno.isError) return <AvisoErro erro={aluno.error} />;
  const a = aluno.data;
  const espaco = espacoDisponivel(a.saldo);

  return (
    <>
      <Titulo
        voltar={
          <button type="button" onClick={() => navegar(-1)} className="grid size-11 shrink-0 place-items-center rounded-full border border-borda" aria-label="Voltar">
            <IconeSeta />
          </button>
        }
      >
        {a.nome}
      </Titulo>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <CartaoSaldo saldo={a.saldo} teto={SALDO_MAXIMO} />
          <section className="cartao space-y-4 p-5">
            <h2 className="titulo-display text-lg">Depositar para {a.nome.split(' ')[0]}</h2>
            {espaco === 0 ? (
              <Aviso tipo="info">Saldo no limite de {formatarMoeda(SALDO_MAXIMO)}. O aluno precisa contribuir com uma meta para receber mais.</Aviso>
            ) : (
              <>
                <TecladoValor valor={valor} aoMudar={setValor} atalhos={[1, 5, 10].filter((v) => v <= espaco)} maximo={espaco} rotulo="Valor" />
                <div>
                  <label htmlFor={idDescricao} className="rotulo">Motivo</label>
                  <input id={idDescricao} className="campo" maxLength={120} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
                </div>
                {depositar.isSuccess && <Aviso tipo="sucesso">Depósito feito! Novo saldo: {formatarMoeda(depositar.data.saldo)}</Aviso>}
                <AvisoErro erro={depositar.error} />
                <button
                  type="button"
                  className="botao-primario w-full"
                  disabled={valor <= 0 || valor > espaco || !descricao.trim() || depositar.isPending}
                  onClick={() => depositar.mutate()}
                >
                  Depositar
                </button>
              </>
            )}
          </section>
        </div>
        <section>
          <h2 className="titulo-display mb-3 text-lg">Transações</h2>
          <ListaExtrato url={`/alunos/${id}/transacoes`} />
        </section>
      </div>
    </>
  );
}
