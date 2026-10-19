import { useMutation } from '@tanstack/react-query';
import { type FormEvent, useId, useState } from 'react';
import { api } from '../../api/cliente';
import { Aviso, AvisoErro, Carregando } from '../../componentes/Aviso';
import { Titulo } from '../../componentes/Casca';
import { IconeCheck, IconeItem } from '../../componentes/Icones';
import { formatarMoeda } from '../../util/formatar';
import { useCatalogo } from './consultas';
import { Voltar } from './MetaDetalhe';

export function Sugerir() {
  const catalogo = useCatalogo();
  const [itemId, setItemId] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const idTexto = useId();
  const enviar = useMutation({
    mutationFn: () => api.post('/me/turma/sugestoes', itemId ? { itemId } : { texto: texto.trim() }),
  });

  const submeter = (e: FormEvent) => {
    e.preventDefault();
    enviar.mutate();
  };

  if (enviar.isSuccess) {
    return (
      <>
        <Titulo voltar={<Voltar para="/metas" />}>Sugerir meta</Titulo>
        <Aviso tipo="sucesso">Sugestão enviada! O professor vai avaliar.</Aviso>
        <button type="button" className="botao-fantasma mt-4" onClick={() => { enviar.reset(); setItemId(null); setTexto(''); }}>
          Fazer outra sugestão
        </button>
      </>
    );
  }

  return (
    <>
      <Titulo voltar={<Voltar para="/metas" />}>Sugerir meta</Titulo>
      <form onSubmit={submeter} className="space-y-6">
        <fieldset>
          <legend className="rotulo">Escolha uma experiência</legend>
          {catalogo.isPending ? (
            <Carregando />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {catalogo.data?.map((i) => {
                const ativo = itemId === i.id;
                return (
                  <label key={i.id} className={`cartao flex cursor-pointer items-center gap-3 p-4 transition ${ativo ? 'border-neon' : 'hover:border-suave'}`}>
                    <input type="radio" name="item" className="sr-only" checked={ativo} onChange={() => { setItemId(i.id); setTexto(''); }} />
                    <span className="grid size-12 place-items-center rounded-2xl bg-rosa/15 text-rosa">
                      <IconeItem nome={i.icone} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{i.nome}</span>
                      <span className="block text-xs text-suave">cerca de {formatarMoeda(i.precoSugerido)}</span>
                    </span>
                    {ativo && <IconeCheck className="text-neon" />}
                  </label>
                );
              })}
            </div>
          )}
        </fieldset>
        <div>
          <label htmlFor={idTexto} className="rotulo">…ou escreva uma ideia</label>
          <textarea
            id={idTexto}
            className="campo min-h-24 py-3"
            maxLength={140}
            value={texto}
            onChange={(e) => { setTexto(e.target.value); setItemId(null); }}
            placeholder="Ex.: piquenique no pátio"
          />
          <p className="mt-1 text-right text-xs text-suave">{texto.length}/140</p>
        </div>
        <AvisoErro erro={enviar.error} />
        <button type="submit" className="botao-primario w-full sm:w-auto" disabled={(!itemId && !texto.trim()) || enviar.isPending}>
          Enviar sugestão
        </button>
      </form>
    </>
  );
}
