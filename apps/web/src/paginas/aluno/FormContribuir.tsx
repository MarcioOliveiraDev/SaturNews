import type { MetaDTO } from '@saturbank/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, novaChaveIdempotencia } from '../../api/cliente';
import { Aviso, AvisoErro } from '../../componentes/Aviso';
import { TecladoValor } from '../../componentes/TecladoValor';
import { formatarMoeda } from '../../util/formatar';

export function FormContribuir({ meta, saldo }: { meta: MetaDTO; saldo: number }) {
  const qc = useQueryClient();
  const [valor, setValor] = useState(0);
  const [confirmando, setConfirmando] = useState(false);
  // Uma chave por intenção de contribuir: duplo clique ou reenvio não duplicam.
  const [chave, setChave] = useState(novaChaveIdempotencia);
  const maximo = Math.min(saldo, meta.falta);

  const contribuir = useMutation({
    mutationFn: () => api.post<{ saldo: number; meta: MetaDTO }>(`/metas/${meta.id}/contribuicoes`, { valor }, { chaveIdempotencia: chave }),
    onSuccess: (r) => {
      qc.setQueryData(['conta'], (c: { teto: number } | undefined) => (c ? { ...c, saldo: r.saldo, espaco: Math.max(0, c.teto - r.saldo) } : c));
      qc.invalidateQueries({ queryKey: ['meta', meta.id] });
      qc.invalidateQueries({ queryKey: ['minhas-metas'] });
      qc.invalidateQueries({ queryKey: ['extrato'] });
      qc.invalidateQueries({ queryKey: ['conta'] });
    },
    onSettled: () => {
      setConfirmando(false);
      setChave(novaChaveIdempotencia());
    },
  });

  if (contribuir.isSuccess) {
    const r = contribuir.data;
    return (
      <Aviso tipo="sucesso">
        <strong className="block font-display">Você colocou {formatarMoeda(valor)}!</strong>
        {r.meta.status === 'ATINGIDA' ? 'A turma atingiu a meta! 🎉 Agora é com o professor.' : `Agora faltam ${formatarMoeda(r.meta.falta)}.`}
        <button type="button" className="mt-3 block underline" onClick={() => { contribuir.reset(); setValor(0); }}>
          Contribuir de novo
        </button>
      </Aviso>
    );
  }
  if (meta.status !== 'ABERTA') return null;
  if (saldo <= 0) {
    return <Aviso tipo="info">Você ainda não tem saldo. Participe das aulas e atividades para ganhar $aturCoin$ dos professores!</Aviso>;
  }

  const acima = valor > maximo;
  return (
    <div className="cartao space-y-4 p-5">
      <h2 className="titulo-display text-lg">Contribuir</h2>
      <TecladoValor valor={valor} aoMudar={(v) => { setValor(v); setConfirmando(false); }} atalhos={[5, 10, 20].filter((a) => a <= maximo)} maximo={maximo} rotulo="Quanto você quer colocar?" />
      {acima && <p className="text-sm text-amarelo">O máximo é {formatarMoeda(maximo)}.</p>}
      <AvisoErro erro={contribuir.error} />
      {confirmando ? (
        <div className="space-y-3 rounded-2xl border border-rosa/40 bg-rosa/10 p-4">
          <p className="text-sm">
            Colocar <strong>{formatarMoeda(valor)}</strong> em <strong>{meta.titulo}</strong>? A contribuição não pode ser retirada depois.
          </p>
          <div className="flex gap-2">
            <button type="button" className="botao-rosa flex-1" onClick={() => contribuir.mutate()} disabled={contribuir.isPending}>
              {contribuir.isPending ? 'Enviando…' : 'Confirmar'}
            </button>
            <button type="button" className="botao-fantasma" onClick={() => setConfirmando(false)}>
              Voltar
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="botao-primario w-full" disabled={valor <= 0 || acima} onClick={() => setConfirmando(true)}>
          Contribuir
        </button>
      )}
    </div>
  );
}
