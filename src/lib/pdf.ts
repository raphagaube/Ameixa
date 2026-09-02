/**
 * Geração do PDF do relatório no próprio aparelho.
 *
 * Roda no navegador de propósito: o relatório já está desenhado na tela, e
 * mandar os dados para um servidor só para redesenhar tudo lá seria pior em
 * tudo — mais lento, mais caro e mais um lugar por onde a informação
 * financeira passa.
 */

/** A4 em milímetros. */
const A4_LARGURA = 210;
const A4_ALTURA = 297;
const MARGEM = 10;

export type ResultadoPdf =
  | { ok: true; arquivo: File }
  | { ok: false; erro: string };

export async function gerarPdf(
  elemento: HTMLElement,
  nomeArquivo: string,
): Promise<ResultadoPdf> {
  try {
    // Carregados sob demanda: são pesados e a maioria das visitas nunca
    // gera PDF nenhum.
    const [{ jsPDF }, html2canvas] = await Promise.all([
      import("jspdf"),
      import("html2canvas-pro").then((m) => m.default),
    ]);

    // O relatório é feito para 430px; num canvas maior o texto sai serrilhado.
    const canvas = await html2canvas(elemento, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

    const larguraUtil = A4_LARGURA - MARGEM * 2;
    const alturaUtil = A4_ALTURA - MARGEM * 2;
    // Quanto do relatório cabe numa página, em pixels do canvas.
    const alturaDaPaginaEmPx = (canvas.width / larguraUtil) * alturaUtil;

    const paginas = Math.max(Math.ceil(canvas.height / alturaDaPaginaEmPx), 1);

    for (let i = 0; i < paginas; i++) {
      if (i > 0) pdf.addPage();

      const inicio = i * alturaDaPaginaEmPx;
      const altura = Math.min(alturaDaPaginaEmPx, canvas.height - inicio);

      // Recorta a fatia desta página em vez de espremer tudo numa folha só.
      const fatia = document.createElement("canvas");
      fatia.width = canvas.width;
      fatia.height = altura;
      const ctx = fatia.getContext("2d");
      if (!ctx) throw new Error("sem contexto de canvas");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, fatia.width, fatia.height);
      ctx.drawImage(canvas, 0, inicio, canvas.width, altura, 0, 0, canvas.width, altura);

      pdf.addImage(
        fatia.toDataURL("image/jpeg", 0.92),
        "JPEG",
        MARGEM,
        MARGEM,
        larguraUtil,
        (altura / canvas.width) * larguraUtil,
      );
    }

    const blob = pdf.output("blob");
    return {
      ok: true,
      arquivo: new File([blob], nomeArquivo, { type: "application/pdf" }),
    };
  } catch {
    return {
      ok: false,
      erro: "Não deu para montar o PDF. Tente usar o botão Imprimir.",
    };
  }
}

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
