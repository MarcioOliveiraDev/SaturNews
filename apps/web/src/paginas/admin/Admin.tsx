import { useMutation, useQuery } from '@tanstack/react-query';
import { type ChangeEvent, useId, useState } from 'react';
import { ErroApi, api } from '../../api/cliente';
import { Aviso, AvisoErro, Carregando } from '../../componentes/Aviso';
import { Titulo } from '../../componentes/Casca';
import { baixarArquivo, gerarCsv } from '../../util/csv';
import { formatarData, formatarMoeda } from '../../util/formatar';

type Aba = 'importar' | 'alunos' | 'encerrar' | 'auditoria';

export function Admin() {
  const [aba, setAba] = useState<Aba>('importar');
  const abas: { id: Aba; rotulo: string }[] = [
    { id: 'importar', rotulo: 'Importar alunos' },
    { id: 'alunos', rotulo: 'Senhas' },
    { id: 'encerrar', rotulo: 'Fim do ano' },
    { id: 'auditoria', rotulo: 'Auditoria' },
  ];
  return (
    <>
      <Titulo>Coordenação</Titulo>
      <div role="tablist" aria-label="Administração" className="mb-6 flex gap-1 overflow-x-auto rounded-full bg-superficie p-1">
        {abas.map((a) => (
          <button
            key={a.id}
            role="tab"
            type="button"
            aria-selected={aba === a.id}
            onClick={() => setAba(a.id)}
            className={`min-h-11 shrink-0 flex-1 rounded-full px-4 text-sm font-medium whitespace-nowrap ${aba === a.id ? 'bg-neon text-black' : 'text-suave hover:text-texto'}`}
          >
            {a.rotulo}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {aba === 'importar' && <Importar />}
        {aba === 'alunos' && <RedefinirSenhas />}
        {aba === 'encerrar' && <EncerrarAno />}
        {aba === 'auditoria' && <Auditoria />}
      </div>
    </>
  );
}

interface AlunoImportado {
  matricula: string;
  nome: string;
  turma: string;
  senhaTemporaria?: string | null;
  existente?: boolean;
  atualizado?: boolean;
}
interface ResultadoImportacao {
  simulacao: boolean;
  alunos: AlunoImportado[];
}

function Importar() {
  const [csv, setCsv] = useState('');
  const idCsv = useId();
  const enviar = useMutation({
    mutationFn: (simular: boolean) => api.post<ResultadoImportacao>('/admin/importacoes/alunos', { csv, simular }),
  });
  const r = enviar.data;
  const errosLinha = enviar.error instanceof ErroApi && Array.isArray(enviar.error.dados.erros) ? (enviar.error.dados.erros as { linha: number; mensagem: string }[]) : [];

  const lerArquivo = async (e: ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (arquivo && arquivo.size <= 500_000) {
      setCsv(await arquivo.text());
      enviar.reset();
    }
  };

  const baixarSenhas = () => {
    const linhas = (r?.alunos ?? []).filter((a) => a.senhaTemporaria).map((a) => [a.matricula, a.nome, a.turma, a.senhaTemporaria!]);
    baixarArquivo('senhas-provisorias.csv', gerarCsv(['matricula', 'nome', 'turma', 'senha_provisoria'], linhas));
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-suave">
        Formato: <code className="text-neon">matricula,nome,turma,ano_letivo</code>. Alunos já cadastrados mudam de turma e mantêm o saldo.
      </p>
      <input type="file" accept=".csv,text/csv" onChange={lerArquivo} className="block text-sm text-suave file:mr-3 file:rounded-full file:border-0 file:bg-superficie-2 file:px-4 file:py-2 file:text-texto" />
      <div>
        <label htmlFor={idCsv} className="rotulo">Conteúdo do CSV</label>
        <textarea id={idCsv} className="campo min-h-40 py-3 font-mono text-sm" value={csv} onChange={(e) => { setCsv(e.target.value); enviar.reset(); }} spellCheck={false} />
      </div>
      <AvisoErro erro={enviar.error} />
      {errosLinha.length > 0 && (
        <ul className="space-y-1 text-sm text-red-200">
          {errosLinha.map((e, i) => <li key={i}>Linha {e.linha}: {e.mensagem}</li>)}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="botao-fantasma" disabled={!csv || enviar.isPending} onClick={() => enviar.mutate(true)}>Pré-visualizar</button>
        {r?.simulacao && <button type="button" className="botao-primario" onClick={() => enviar.mutate(false)} disabled={enviar.isPending}>Importar {r.alunos.length} alunos</button>}
      </div>
      {r && (
        <div className="cartao overflow-x-auto p-4">
          {!r.simulacao && (
            <div className="mb-4 space-y-3">
              <Aviso tipo="sucesso">Importação concluída. Entregue as senhas provisórias aos alunos — elas não serão mostradas de novo.</Aviso>
              <button type="button" className="botao-rosa" onClick={baixarSenhas}>Baixar senhas (CSV)</button>
            </div>
          )}
          <table className="w-full text-left text-sm">
            <thead className="text-suave"><tr><th className="py-2">Matrícula</th><th>Nome</th><th>Turma</th><th>{r.simulacao ? 'Situação' : 'Senha provisória'}</th></tr></thead>
            <tbody className="divide-y divide-borda">
              {r.alunos.map((a) => (
                <tr key={a.matricula}>
                  <td className="py-2 font-mono">{a.matricula}</td>
                  <td>{a.nome}</td>
                  <td>{a.turma}</td>
                  <td className="font-mono">{r.simulacao ? (a.existente ? 'muda de turma' : 'novo') : (a.senhaTemporaria ?? '—')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface AlunoBusca {
  id: string;
  nome: string;
  matricula: string;
  turma: string;
  saldo: number;
}

function RedefinirSenhas() {
  const [busca, setBusca] = useState('');
  const [senha, setSenha] = useState<{ nome: string; senha: string } | null>(null);
  const idBusca = useId();
  const alunos = useQuery({
    queryKey: ['admin-alunos', busca],
    queryFn: () => api.get<AlunoBusca[]>(`/admin/alunos?busca=${encodeURIComponent(busca)}`),
    enabled: busca.trim().length >= 2,
  });
  const redefinir = useMutation({
    mutationFn: (a: AlunoBusca) => api.post<{ senhaTemporaria: string }>(`/admin/usuarios/${a.id}/redefinir-senha`).then((r) => ({ nome: a.nome, senha: r.senhaTemporaria })),
    onSuccess: setSenha,
  });
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={idBusca} className="rotulo">Buscar aluno por nome ou matrícula</label>
        <input id={idBusca} type="search" className="campo" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      {senha && (
        <Aviso tipo="sucesso">
          Nova senha provisória de {senha.nome}: <strong className="font-mono text-lg">{senha.senha}</strong>
          <span className="block text-xs">O aluno vai precisar trocá-la no próximo acesso.</span>
        </Aviso>
      )}
      <AvisoErro erro={redefinir.error} />
      {alunos.isFetching && <Carregando />}
      <ul className="divide-y divide-borda">
        {alunos.data?.map((a) => (
          <li key={a.id} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{a.nome}</p>
              <p className="text-xs text-suave">{a.matricula} · {a.turma} · {formatarMoeda(a.saldo)}</p>
            </div>
            <button type="button" className="botao-fantasma min-h-10 px-4" onClick={() => redefinir.mutate(a)}>Redefinir senha</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EncerrarAno() {
  const ano = new Date().getFullYear();
  const frase = `ENCERRAR ${ano}`;
  const [confirmacao, setConfirmacao] = useState('');
  const idConfirmacao = useId();
  const encerrar = useMutation({
    mutationFn: () => api.post<{ ano: number; metasCanceladas: number; saldosZerados: number }>('/admin/encerrar-ano', { confirmacao }),
  });
  return (
    <div className="cartao max-w-xl space-y-4 p-6">
      <h2 className="titulo-display text-lg text-amarelo">Encerrar o ano letivo</h2>
      <ul className="list-disc space-y-1 pl-5 text-sm text-suave">
        <li>Metas abertas são canceladas e as moedas voltam aos alunos;</li>
        <li>metas já atingidas continuam disponíveis para os professores realizarem;</li>
        <li>todos os saldos são <strong className="text-texto">zerados</strong> (o histórico fica guardado);</li>
        <li>as turmas do ano são arquivadas. Esta ação não pode ser desfeita.</li>
      </ul>
      <div>
        <label htmlFor={idConfirmacao} className="rotulo">Digite <code className="text-amarelo">{frase}</code> para confirmar</label>
        <input id={idConfirmacao} className="campo" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} autoComplete="off" />
      </div>
      <AvisoErro erro={encerrar.error} />
      {encerrar.isSuccess ? (
        <Aviso tipo="sucesso">
          Ano {encerrar.data.ano} encerrado: {encerrar.data.metasCanceladas} meta(s) cancelada(s), {encerrar.data.saldosZerados} saldo(s) zerado(s).
        </Aviso>
      ) : (
        <button type="button" className="botao w-full bg-amarelo text-black" disabled={confirmacao !== frase || encerrar.isPending} onClick={() => encerrar.mutate()}>
          Encerrar ano {ano}
        </button>
      )}
    </div>
  );
}

interface RegistroAuditoria {
  id: string;
  acao: string;
  alvo: string | null;
  ip: string | null;
  resultado: string;
  usuario: string | null;
  criadaEm: string;
}

function Auditoria() {
  const q = useQuery({ queryKey: ['auditoria'], queryFn: () => api.get<{ itens: RegistroAuditoria[] }>('/admin/auditoria') });
  if (q.isPending) return <Carregando />;
  if (q.isError) return <AvisoErro erro={q.error} />;
  return (
    <div className="cartao overflow-x-auto p-4">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead className="text-suave"><tr><th className="py-2">Quando</th><th>Quem</th><th>Ação</th><th>Resultado</th><th>IP</th></tr></thead>
        <tbody className="divide-y divide-borda">
          {q.data.itens.map((r) => (
            <tr key={r.id}>
              <td className="py-2 whitespace-nowrap">{formatarData(r.criadaEm)}</td>
              <td>{r.usuario ?? '—'}</td>
              <td className="font-mono text-xs">{r.acao}</td>
              <td className={r.resultado === 'SUCESSO' ? 'text-neon' : 'text-amarelo'}>{r.resultado}</td>
              <td className="font-mono text-xs text-suave">{r.ip}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
