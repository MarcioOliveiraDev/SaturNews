import type { AlunoResumoDTO, MetaDTO, SugestaoDTO } from '@saturbank/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../../api/cliente';
import { AvisoErro, Carregando, Vazio } from '../../componentes/Aviso';
import { CartaoMeta } from '../../componentes/CartaoMeta';
import { Titulo } from '../../componentes/Casca';
import { IconeMais } from '../../componentes/Icones';
import { SeletorAlunos } from '../../componentes/SeletorAlunos';
import { formatarData } from '../../util/formatar';
import { Voltar } from '../aluno/MetaDetalhe';
import { PainelDeposito } from './PainelDeposito';
import { useTurmas } from './Turmas';

type Aba = 'alunos' | 'metas' | 'sugestoes';

export function Turma() {
  const { id = '' } = useParams();
  const [aba, setAba] = useState<Aba>('alunos');
  const turmas = useTurmas();
  const nome = turmas.data?.find((t) => t.id === id)?.nome ?? 'Turma';

  const abas: { id: Aba; rotulo: string }[] = [
    { id: 'alunos', rotulo: 'Alunos' },
    { id: 'metas', rotulo: 'Metas' },
    { id: 'sugestoes', rotulo: 'Sugestões' },
  ];

  return (
    <>
      <Titulo voltar={<Voltar para="/" />}>{nome}</Titulo>
      <div role="tablist" aria-label="Seções da turma" className="mb-6 flex gap-1 rounded-full bg-superficie p-1">
        {abas.map((a) => (
          <button
            key={a.id}
            role="tab"
            type="button"
            aria-selected={aba === a.id}
            onClick={() => setAba(a.id)}
            className={`min-h-11 flex-1 rounded-full text-sm font-medium transition ${aba === a.id ? 'bg-neon text-black' : 'text-suave hover:text-texto'}`}
          >
            {a.rotulo}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {aba === 'alunos' && <AbaAlunos turmaId={id} />}
        {aba === 'metas' && <AbaMetas turmaId={id} />}
        {aba === 'sugestoes' && <AbaSugestoes turmaId={id} />}
      </div>
    </>
  );
}

function AbaAlunos({ turmaId }: { turmaId: string }) {
  const alunos = useQuery({ queryKey: ['turma', turmaId, 'alunos'], queryFn: () => api.get<AlunoResumoDTO[]>(`/turmas/${turmaId}/alunos`) });
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  if (alunos.isPending) return <Carregando />;
  if (alunos.isError) return <AvisoErro erro={alunos.error} />;
  if (!alunos.data.length) return <Vazio>Nenhum aluno nesta turma.</Vazio>;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <section className="cartao p-4 sm:p-5">
        <SeletorAlunos alunos={alunos.data} selecionados={selecionados} aoMudar={setSelecionados} />
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-suave">Ver extrato de um aluno</summary>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {alunos.data.map((a) => (
              <li key={a.id}>
                <Link className="text-neon hover:underline" to={`/alunos/${a.id}`}>{a.nome}</Link>
              </li>
            ))}
          </ul>
        </details>
      </section>
      <aside className="cartao h-fit p-5 lg:sticky lg:top-24">
        <h2 className="titulo-display mb-4 text-lg">Depositar $aturCoin$</h2>
        {selecionados.size ? (
          <PainelDeposito
            turmaId={turmaId}
            alunos={alunos.data}
            selecionados={selecionados}
            aoConcluir={() => setSelecionados(new Set())}
          />
        ) : (
          <p className="text-sm text-suave">Selecione alunos na lista (ou “Selecionar todos”) para depositar o mesmo valor para cada um.</p>
        )}
      </aside>
    </div>
  );
}

function AbaMetas({ turmaId }: { turmaId: string }) {
  const qc = useQueryClient();
  const metas = useQuery({ queryKey: ['turma', turmaId, 'metas'], queryFn: () => api.get<MetaDTO[]>(`/turmas/${turmaId}/metas`) });
  const [cancelando, setCancelando] = useState<string | null>(null);
  const acao = useMutation({
    mutationFn: ({ id, tipo }: { id: string; tipo: 'resgatar' | 'cancelar' }) => api.post(`/metas/${id}/${tipo}`),
    onSuccess: () => {
      setCancelando(null);
      qc.invalidateQueries({ queryKey: ['turma', turmaId] });
      qc.invalidateQueries({ queryKey: ['turmas'] });
    },
  });

  return (
    <div className="space-y-4">
      <Link to={`/turmas/${turmaId}/nova-meta`} className="botao-primario">
        <IconeMais width={18} height={18} /> Nova meta
      </Link>
      <AvisoErro erro={acao.error} />
      {metas.isPending ? (
        <Carregando />
      ) : !metas.data?.length ? (
        <Vazio>Nenhuma meta ainda. Crie uma a partir do catálogo ou de uma sugestão dos alunos.</Vazio>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {metas.data.map((m) => (
            <div key={m.id} className="space-y-2">
              <CartaoMeta meta={m} />
              {m.status === 'ATINGIDA' && (
                <button type="button" className="botao-rosa w-full" onClick={() => acao.mutate({ id: m.id, tipo: 'resgatar' })}>
                  Marcar como realizada
                </button>
              )}
              {m.status === 'ABERTA' &&
                (cancelando === m.id ? (
                  <div className="flex gap-2">
                    <button type="button" className="botao flex-1 bg-perigo text-white" onClick={() => acao.mutate({ id: m.id, tipo: 'cancelar' })}>
                      Cancelar e devolver moedas
                    </button>
                    <button type="button" className="botao-fantasma" onClick={() => setCancelando(null)}>Voltar</button>
                  </div>
                ) : (
                  <button type="button" className="botao-fantasma w-full text-suave" onClick={() => setCancelando(m.id)}>
                    Cancelar meta
                  </button>
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AbaSugestoes({ turmaId }: { turmaId: string }) {
  const qc = useQueryClient();
  const sugestoes = useQuery({ queryKey: ['turma', turmaId, 'sugestoes'], queryFn: () => api.get<SugestaoDTO[]>(`/turmas/${turmaId}/sugestoes`) });
  const recusar = useMutation({
    mutationFn: (id: string) => api.post(`/sugestoes/${id}/recusar`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['turma', turmaId, 'sugestoes'] }),
  });
  if (sugestoes.isPending) return <Carregando />;
  if (!sugestoes.data?.length) return <Vazio>Nenhuma sugestão pendente.</Vazio>;
  return (
    <ul className="space-y-3">
      <AvisoErro erro={recusar.error} />
      {sugestoes.data.map((s) => (
        <li key={s.id} className="cartao flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="font-medium">{s.item ?? `“${s.texto}”`}</p>
            <p className="text-xs text-suave">{s.aluno} · {formatarData(s.criadaEm)}</p>
          </div>
          <div className="flex gap-2">
            <Link to={`/turmas/${turmaId}/nova-meta?sugestao=${s.id}`} className="botao-primario min-h-10 px-4">Aprovar</Link>
            <button type="button" className="botao-fantasma min-h-10 px-4" onClick={() => recusar.mutate(s.id)}>Recusar</button>
          </div>
        </li>
      ))}
    </ul>
  );
}
