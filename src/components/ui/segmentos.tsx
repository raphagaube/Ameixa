"use client";

/**
 * Grupo de botões segmentados (Despesa | Receita, Uma conta | Mais de uma…).
 * O ativo usa --deep e --tint, nunca --ac puro.
 */
export function Segmentos<T extends string>({
  rotulo,
  opcoes,
  valor,
  aoEscolher,
  colunas,
}: {
  rotulo?: string;
  opcoes: readonly { valor: T; texto: string }[];
  valor: T;
  aoEscolher: (v: T) => void;
  colunas?: string;
}) {
  return (
    <div className="flex flex-col" style={{ gap: 6 }}>
      {rotulo ? <span className="rotulo">{rotulo}</span> : null}
      <div
        style={
          colunas
            ? { display: "grid", gridTemplateColumns: colunas, gap: 8 }
            : { display: "flex", gap: 8 }
        }
      >
        {opcoes.map((o) => {
          const ativo = o.valor === valor;
          return (
            <button
              key={o.valor}
              type="button"
              onClick={() => aoEscolher(o.valor)}
              aria-pressed={ativo}
              style={{
                flex: colunas ? undefined : 1,
                height: 44,
                borderRadius: "var(--rs)",
                border: `1px solid ${ativo ? "var(--deep)" : "var(--ln)"}`,
                background: ativo ? "var(--tint)" : "transparent",
                color: ativo ? "var(--deep)" : "var(--color-text)",
                fontSize: 14,
                fontWeight: ativo ? 700 : 500,
              }}
            >
              {o.texto}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Os oito atalhos de cor do handoff, com seletor livre ao lado. */
export function EscolhaCor({
  rotulo = "Cor",
  cor,
  aoEscolher,
  atalhos,
}: {
  rotulo?: string;
  cor: string;
  aoEscolher: (hex: string) => void;
  atalhos: readonly string[];
}) {
  return (
    <div className="flex flex-col" style={{ gap: 6 }}>
      <span className="rotulo">{rotulo}</span>
      <div className="flex items-center" style={{ gap: 10 }}>
        <input
          type="color"
          value={cor}
          onChange={(e) => aoEscolher(e.target.value)}
          aria-label="Escolher cor"
          style={{
            width: 52,
            height: 44,
            minHeight: 44,
            padding: 2,
            border: "1px solid var(--ln)",
            borderRadius: "var(--rs)",
            background: "var(--sf)",
          }}
        />
        <div className="flex flex-wrap" style={{ gap: 6 }}>
          {atalhos.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => aoEscolher(a)}
              aria-label={`Usar a cor ${a}`}
              aria-pressed={cor.toLowerCase() === a.toLowerCase()}
              style={{
                width: 28,
                height: 28,
                minHeight: 28,
                borderRadius: 999,
                background: a,
                border:
                  cor.toLowerCase() === a.toLowerCase()
                    ? "2px solid var(--color-text)"
                    : "1px solid var(--ln)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
