import type { TurmaDTO } from '@saturbank/shared';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api } from '../../api/cliente';
import { AvisoErro, Carregando, Vazio } from '../../componentes/Aviso';
import { Titulo } from '../../componentes/Casca';
import { IconeAlvo, IconeUsuarios } from '../../componentes/Icones';

export const useTurmas = () => useQuery({ queryKey: ['turmas'], queryFn: () => api.get<TurmaDTO[]>('/turmas') });

export function Turmas() {
  const turmas = useTurmas();
  return (
    <>
      <Titulo>Minhas turmas</Titulo>
      {turmas.isPending ? (
        <Carregando />
      ) : turmas.isError ? (
        <AvisoErro erro={turmas.error} />
      ) : turmas.data.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {turmas.data.map((t, i) => (
            <Link key={t.id} to={`/turmas/${t.id}`} className="cartao granulado group p-6 transition hover:border-neon/60">
              <div className={`bolha -top-14 -right-14 size-40 opacity-60 transition group-hover:opacity-90 ${i % 2 ? 'bolha-verde' : ''}`} />
              <p className="titulo-display relative text-4xl text-neon">{t.nome}</p>
              <div className="relative mt-6 flex gap-5 text-sm text-suave">
                <span className="flex items-center gap-1.5"><IconeUsuarios width={18} height={18} /> {t.totalAlunos} alunos</span>
                <span className="flex items-center gap-1.5"><IconeAlvo width={18} height={18} /> {t.metasAbertas} metas abertas</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <Vazio>Você ainda não está vinculado a nenhuma turma. Fale com a coordenação.</Vazio>
      )}
    </>
  );
}
