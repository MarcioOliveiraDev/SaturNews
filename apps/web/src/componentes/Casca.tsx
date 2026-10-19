import type { UsuarioLogado } from '@saturbank/shared';
import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router';
import { useSair } from '../api/sessao';
import { Fundo } from './Fundo';
import { IconeSair } from './Icones';
import { Logo } from './Satu';

export interface ItemNav {
  para: string;
  rotulo: string;
  icone: ReactNode;
}

/** Layout: barra inferior no celular, barra lateral a partir de 1024px. */
export function Casca({ usuario, nav }: { usuario: UsuarioLogado; nav: ItemNav[] }) {
  const sair = useSair();
  const classeLink = ({ isActive }: { isActive: boolean }) =>
    `flex flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition lg:flex-none lg:flex-row lg:gap-3 lg:px-4 lg:py-3 lg:text-sm ${
      isActive ? 'text-neon lg:bg-neon/10' : 'text-suave hover:text-texto'
    }`;

  return (
    <div className="relative min-h-dvh lg:flex">
      <Fundo />
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:gap-8 lg:border-r lg:border-borda lg:bg-black/40 lg:p-6 lg:backdrop-blur">
        <Logo />
        <nav aria-label="Principal" className="flex flex-col gap-1">
          {nav.map((i) => (
            <NavLink key={i.para} to={i.para} end={i.para === '/'} className={classeLink}>
              {i.icone}
              {i.rotulo}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-borda/60 bg-fundo/70 px-4 py-3 backdrop-blur-lg sm:px-6 lg:justify-end">
          <Logo className="lg:hidden" />
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{usuario.nome}</p>
              <p className="text-xs text-suave">
                {usuario.turma?.nome ?? { PROFESSOR: 'Professor(a)', ADMIN: 'Coordenação', ALUNO: '' }[usuario.papel]}
              </p>
            </div>
            <button
              type="button"
              onClick={() => sair.mutate()}
              className="grid size-11 place-items-center rounded-full border border-borda text-suave hover:text-texto"
              aria-label="Sair"
            >
              <IconeSair width={20} height={20} />
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-28 sm:px-6 lg:pb-12">
          <Outlet />
        </main>

        <nav
          aria-label="Principal"
          className="fixed inset-x-0 bottom-0 z-20 flex gap-1 border-t border-borda bg-black/85 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-lg lg:hidden"
        >
          {nav.map((i) => (
            <NavLink key={i.para} to={i.para} end={i.para === '/'} className={classeLink}>
              {i.icone}
              {i.rotulo}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

export function Titulo({ children, voltar, acao }: { children: ReactNode; voltar?: ReactNode; acao?: ReactNode }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      {voltar}
      <h1 className="titulo-display min-w-0 flex-1 text-2xl sm:text-3xl">{children}</h1>
      {acao}
    </div>
  );
}
