/**
 * Barra de progresso em pílula. Elementos coloridos usam --deep, nunca --ac
 * puro — com acento quase preto no tema escuro o --ac some no fundo.
 */
export function BarraProgresso({
  percentual,
  altura = 8,
  cor = "var(--deep)",
  rotulo,
}: {
  percentual: number;
  altura?: number;
  cor?: string;
  rotulo?: string;
}) {
  const p = Math.max(0, Math.min(100, percentual));

  return (
    <div
      role="progressbar"
      aria-valuenow={p}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={rotulo}
      style={{
        height: altura,
        borderRadius: 999,
        background: "var(--ln2)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${p}%`,
          height: "100%",
          borderRadius: 999,
          background: cor,
          transition: "width 220ms ease-out",
        }}
      />
    </div>
  );
}
