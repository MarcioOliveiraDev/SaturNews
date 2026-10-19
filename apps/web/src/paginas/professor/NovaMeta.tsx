import type { MetaDTO, SugestaoDTO } from '@saturbank/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useId, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { api } from '../../api/cliente';
import { Aviso, AvisoErro, Carregando } from '../../componentes/Aviso';
import { Titulo } from '../../componentes/Casca';
import { IconeCheck, IconeItem } from '../../componentes/Icones';
import { TecladoValor } from '../../componentes/TecladoValor';
import { formatarMoeda } from '../../util/formatar';
import { useCatalogo } from '../aluno/consultas';
import { Voltar } from '../aluno/MetaDetalhe';

export function NovaMeta() {
  const { id: turmaId = '' } = useParams();
  const [params] = useSearchParams();
  const sugestaoId = params.get('sugestao');
  const navegar = useNavigate();
  const qc = useQueryClient();
  const catalogo = useCatalogo();
  const sugestoes = useQuery({
    queryKey: ['turma', turmaId, 'sugestoes'],
    queryFn: () => api.get<SugestaoDTO[]>(`/turmas/${turmaId}/sugestoes`),
    enabled: !!sugestaoId,
  });
  const sugestao = sugestoes.data?.find((s) => s.id === sugestaoId);
  const [itemId, setItemId] = useState<string | null>(null);
  const [valorAlvo, setValorAlvo] = useState(0);
  const [titulo, setTitulo] = useState('');
  const idTitulo = useId();

  const itemSugerido = sugestao?.item ? catalogo.data?.find((i) => i.nome === sugestao.item) : undefined;
  const itemEscolhido = itemId ?? itemSugerido?.id ?? null;
  const tituloFinal = titulo || (sugestao?.texto ?? '');

  const criar = useMutation({
    mutationFn: () =>
      api.post<MetaDTO>(`/turmas/${turmaId}/metas`, {
        itemId: itemEscolhido,
        valorAlvo,
        ...(tituloFinal.trim() ? { titulo: tituloFinal.trim().slice(0, 60) } : {}),
        ...(sugestaoId ? { sugestaoId } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['turma', turmaId] });
      qc.invalidateQueries({ queryKey: ['turmas'] });
      navegar(`/turmas/${turmaId}`);
    },
  });

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    criar.mutate();
  };

  return (
    <>
      <Titulo voltar={<Voltar para={`/turmas/${turmaId}`} />}>Nova meta</Titulo>
      {sugestao && (
        <div className="mb-6">
          <Aviso tipo="info">
            Sugestão de {sugestao.aluno}: <strong>{sugestao.item ?? `“${sugestao.texto}”`}</strong>
          </Aviso>
        </div>
      )}
      <form onSubmit={enviar} className="space-y-6">
        <fieldset>
          <legend className="rotulo">Experiência do catálogo</legend>
          {catalogo.isPending ? (
            <Carregando />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {catalogo.data?.map((i) => {
                const ativo = itemEscolhido === i.id;
                return (
                  <label key={i.id} className={`cartao flex cursor-pointer items-center gap-3 p-4 ${ativo ? 'border-neon' : 'hover:border-suave'}`}>
                    <input type="radio" name="item" className="sr-only" checked={ativo} onChange={() => { setItemId(i.id); if (!valorAlvo) setValorAlvo(i.precoSugerido); }} />
                    <span className="grid size-12 place-items-center rounded-2xl bg-rosa/15 text-rosa"><IconeItem nome={i.icone} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{i.nome}</span>
                      <span className="block text-xs text-suave">sugerido {formatarMoeda(i.precoSugerido)}</span>
                    </span>
                    {ativo && <IconeCheck className="text-neon" />}
                  </label>
                );
              })}
            </div>
          )}
        </fieldset>
        <div>
          <label htmlFor={idTitulo} className="rotulo">Título (opcional)</label>
          <input id={idTitulo} className="campo" maxLength={60} value={tituloFinal} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Filme de sexta" />
        </div>
        <TecladoValor valor={valorAlvo} aoMudar={setValorAlvo} atalhos={[100, 250, 400, 600]} rotulo="Valor da meta" />
        <AvisoErro erro={criar.error} />
        <button type="submit" className="botao-primario w-full sm:w-auto" disabled={!itemEscolhido || valorAlvo <= 0 || criar.isPending}>
          Criar meta
        </button>
      </form>
    </>
  );
}
