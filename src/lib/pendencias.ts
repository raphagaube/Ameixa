/** A mesma união é usada na lista, no contador e no aviso do Início. */
export const FILTRO_PENDENCIAS =
  "incompleto.eq.true,and(conta_id.is.null,tipo.in.(despesa,receita))";

type ItemParaRevisar = {
  tipo: string;
  conta_id: string | null;
  incompleto: boolean;
  valor: number;
};

export function resumirPendencias(linhas: readonly ItemParaRevisar[]) {
  let quantidade = 0;
  let quantidadeSemConta = 0;
  let valorSemConta = 0;
  for (const l of linhas) {
    const semConta = !l.conta_id && (l.tipo === "despesa" || l.tipo === "receita");
    if (l.incompleto || semConta) quantidade++;
    if (semConta) {
      quantidadeSemConta++;
      // Volume dos lançamentos: entradas e saídas não se anulam neste aviso.
      // Esta soma é informativa e não modifica nenhum saldo ou relatório.
      valorSemConta += l.valor;
    }
  }
  return {
    quantidade,
    semConta: { quantidade: quantidadeSemConta, valor: Math.round(valorSemConta * 100) / 100 },
  };
}
