import { type AlunoResumoDTO, espacoDisponivel } from '@saturbank/shared';

/** Prévia do depósito em lote: o que cada aluno recebe respeitando o teto (D5). */
export function previaLote(alunos: AlunoResumoDTO[], selecionados: Set<string>, valor: number) {
  const escolhidos = alunos.filter((a) => selecionados.has(a.id));
  const valido = Number.isInteger(valor) && valor > 0;
  let total = 0;
  const parciais: string[] = [];
  const noTeto: string[] = [];
  if (valido) {
    for (const a of escolhidos) {
      const credito = Math.min(valor, espacoDisponivel(a.saldo));
      total += credito;
      if (credito === 0) noTeto.push(a.nome);
      else if (credito < valor) parciais.push(a.nome);
    }
  }
  return { quantidade: escolhidos.length, total, parciais, noTeto };
}
