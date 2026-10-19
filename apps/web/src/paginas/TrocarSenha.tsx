import { trocarSenhaSchema } from '@saturbank/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useId, useState } from 'react';
import { api } from '../api/cliente';
import { CHAVE_SESSAO, useSair } from '../api/sessao';
import { Aviso, AvisoErro } from '../componentes/Aviso';
import { Fundo } from '../componentes/Fundo';
import { Satu } from '../componentes/Satu';

export function TrocarSenha() {
  const qc = useQueryClient();
  const sair = useSair();
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [repetir, setRepetir] = useState('');
  const ids = { atual: useId(), nova: useId(), repetir: useId() };
  const trocar = useMutation({
    mutationFn: () => api.post<void>('/auth/trocar-senha', { senhaAtual: atual, novaSenha: nova }),
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE_SESSAO }),
  });

  const validacao = trocarSenhaSchema.safeParse({ senhaAtual: atual || 'x', novaSenha: nova });
  const problema = !nova
    ? null
    : !validacao.success
      ? validacao.error.issues[0]?.message
      : repetir && repetir !== nova
        ? 'As senhas não são iguais'
        : null;

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (!problema && nova === repetir) trocar.mutate();
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-4 py-10">
      <Fundo />
      <form onSubmit={enviar} className="cartao w-full max-w-md space-y-5 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <Satu tamanho={56} />
          <h1 className="titulo-display text-2xl">Crie sua senha</h1>
        </div>
        <p className="text-sm text-suave">Por segurança, troque a senha provisória antes de continuar.</p>
        <div>
          <label htmlFor={ids.atual} className="rotulo">Senha atual (provisória)</label>
          <input id={ids.atual} type="password" className="campo" value={atual} onChange={(e) => setAtual(e.target.value)} autoComplete="current-password" />
        </div>
        <div>
          <label htmlFor={ids.nova} className="rotulo">Nova senha</label>
          <input id={ids.nova} type="password" className="campo" value={nova} onChange={(e) => setNova(e.target.value)} autoComplete="new-password" aria-describedby={`${ids.nova}-dica`} />
          <p id={`${ids.nova}-dica`} className="mt-1 text-xs text-suave">Pelo menos 8 caracteres. Uma frase curta é ótima: “anel-de-saturno-7”.</p>
        </div>
        <div>
          <label htmlFor={ids.repetir} className="rotulo">Repita a nova senha</label>
          <input id={ids.repetir} type="password" className="campo" value={repetir} onChange={(e) => setRepetir(e.target.value)} autoComplete="new-password" />
        </div>
        {problema && <Aviso tipo="info">{problema}</Aviso>}
        <AvisoErro erro={trocar.error} />
        <button type="submit" className="botao-primario w-full" disabled={!atual || !nova || nova !== repetir || !!problema || trocar.isPending}>
          Salvar nova senha
        </button>
        <button type="button" className="botao-fantasma w-full" onClick={() => sair.mutate()}>
          Sair
        </button>
      </form>
    </div>
  );
}
