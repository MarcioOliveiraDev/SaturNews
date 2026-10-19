import { Titulo } from '../../componentes/Casca';
import { ListaExtrato } from '../../componentes/ListaExtrato';

export function ExtratoAluno() {
  return (
    <>
      <Titulo>Extrato</Titulo>
      <ListaExtrato url="/me/transacoes" />
    </>
  );
}
