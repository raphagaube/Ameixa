/**
 * Entrega do PDF: compartilhar pela bandeja do sistema ou salvar.
 *
 * A montagem do documento fica em pdf-relatorio.ts. Aqui só o que fazer
 * com o arquivo depois de pronto.
 */

/** O aparelho sabe compartilhar arquivo? iPhone e Android modernos sabem. */
export function podeCompartilharArquivo(arquivo: File): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [arquivo] })
  );
}

/** Salva o arquivo quando o aparelho não tem bandeja de compartilhamento. */
export function baixarArquivo(arquivo: File) {
  const url = URL.createObjectURL(arquivo);
  const a = document.createElement("a");
  a.href = url;
  a.download = arquivo.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Nome do arquivo com o período dentro, para não virar "documento (3)". */
export function nomeDoRelatorio(de: string, ate: string): string {
  return `relatorio-ameixa-${de}-a-${ate}.pdf`;
}
