import { type FormEvent, useId, useState } from 'react';
import { useEntrar } from '../api/sessao';
import { AvisoErro } from '../componentes/Aviso';
import { Fundo } from '../componentes/Fundo';
import { Satu } from '../componentes/Satu';

export function Login() {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const entrar = useEntrar();
  const idLogin = useId();
  const idSenha = useId();

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    entrar.mutate({ login, senha });
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-4 py-10">
      <Fundo />
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Satu tamanho={120} className="mx-auto drop-shadow-[0_0_30px_rgba(255,46,154,0.45)]" />
          <h1 className="titulo-display mt-4 text-5xl leading-none">
            <span className="text-rosa">Satur</span>
            <span className="text-neon">Bank</span>
          </h1>
          <p className="mt-3 font-marker text-xl text-neon">Junte $aturCoin$ com a sua turma!</p>
        </div>

        <form onSubmit={enviar} className="cartao granulado space-y-5 p-6 sm:p-8" noValidate>
          <div>
            <label htmlFor={idLogin} className="rotulo">
              Matrícula ou login
            </label>
            <input
              id={idLogin}
              className="campo"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={64}
              required
            />
          </div>
          <div>
            <label htmlFor={idSenha} className="rotulo">
              Senha
            </label>
            <input
              id={idSenha}
              type="password"
              className="campo"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="current-password"
              maxLength={128}
              required
            />
          </div>
          <AvisoErro erro={entrar.error} />
          <button type="submit" className="botao-primario w-full" disabled={entrar.isPending || !login || !senha}>
            {entrar.isPending ? 'Entrando…' : 'Entrar'}
          </button>
          <p className="text-center text-xs text-suave">Esqueceu a senha? Fale com a coordenação da escola.</p>
        </form>
      </div>
    </div>
  );
}
