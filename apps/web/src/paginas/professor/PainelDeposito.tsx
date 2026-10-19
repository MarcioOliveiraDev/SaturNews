import type { AlunoResumoDTO, ResultadoLoteDTO } from '@saturbank/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { api, novaChaveIdempotencia } from '../../api/cliente';
import { Aviso, AvisoErro } from '../../componentes/Aviso';
import { TecladoValor } from '../../componentes/TecladoValor';
import { formatarMoeda } from '../../util/formatar';
import { previaLote } from '../../util/lote';

interface Props {
  turmaId: string;
  alunos: AlunoResumoDTO[];
  selecionados: Set<string>;
  aoConcluir: () => void;
}

/** Depósito do mesmo valor para cada aluno selecionado (pode ser a turma toda). */
export function PainelDeposito({ turmaId, alunos, selecionados, aoConcluir }: Props) {
  const qc = useQueryClient();
  const [valor, setValor] = useState(0);
  const [descricao, setDescricao] = useState('');
  const [chave, setChave] = useState(novaChaveIdempotencia);
  const idDescricao = useId();
  const previa = previaLote(alunos, selecionados, valor);
  const todos = selecionados.size === alunos.length;

  const depositar = useMutation({
    mutationFn: () =>
      api.post<ResultadoLoteDTO>(
        '/depositos/lote',
        { turmaId, valor, descricao: descricao.trim(), ...(todos ? { todos: true } : { alunoIds: [...selecionados] }) },
        { chaveIdempotencia: chave },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['turma', turmaId] });
      qc.invalidateQueries({ queryKey: ['extrato'] });
    },
    onSettled: () => setChave(novaChaveIdempotencia()),
  });

  if (depositar.isSuccess) {
    const r = depositar.data;
    const pulados = r.itens.filter((i) => i.credito === 0);
    return (
      <div className="space-y-3">
        <Aviso tipo="sucesso">
          <strong className="block font-display">Depósito feito! Total {formatarMoeda(r.total)}</strong>
          {r.itens.length - pulados.length} aluno(s) receberam.
          {pulados.length > 0 && ` ${pulados.map((p) => p.nome).join(', ')} já estava(m) no limite de S$ 100.`}
        </Aviso>
        <button type="button" className="botao-fantasma w-full" onClick={aoConcluir}>
          Concluir
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <TecladoValor valor={valor} aoMudar={setValor} atalhos={[1, 5, 10, 20]} rotulo="Valor para cada aluno" />
      <div>
        <label htmlFor={idDescricao} className="rotulo">Motivo (aparece no extrato do aluno)</label>
        <input id={idDescricao} className="campo" maxLength={120} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Participação na feira de ciências" />
      </div>
      {previa.quantidade > 0 && valor > 0 && (
        <div className="rounded-2xl bg-superficie-2 p-4 text-sm">
          <p>
            <strong className="font-display text-neon">{formatarMoeda(previa.total)}</strong> no total para {previa.quantidade}{' '}
            {previa.quantidade === 1 ? 'aluno' : 'alunos'}.
          </p>
          {previa.parciais.length > 0 && <p className="mt-1 text-amarelo">Recebem só o que cabe no limite de S$ 100: {previa.parciais.join(', ')}.</p>}
          {previa.noTeto.length > 0 && <p className="mt-1 text-suave">Já no limite (não recebem): {previa.noTeto.join(', ')}.</p>}
        </div>
      )}
      <AvisoErro erro={depositar.error} />
      <button
        type="button"
        className="botao-primario w-full"
        disabled={valor <= 0 || !descricao.trim() || selecionados.size === 0 || previa.total === 0 || depositar.isPending}
        onClick={() => depositar.mutate()}
      >
        {depositar.isPending ? 'Depositando…' : `Depositar ${valor > 0 ? formatarMoeda(valor) : ''} para ${selecionados.size}`}
      </button>
    </div>
  );
}
