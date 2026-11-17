/** A identidade é a mesma em todos os aparelhos; o tema continua livre. */
export function EscolhaAcento() {
  return (
    <div style={{ border: "1px solid var(--ln)", padding: "var(--espaco-cartao)", borderRadius: "var(--r)", display: "grid", gap: 8 }}>
      <h2 style={{ fontSize: 17 }}>Identidade Ameixa</h2>
      <p style={{ color: "var(--mut)", fontSize: 14 }}>
        Paleta vinho, com cores ajustadas para os temas claro e escuro.
      </p>
      <div aria-hidden="true" style={{ display: "flex", gap: 8 }}>
        {["#53142D", "#AA4F72", "#F1E7ED", "#756771"].map((cor) => (
          <span key={cor} style={{ background: cor, width: 32, height: 32, borderRadius: 8, border: "1px solid var(--ln)" }} />
        ))}
      </div>
    </div>
  );
}
