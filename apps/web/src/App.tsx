import type { UsuarioLogado } from '@saturbank/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { definirAoExpirar } from './api/cliente';
import { CHAVE_SESSAO, trocarUsuario, useSessao } from './api/sessao';
import { AvisoErro, Carregando } from './componentes/Aviso';
import { Casca, type ItemNav } from './componentes/Casca';
import { IconeAlvo, IconeCasa, IconeEscudo, IconeExtrato, IconeUsuarios } from './componentes/Icones';
import { Admin } from './paginas/admin/Admin';
import { ExtratoAluno } from './paginas/aluno/Extrato';
import { InicioAluno } from './paginas/aluno/Inicio';
import { MetaDetalhe } from './paginas/aluno/MetaDetalhe';
import { MetasAluno } from './paginas/aluno/Metas';
import { Sugerir } from './paginas/aluno/Sugerir';
import { Login } from './paginas/Login';
import { AlunoProfessor } from './paginas/professor/Aluno';
import { NovaMeta } from './paginas/professor/NovaMeta';
import { Turma } from './paginas/professor/Turma';
import { Turmas } from './paginas/professor/Turmas';
import { TrocarSenha } from './paginas/TrocarSenha';

const NAV: Record<UsuarioLogado['papel'], ItemNav[]> = {
  ALUNO: [
    { para: '/', rotulo: 'Início', icone: <IconeCasa /> },
    { para: '/metas', rotulo: 'Metas', icone: <IconeAlvo /> },
    { para: '/extrato', rotulo: 'Extrato', icone: <IconeExtrato /> },
  ],
  PROFESSOR: [{ para: '/', rotulo: 'Turmas', icone: <IconeUsuarios /> }],
  ADMIN: [{ para: '/', rotulo: 'Coordenação', icone: <IconeEscudo /> }],
};

export function App() {
  const qc = useQueryClient();
  const sessao = useSessao();

  useEffect(() => {
    definirAoExpirar(() => {
      // Só age se havia sessão; o 401 da primeira consulta de /me é o estado "deslogado".
      if (qc.getQueryData(CHAVE_SESSAO)) trocarUsuario(qc, null);
    });
    return () => definirAoExpirar(null);
  }, [qc]);

  if (sessao.isPending) return <Carregando texto="Abrindo o SaturBank…" />;
  if (sessao.isError) return <div className="p-6"><AvisoErro erro={sessao.error} /></div>;
  const usuario = sessao.data;
  if (!usuario) return <Login />;
  if (usuario.trocarSenha) return <TrocarSenha />;

  return (
    <Routes>
      <Route element={<Casca usuario={usuario} nav={NAV[usuario.papel]} />}>
        {usuario.papel === 'ALUNO' && (
          <>
            <Route index element={<InicioAluno usuario={usuario} />} />
            <Route path="metas" element={<MetasAluno />} />
            <Route path="metas/:id" element={<MetaDetalhe />} />
            <Route path="extrato" element={<ExtratoAluno />} />
            <Route path="sugerir" element={<Sugerir />} />
          </>
        )}
        {usuario.papel === 'PROFESSOR' && (
          <>
            <Route index element={<Turmas />} />
            <Route path="turmas/:id" element={<Turma />} />
            <Route path="turmas/:id/nova-meta" element={<NovaMeta />} />
            <Route path="alunos/:id" element={<AlunoProfessor />} />
          </>
        )}
        {usuario.papel === 'ADMIN' && <Route index element={<Admin />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
