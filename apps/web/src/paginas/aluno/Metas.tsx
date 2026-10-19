import { Link } from 'react-router';
import { AvisoErro, Carregando, Vazio } from '../../componentes/Aviso';
import { CartaoMeta } from '../../componentes/CartaoMeta';
import { Titulo } from '../../componentes/Casca';
import { IconeLampada } from '../../componentes/Icones';
import { useMetasDaTurma } from './consultas';

export function MetasAluno() {
  const metas = useMetasDaTurma();
  return (
    <>
      <Titulo
        acao={
          <Link to="/sugerir" className="botao-fantasma">
            <IconeLampada width={18} height={18} /> Sugerir
          </Link>
        }
      >
        Metas da turma
      </Titulo>
      {metas.isPending ? (
        <Carregando />
      ) : metas.isError ? (
        <AvisoErro erro={metas.error} />
      ) : metas.data.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {metas.data.map((m) => (
            <CartaoMeta key={m.id} meta={m} para={`/metas/${m.id}`} />
          ))}
        </div>
      ) : (
        <Vazio>Sua turma ainda não tem metas. Que tal sugerir uma?</Vazio>
      )}
    </>
  );
}
