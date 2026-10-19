/** Gera CSV seguro para abrir em planilhas: neutraliza fórmulas (CSV injection). */
export function gerarCsv(cabecalho: string[], linhas: string[][]): string {
  const celula = (bruto: string) => {
    const v = /^[=+\-@\t\r]/.test(bruto) ? `'${bruto}` : bruto;
    return /[",\n\r]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v;
  };
  return [cabecalho, ...linhas].map((l) => l.map(celula).join(',')).join('\r\n') + '\r\n';
}

export function baixarArquivo(nome: string, conteudo: string, tipo = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob(['﻿', conteudo], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}
