/**
 * Esqueleto mostrado enquanto a tela carrega.
 *
 * Sem isto, tocar numa aba deixa o app parado na tela antiga até o servidor
 * responder — e a sensação é de travado, mesmo quando demora meio segundo.
 * Com o esqueleto, o toque responde na hora.
 */
export default function Carregando() {
  const bloco = (altura: number, largura = "100%") => (
    <div
      className="pulsando"
      style={{
        height: altura,
        width: largura,
        borderRadius: "var(--rs)",
        background: "var(--ln2)",
      }}
    />
  );

  return (
    <div
      className="flex flex-col"
      style={{ gap: 16, paddingTop: 22 }}
      aria-busy="true"
      aria-label="Carregando"
    >
      <div className="flex flex-col" style={{ gap: 8 }}>
        {bloco(12, "40%")}
        {bloco(30, "65%")}
      </div>
      {bloco(44)}
      <div style={{ height: 150, borderRadius: "var(--r)", background: "var(--tint)" }} />
      {bloco(52)}
      {bloco(96)}
    </div>
  );
}
