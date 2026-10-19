import type { AlunoResumoDTO } from '@saturbank/shared';
import { useId, useState } from 'react';
import { formatarMoeda } from '../util/formatar';

interface Props {
  alunos: AlunoResumoDTO[];
  selecionados: Set<string>;
  aoMudar: (s: Set<string>) => void;
}

export function SeletorAlunos({ alunos, selecionados, aoMudar }: Props) {
  const [busca, setBusca] = useState('');
  const idBusca = useId();
  const termo = busca.trim().toLocaleLowerCase('pt-BR');
  const visiveis = termo ? alunos.filter((a) => a.nome.toLocaleLowerCase('pt-BR').includes(termo)) : alunos;
  const todos = alunos.length > 0 && alunos.every((a) => selecionados.has(a.id));
  const n = selecionados.size;

  const alternar = (id: string) => {
    const novo = new Set(selecionados);
    if (novo.has(id)) novo.delete(id);
    else novo.add(id);
    aoMudar(novo);
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl bg-superficie-2 px-4">
          <input
            type="checkbox"
            className="size-5 accent-[var(--color-neon)]"
            checked={todos}
            onChange={() => aoMudar(todos ? new Set() : new Set(alunos.map((a) => a.id)))}
          />
          <span className="font-medium">Selecionar todos</span>
        </label>
        <label htmlFor={idBusca} className="sr-only">
          Buscar aluno
        </label>
        <input
          id={idBusca}
          type="search"
          placeholder="Buscar aluno…"
          className="campo sm:flex-1"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>
      <p className="mt-3 text-sm text-suave" aria-live="polite">
        {n === 1 ? '1 selecionado' : `${n} selecionados`} de {alunos.length}
      </p>
      <ul className="mt-2 divide-y divide-borda">
        {visiveis.map((a) => (
          <li key={a.id}>
            <label className="flex min-h-14 cursor-pointer items-center gap-3 py-2">
              <input
                type="checkbox"
                className="size-5 accent-[var(--color-neon)]"
                checked={selecionados.has(a.id)}
                onChange={() => alternar(a.id)}
                aria-label={a.nome}
              />
              <span className="min-w-0 flex-1 truncate">{a.nome}</span>
              <span className={`font-display text-sm tabular-nums ${a.saldo >= 100 ? 'text-amarelo' : 'text-suave'}`}>
                {formatarMoeda(a.saldo)}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
